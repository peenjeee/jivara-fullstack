import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  foodScans,
  interactionResults,
  medicationSchedules,
  nurses,
  patientNurseAssignments,
  patients,
  users,
} from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";
import { AccessUser, assertCanAccessPatient, ensureOrganizationIdForUser, getAssignedPatientIdsForNurse, getNurseIdForUser, getOrganizationIdForUser, getPatientIdForUser, scopedPatientFilter } from "./access-control.service";
import { writeAuditLogAsync } from "./audit-log.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import {
  PatientCreateDTO,
  PatientListQuery,
  PatientUpdateDTO,
} from "../types/patient.types";
import { getAdherenceStats } from "./adherence.service";
import { invalidateNurseCache } from "./nurse.service";

const PATIENT_CACHE_PREFIX = "patients:v4:";
const PATIENT_CACHE_TTL_MS = Number(process.env.PATIENT_CACHE_TTL_MS || 30_000);

const getPatientListCacheKey = (query: PatientListQuery, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${PATIENT_CACHE_PREFIX}list:${user?.id || "anon"}:${normalizedQuery}`;
};

export const invalidatePatientCache = () => deleteCachedByPrefix(PATIENT_CACHE_PREFIX);

const parsePagination = (query: PatientListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getPatientAdherenceStatus = (adherence: number) => {
  if (adherence < 50) return "Need Special Attention";
  if (adherence < 75) return "Lagging Behind";
  return "On Ideal Schedule";
};

const getPatientFinalStatus = (adherence: number, isMedicationComplete: boolean) => {
  if (isMedicationComplete) return "Complete";
  return getPatientAdherenceStatus(adherence);
};

type PatientListResult = {
  data: Array<{
    id: string;
    organizationId: string | null;
    userId: string;
    fullName: string | null;
    phone: string | null;
    email: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    diagnosis: string | null;
    emergencyContact: string | null;
    assignedNurseId: string | null;
    assignedNurses: Array<{ id: string; name: string | null }>;
    isActive: boolean;
    createdAt: Date | null;
    lastLoginAt: Date | null;
    adherenceRateAll: number | null;
    totalScheduledAll: number;
    isMedicationComplete: boolean;
  }>;
  meta: { page: number; limit: number; total: number };
};

export const listPatients = async (query: PatientListQuery, user?: AccessUser): Promise<PatientListResult> => {
  const cacheKey = getPatientListCacheKey(query, user);
  const cached = getCached(cacheKey);
  if (cached) return cached as PatientListResult;

  const { page, limit, offset } = parsePagination(query);
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(patients.id, user);

  if (!scopedFilter.scope.allowed) {
    const emptyResult = {
      data: [],
      meta: { page, limit, total: 0 },
    };
    setCached(cacheKey, emptyResult, PATIENT_CACHE_TTL_MS);
    return emptyResult;
  }

  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (query.status === "active") {
    conditions.push(eq(patients.isActive, true));
  } else if (query.status === "inactive") {
    conditions.push(eq(patients.isActive, false));
  }

  if (query.search) {
    conditions.push(or(
      ilike(users.fullName, `%${query.search}%`),
      ilike(users.phone, `%${query.search}%`),
      ilike(users.email, `%${query.search}%`),
    ));
  }

  if (query.nurseId) {
    const assignedPatientIds = await getAssignedPatientIdsForNurse(query.nurseId);
    if (assignedPatientIds.length === 0) {
      const emptyResult = {
        data: [],
        meta: { page, limit, total: 0 },
      };
      setCached(cacheKey, emptyResult, PATIENT_CACHE_TTL_MS);
      return emptyResult;
    }
    conditions.push(inArray(patients.id, assignedPatientIds));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const orderByColumn = query.sort === "recentActivity"
    ? sql`COALESCE(${users.lastLoginAt}, ${patients.createdAt})`
    : patients.createdAt;

  const baseSelect = () => db
    .select({
      id: patients.id,
      organizationId: patients.organizationId,
      userId: patients.userId,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      diagnosis: patients.diagnosis,
      emergencyContact: patients.emergencyContact,
      isActive: patients.isActive,
      createdAt: patients.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(where)
    .orderBy(desc(orderByColumn));

  const rows = query.adherenceStatus
    ? await baseSelect()
    : await baseSelect().limit(limit).offset(offset);
  const assignmentRows = rows.length > 0
    ? await db
      .select({
        patientId: patientNurseAssignments.patientId,
        nurseId: patientNurseAssignments.nurseId,
        nurseName: users.fullName,
      })
      .from(patientNurseAssignments)
      .innerJoin(nurses, eq(patientNurseAssignments.nurseId, nurses.id))
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(and(
        eq(patientNurseAssignments.isActive, true),
        inArray(patientNurseAssignments.patientId, rows.map((row) => row.id)),
      ))
    : [];
  const assignmentByPatientId = new Map<string, string>();
  const assignmentsByPatientId = new Map<string, Array<{ id: string; name: string | null }>>();
  for (const assignment of assignmentRows) {
    if (!assignmentByPatientId.has(assignment.patientId)) {
      assignmentByPatientId.set(assignment.patientId, assignment.nurseId);
    }
    const patientNurses = assignmentsByPatientId.get(assignment.patientId) ?? [];
    patientNurses.push({ id: assignment.nurseId, name: assignment.nurseName });
    assignmentsByPatientId.set(assignment.patientId, patientNurses);
  }

  const enrichedRows = await Promise.all(rows.map(async (row) => {
    const adherenceAll = await getAdherenceStats({ patientId: row.id, period: "all" }, user).catch(() => null);

    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId,
      fullName: row.fullName,
      phone: row.phone,
      email: row.email,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      address: row.address,
      diagnosis: row.diagnosis,
      emergencyContact: row.emergencyContact as string | null,
      assignedNurseId: assignmentByPatientId.get(row.id) ?? null,
      assignedNurses: assignmentsByPatientId.get(row.id) ?? [],
      isActive: row.isActive ?? true,
      createdAt: row.createdAt,
      lastLoginAt: row.lastLoginAt,
      adherenceRateAll: adherenceAll?.adherenceRate ?? null,
      totalScheduledAll: adherenceAll?.totalScheduled ?? 0,
    };
  }));

  const allPatientIds = enrichedRows.map((row) => row.id);
  const medicationStateRows = allPatientIds.length > 0
    ? await db
        .select({
          patientId: medicationSchedules.patientId,
          stock: medicationSchedules.stock,
          isActive: medicationSchedules.isActive,
        })
        .from(medicationSchedules)
        .where(inArray(medicationSchedules.patientId, allPatientIds))
    : [];
  const schedulesByPatientId = new Map<string, Array<{ stock: number | null; isActive: boolean | null }>>();
  for (const schedule of medicationStateRows) {
    const patientSchedules = schedulesByPatientId.get(schedule.patientId) ?? [];
    patientSchedules.push({ stock: schedule.stock, isActive: schedule.isActive });
    schedulesByPatientId.set(schedule.patientId, patientSchedules);
  }
  const enrichedRowsWithComplete = enrichedRows.map((row) => {
    const patientSchedules = schedulesByPatientId.get(row.id) ?? [];
    const isMedicationComplete = patientSchedules.length > 0
      && patientSchedules.every((schedule) => schedule.isActive === false || (schedule.stock ?? 0) <= 0);
    return { ...row, isMedicationComplete };
  });

  const computeRowStatus = (row: typeof enrichedRowsWithComplete[number]) => {
    const adherence = row.totalScheduledAll ? Math.round(row.adherenceRateAll ?? 100) : 100;
    return getPatientFinalStatus(adherence, row.isMedicationComplete);
  };

  const rowsWithAdherence = query.adherenceStatus
    ? enrichedRowsWithComplete
      .filter((row) => computeRowStatus(row) === query.adherenceStatus)
      .slice(offset, offset + limit)
    : enrichedRowsWithComplete;

  const total = query.adherenceStatus
    ? enrichedRowsWithComplete.filter((row) => computeRowStatus(row) === query.adherenceStatus).length
    : (await db
      .select({ total: count() })
      .from(patients)
      .innerJoin(users, eq(patients.userId, users.id))
      .where(where))[0]?.total || 0;

  const result = {
    data: rowsWithAdherence,
    meta: {
      page,
      limit,
      total,
    },
  };

  setCached(cacheKey, result, PATIENT_CACHE_TTL_MS);
  return result;
};

export const getPatientById = async (patientId: string, user?: AccessUser) => {
  if (user) await assertCanAccessPatient(user, patientId);

  const row = await db
    .select({
      id: patients.id,
      organizationId: patients.organizationId,
      userId: patients.userId,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      diagnosis: patients.diagnosis,
      emergencyContact: patients.emergencyContact,
      isActive: patients.isActive,
      registeredAt: patients.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(patients.id, patientId))
    .limit(1);

  if (row.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }

  const [assignment, activeMedications, medicationStateRows, foodScanCount, interactionWarningCount, adherenceAll] = await Promise.all([
    db
      .select({
        nurseId: patientNurseAssignments.nurseId,
        nurseName: users.fullName,
      })
      .from(patientNurseAssignments)
      .innerJoin(nurses, eq(patientNurseAssignments.nurseId, nurses.id))
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(and(
        eq(patientNurseAssignments.patientId, patientId),
        eq(patientNurseAssignments.isActive, true),
      ))
      .orderBy(desc(patientNurseAssignments.assignedAt)),
    db
      .select({
        id: medicationSchedules.id,
        drugName: medicationSchedules.drugName,
        dosage: medicationSchedules.dosage,
        medicineForm: medicationSchedules.medicineForm,
        mealRule: medicationSchedules.mealRule,
        stock: medicationSchedules.stock,
        frequency: medicationSchedules.frequency,
        scheduledTimes: medicationSchedules.scheduledTimes,
        instructions: medicationSchedules.instructions,
        startDate: medicationSchedules.startDate,
        endDate: medicationSchedules.endDate,
        createdAt: medicationSchedules.createdAt,
      })
      .from(medicationSchedules)
      .where(and(
        eq(medicationSchedules.patientId, patientId),
        eq(medicationSchedules.isActive, true),
      ))
      .orderBy(desc(medicationSchedules.createdAt)),
    db
      .select({
        stock: medicationSchedules.stock,
        isActive: medicationSchedules.isActive,
      })
      .from(medicationSchedules)
      .where(eq(medicationSchedules.patientId, patientId)),
    db
      .select({ total: count() })
      .from(foodScans)
      .where(eq(foodScans.patientId, patientId)),
    db
      .select({ total: count() })
      .from(interactionResults)
      .innerJoin(foodScans, eq(interactionResults.scanId, foodScans.id))
      .where(eq(foodScans.patientId, patientId)),
    getAdherenceStats({ patientId, period: "all" }),
  ]);

  const assignedNurse = assignment[0]
    ? { id: assignment[0].nurseId, name: assignment[0].nurseName }
    : null;
  const assignedNurses = assignment.map((item) => ({ id: item.nurseId, name: item.nurseName }));

  const isMedicationComplete = medicationStateRows.length > 0
    && medicationStateRows.every((medication) => medication.isActive === false || (medication.stock ?? 0) <= 0);

  return {
    ...row[0],
    assignedNurseId: assignedNurse?.id || null,
    assignedNurse,
    assignedNurses,
    activeMedications,
    activeMedicationsCount: activeMedications.length,
    isMedicationComplete,
    adherenceRateAll: adherenceAll?.adherenceRate ?? null,
    totalScheduledAll: adherenceAll?.totalScheduled ?? 0,
    totalFoodScans: foodScanCount[0]?.total || 0,
    totalInteractionWarnings: interactionWarningCount[0]?.total || 0,
  };
};

export const getCurrentPatient = async (user?: AccessUser) => {
  if (!user) {
    throw { status: 401, message: "Autentikasi diperlukan", code: "MISSING_TOKEN" };
  }

  if (user.role !== "patient") {
    throw { status: 403, message: "Endpoint ini hanya untuk pasien", code: "FORBIDDEN" };
  }

  const patientId = await getPatientIdForUser(user.id);
  if (!patientId) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }

  return getPatientById(patientId, user);
};

const getPatientCoreById = async (patientId: string, user?: AccessUser) => {
  if (user) await assertCanAccessPatient(user, patientId);

  const row = await db
    .select({
      id: patients.id,
      organizationId: patients.organizationId,
      userId: patients.userId,
      fullName: users.fullName,
      phone: users.phone,
      email: users.email,
      dateOfBirth: patients.dateOfBirth,
      gender: patients.gender,
      address: patients.address,
      diagnosis: patients.diagnosis,
      emergencyContact: patients.emergencyContact,
      isActive: patients.isActive,
      registeredAt: patients.createdAt,
      assignedNurseId: patientNurseAssignments.nurseId,
      lastLoginAt: users.lastLoginAt,
    })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .leftJoin(patientNurseAssignments, and(
      eq(patientNurseAssignments.patientId, patients.id),
      eq(patientNurseAssignments.isActive, true),
    ))
    .where(eq(patients.id, patientId))
    .limit(1);

  if (row.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }

  return row[0];
};

export const createPatient = async (dto: PatientCreateDTO, createdBy?: string) => {
  const organizationId = createdBy ? await ensureOrganizationIdForUser(createdBy) : null;

  if (!organizationId) {
    throw { status: 403, message: "Pengguna belum terhubung ke organisasi", code: "ORGANIZATION_REQUIRED" };
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, dto.email), eq(users.phone, dto.phone || "")))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  const createdByNurseId = createdBy ? await getNurseIdForUser(createdBy) : null;
  const assignedNurseIds = Array.from(new Set([...(dto.assignedNurseIds ?? []), ...(dto.assignedNurseId ? [dto.assignedNurseId] : []), ...(createdByNurseId ? [createdByNurseId] : [])]));

  if (assignedNurseIds.length > 0) {
    const nurseRows = await db.select({ id: nurses.id }).from(nurses).where(and(inArray(nurses.id, assignedNurseIds), eq(nurses.organizationId, organizationId)));
    if (nurseRows.length !== assignedNurseIds.length) {
      throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
    }
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  return db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        fullName: dto.fullName,
        organizationId,
        email: dto.email,
        phone: dto.phone || null,
        password: hashedPassword,
        role: "patient",
        gender: dto.gender || null,
        address: dto.address || null,
        mustChangePassword: true,
      })
      .returning({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role });

    const [newPatient] = await tx
      .insert(patients)
      .values({
        userId: newUser.id,
        organizationId,
        dateOfBirth: dto.dateOfBirth || null,
        gender: dto.gender || null,
        address: dto.address || null,
        diagnosis: dto.diagnosis || null,
        emergencyContact: dto.emergencyContact || null,
      })
      .returning();

    if (assignedNurseIds.length > 0) {
      await tx.insert(patientNurseAssignments).values(assignedNurseIds.map((nurseId) => ({
        patientId: newPatient.id,
        nurseId,
        assignedBy: createdBy || null,
      })));
    }

    return {
      ...newPatient,
      user: newUser,
      assignedNurseId: assignedNurseIds[0] || null,
      assignedNurses: assignedNurseIds.map((id) => ({ id, name: null })),
    };
  }).then(async (patient) => {
    writeAuditLogAsync({
      userId: createdBy || null,
      action: "patient.created",
      resourceType: "patient",
      resourceId: patient.id,
      changes: { after: { id: patient.id, userId: patient.userId, assignedNurseIds } },
    });

    invalidatePatientCache();
    invalidateNurseCache();
    return patient;
  });
};

export const updatePatient = async (patientId: string, dto: PatientUpdateDTO, user?: AccessUser) => {
  const existing = await getPatientCoreById(patientId, user);

  const userUpdates: Partial<typeof users.$inferInsert> = {};
  if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName;
  if (dto.email !== undefined) userUpdates.email = dto.email;
  if (dto.phone !== undefined) userUpdates.phone = dto.phone;
  if (dto.gender !== undefined) userUpdates.gender = dto.gender;
  if (dto.address !== undefined) userUpdates.address = dto.address;
  if (dto.isActive !== undefined) userUpdates.isActive = dto.isActive;

  const patientUpdates: Partial<typeof patients.$inferInsert> = {};
  if (dto.dateOfBirth !== undefined) patientUpdates.dateOfBirth = dto.dateOfBirth;
  if (dto.gender !== undefined) patientUpdates.gender = dto.gender;
  if (dto.address !== undefined) patientUpdates.address = dto.address;
  if (dto.diagnosis !== undefined) patientUpdates.diagnosis = dto.diagnosis;
  if (dto.emergencyContact !== undefined) patientUpdates.emergencyContact = dto.emergencyContact;
  if (dto.isActive !== undefined) patientUpdates.isActive = dto.isActive;

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdates).length > 0) {
      await tx.update(users).set({ ...userUpdates, updatedAt: new Date() }).where(eq(users.id, existing.userId));
    }

    if (Object.keys(patientUpdates).length > 0) {
      await tx.update(patients).set(patientUpdates).where(eq(patients.id, patientId));
    }
  });

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "patient.updated",
    resourceType: "patient",
    resourceId: patientId,
    changes: { before: existing, requested: dto },
  });

  invalidatePatientCache();
  invalidateNurseCache();
  return getPatientCoreById(patientId, user);
};

export const assignPatient = async (patientId: string, nurseIdOrIds: string | string[], assignedBy?: string) => {
  const assignedByUser = assignedBy ? await db.select({ role: users.role }).from(users).where(eq(users.id, assignedBy)).limit(1) : [];
  const isSuperAdmin = assignedByUser[0]?.role === "super_admin";
  const organizationId = assignedBy ? await getOrganizationIdForUser(assignedBy) : null;
  const patient = await getPatientCoreById(patientId, assignedBy ? { id: assignedBy, email: "", role: isSuperAdmin ? "super_admin" : "admin" } : undefined);
  const nurseIds = Array.from(new Set(Array.isArray(nurseIdOrIds) ? nurseIdOrIds : [nurseIdOrIds]));

  if (!isSuperAdmin && (!organizationId || patient.organizationId !== organizationId)) {
    throw { status: 403, message: "Pasien tidak berada dalam organisasi admin", code: "FORBIDDEN" };
  }

  if (isSuperAdmin && !patient.organizationId) {
    throw { status: 400, message: "Pasien belum terhubung ke organisasi", code: "ORGANIZATION_REQUIRED" };
  }

  const nurseConditions = [inArray(nurses.id, nurseIds)];
  if (isSuperAdmin) {
    nurseConditions.push(eq(nurses.organizationId, patient.organizationId!));
  } else if (organizationId) {
    nurseConditions.push(eq(nurses.organizationId, organizationId));
  }

  const nurseRows = await db.select({ id: nurses.id }).from(nurses).where(and(...nurseConditions));
  if (nurseRows.length !== nurseIds.length) {
    throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(patientNurseAssignments)
      .set({ isActive: false })
      .where(and(
        eq(patientNurseAssignments.patientId, patientId),
        eq(patientNurseAssignments.isActive, true),
      ));

    await tx.insert(patientNurseAssignments).values(nurseIds.map((nurseId) => ({
      patientId,
      nurseId,
      assignedBy: assignedBy || null,
    })));
  });

  writeAuditLogAsync({
    userId: assignedBy || null,
    action: "patient.assigned",
    resourceType: "patient",
    resourceId: patientId,
    changes: { nurseIds },
  });

  invalidatePatientCache();
  invalidateNurseCache();
  return getPatientCoreById(patientId, assignedBy ? { id: assignedBy, email: "", role: isSuperAdmin ? "super_admin" : "admin" } : undefined);
};

export const deactivatePatient = async (patientId: string, user?: AccessUser) => {
  const existing = await getPatientCoreById(patientId, user);

  await db.transaction(async (tx) => {
    await tx.update(patients).set({ isActive: false }).where(eq(patients.id, patientId));
    await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, existing.userId));
  });

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "patient.deactivated",
    resourceType: "patient",
    resourceId: patientId,
    changes: { isActive: { from: existing.isActive, to: false } },
  });

  invalidatePatientCache();
  invalidateNurseCache();
};
