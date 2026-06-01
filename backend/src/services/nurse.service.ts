import bcrypt from "bcryptjs";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, nurses, organizations, patientNurseAssignments, patients, userNotificationPreferences, users } from "../db/schema";
import { AUTH_CONSTANTS } from "../types/auth.types";
import { NurseCreateDTO, NurseListQuery, NurseUpdateDTO } from "../types/nurse.types";
import { AccessUser, ensureOrganizationIdForUser, getOrganizationIdForUser } from "./access-control.service";
import { deleteCachedByPrefix, getCached, invalidateAccessScopeCache, invalidateDashboardCache, setCached } from "./cache.service";
import { writeAuditLogAsync } from "./audit-log.service";

const NURSE_CACHE_TTL_MS = Number(process.env.NURSE_CACHE_TTL_MS || 20_000);
const NURSE_CACHE_PREFIX = "nurse:v4:";

const getNurseListCacheKey = (query: NurseListQuery, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${NURSE_CACHE_PREFIX}list:${user?.id || "anon"}:${normalizedQuery}`;
};

const getNurseByIdCacheKey = (nurseId: string, user?: AccessUser) => `${NURSE_CACHE_PREFIX}byId:${user?.id || "anon"}:${user?.role || "anon"}:${nurseId}`;

export const invalidateNurseCache = () => {
  deleteCachedByPrefix(NURSE_CACHE_PREFIX);
  invalidateAccessScopeCache();
  invalidateDashboardCache();
};

type NurseListResult = {
  data: Array<{
    id: string;
    organizationId: string | null;
    userId: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    age: number | null;
    gender: string | null;
    address: string | null;
    employeeId: string | null;
    department: string | null;
    isActive: boolean | null;
    createdAt: Date | null;
    lastLoginAt: Date | null;
    assignedPatients: number;
    handledPatients: number;
  }>;
  meta: { page: number; limit: number; total: number };
};

type NurseDetailResult = {
  id: string;
  organizationId: string | null;
  userId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  address: string | null;
  employeeId: string | null;
  department: string | null;
  isActive: boolean | null;
  userIsActive: boolean | null;
  createdAt: Date | null;
  lastLoginAt: Date | null;
  assignedPatients: number;
  handledPatients: number;
};

const parsePagination = (query: NurseListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getNurseByIdInternal = async (nurseId: string, user?: AccessUser) => {
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;
  const conditions = [eq(nurses.id, nurseId)];
  if (user?.role === "admin" && !organizationId) {
    throw { status: 403, message: "Admin belum terhubung ke organisasi", code: "ORGANIZATION_REQUIRED" };
  }
  if (organizationId) conditions.push(eq(nurses.organizationId, organizationId));

  const rows = await db
    .select({
      id: nurses.id,
      organizationId: nurses.organizationId,
      userId: nurses.userId,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      age: users.age,
      gender: users.gender,
      address: users.address,
      employeeId: nurses.employeeId,
      department: nurses.department,
      isActive: nurses.isActive,
      userIsActive: users.isActive,
      createdAt: nurses.createdAt,
      lastLoginAt: users.lastLoginAt,
    })
    .from(nurses)
    .innerJoin(users, eq(nurses.userId, users.id))
    .where(and(...conditions))
    .limit(1);

  if (rows.length === 0) {
    throw { status: 404, message: "Perawat tidak ditemukan", code: "NURSE_NOT_FOUND" };
  }

  return rows[0];
};

export const listNurses = async (query: NurseListQuery, user?: AccessUser): Promise<NurseListResult> => {
  const cacheKey = getNurseListCacheKey(query, user);
  const cached = getCached<NurseListResult>(cacheKey);
  if (cached) return cached;

  const { page, limit, offset } = parsePagination(query);
  const conditions = [eq(users.role, "nurse")];
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;

  if (user?.role === "admin" && !organizationId) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  if (organizationId) conditions.push(eq(nurses.organizationId, organizationId));

  if (query.status === "active") {
    conditions.push(eq(nurses.isActive, true));
  } else if (query.status === "inactive") {
    conditions.push(eq(nurses.isActive, false));
  }

  if (query.department) conditions.push(eq(nurses.department, query.department));

  if (query.search) {
    const searchCondition = or(
      ilike(users.fullName, `%${query.search}%`),
      ilike(users.email, `%${query.search}%`),
      ilike(users.phone, `%${query.search}%`),
      ilike(nurses.employeeId, `%${query.search}%`),
    );
    if (searchCondition) conditions.push(searchCondition);
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: nurses.id,
        organizationId: nurses.organizationId,
        userId: nurses.userId,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        age: users.age,
        gender: users.gender,
        address: users.address,
        employeeId: nurses.employeeId,
        department: nurses.department,
        isActive: nurses.isActive,
        createdAt: nurses.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(nurses)
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(where)
      .orderBy(desc(nurses.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(nurses)
      .innerJoin(users, eq(nurses.userId, users.id))
      .where(where),
  ]);

  const assignmentConditions = [
    eq(patientNurseAssignments.isActive, true),
    or(...rows.map((row) => eq(patientNurseAssignments.nurseId, row.id))),
  ];
  if (organizationId) assignmentConditions.push(eq(patients.organizationId, organizationId));

  const assignments = rows.length > 0
    ? await db
      .select({ nurseId: patientNurseAssignments.nurseId, patientId: patientNurseAssignments.patientId })
      .from(patientNurseAssignments)
      .innerJoin(patients, eq(patientNurseAssignments.patientId, patients.id))
      .where(and(...assignmentConditions))
    : [];

  const assignmentMap = new Map<string, Set<string>>();
  const assignedPatientIds = [...new Set(assignments.map((assignment) => assignment.patientId))];
  const patientStateRows = assignedPatientIds.length > 0
    ? await db
      .select({ id: patients.id, isActive: patients.isActive })
      .from(patients)
      .where(inArray(patients.id, assignedPatientIds))
    : [];
  const medicationStateRows = assignedPatientIds.length > 0
    ? await db
      .select({
        patientId: medicationSchedules.patientId,
        stock: medicationSchedules.stock,
        isActive: medicationSchedules.isActive,
      })
      .from(medicationSchedules)
      .where(inArray(medicationSchedules.patientId, assignedPatientIds))
    : [];
  const patientActiveById = new Map(patientStateRows.map((patient) => [patient.id, patient.isActive !== false]));
  const schedulesByPatientId = new Map<string, Array<{ stock: number | null; isActive: boolean | null }>>();
  for (const schedule of medicationStateRows) {
    const schedules = schedulesByPatientId.get(schedule.patientId) ?? [];
    schedules.push({ stock: schedule.stock, isActive: schedule.isActive });
    schedulesByPatientId.set(schedule.patientId, schedules);
  }
  const isHandledPatient = (patientId: string) => {
    if (patientActiveById.get(patientId) === false) return false;
    const schedules = schedulesByPatientId.get(patientId) ?? [];
    const isMedicationComplete = schedules.length > 0
      && schedules.every((schedule) => schedule.isActive === false || (schedule.stock ?? 0) <= 0);
    return !isMedicationComplete;
  };

  assignments.forEach((assignment) => {
    const patientIds = assignmentMap.get(assignment.nurseId) ?? new Set<string>();
    patientIds.add(assignment.patientId);
    assignmentMap.set(assignment.nurseId, patientIds);
  });

  const result = {
    data: rows.map((row) => {
      const assignedPatientSet = assignmentMap.get(row.id) ?? new Set<string>();
      return {
        ...row,
        assignedPatients: assignedPatientSet.size,
        handledPatients: [...assignedPatientSet].filter(isHandledPatient).length,
      };
    }),
    meta: { page, limit, total: totalRows[0]?.total || 0 },
  };

  setCached(cacheKey, result, NURSE_CACHE_TTL_MS);
  return result;
};

export const getNurseById = async (nurseId: string, user?: AccessUser): Promise<NurseDetailResult> => {
  const cacheKey = getNurseByIdCacheKey(nurseId, user);
  const cached = getCached<NurseDetailResult>(cacheKey);
  if (cached) return cached;

  const nurse = await getNurseByIdInternal(nurseId, user);
  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;
  const assignmentConditions = [
    eq(patientNurseAssignments.nurseId, nurseId),
    eq(patientNurseAssignments.isActive, true),
  ];
  if (organizationId) assignmentConditions.push(eq(patients.organizationId, organizationId));

  const assignedRows = await db
    .select({ patientId: patientNurseAssignments.patientId, patientIsActive: patients.isActive })
    .from(patientNurseAssignments)
    .innerJoin(patients, eq(patientNurseAssignments.patientId, patients.id))
    .where(and(...assignmentConditions));

  const assignedPatientIds = [...new Set(assignedRows.map((row) => row.patientId))];
  const medicationStateRows = assignedPatientIds.length > 0
    ? await db
      .select({
        patientId: medicationSchedules.patientId,
        stock: medicationSchedules.stock,
        isActive: medicationSchedules.isActive,
      })
      .from(medicationSchedules)
      .where(inArray(medicationSchedules.patientId, assignedPatientIds))
    : [];
  const schedulesByPatientId = new Map<string, Array<{ stock: number | null; isActive: boolean | null }>>();
  for (const schedule of medicationStateRows) {
    const schedules = schedulesByPatientId.get(schedule.patientId) ?? [];
    schedules.push({ stock: schedule.stock, isActive: schedule.isActive });
    schedulesByPatientId.set(schedule.patientId, schedules);
  }
  const patientActiveById = new Map(assignedRows.map((row) => [row.patientId, row.patientIsActive !== false]));
  const handledPatients = assignedPatientIds.filter((patientId) => {
    if (patientActiveById.get(patientId) === false) return false;
    const schedules = schedulesByPatientId.get(patientId) ?? [];
    const isMedicationComplete = schedules.length > 0
      && schedules.every((schedule) => schedule.isActive === false || (schedule.stock ?? 0) <= 0);
    return !isMedicationComplete;
  }).length;

  const result = { ...nurse, assignedPatients: assignedPatientIds.length, handledPatients };
  setCached(cacheKey, result, NURSE_CACHE_TTL_MS);
  return result;
};

export const createNurse = async (dto: NurseCreateDTO, user?: AccessUser) => {
  const organizationId = user?.role === "super_admin"
    ? dto.organizationId || null
    : user?.id
      ? await ensureOrganizationIdForUser(user.id)
      : null;

  if (!organizationId) {
    throw { status: 403, message: "Organisasi wajib diisi untuk membuat akun perawat", code: "ORGANIZATION_REQUIRED" };
  }

  if (user?.role === "super_admin") {
    const organization = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, organizationId)).limit(1);
    if (organization.length === 0) {
      throw { status: 404, message: "Organisasi tidak ditemukan", code: "ORGANIZATION_NOT_FOUND" };
    }
  }

  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.email, dto.email), eq(users.phone, dto.phone || "")))
    .limit(1);

  if (existingUser.length > 0) {
    throw { status: 409, message: "Nomor telepon atau email sudah terdaftar", code: "USER_EXISTS" };
  }

  const hashedPassword = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

  const nurse = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        fullName: dto.fullName,
        organizationId,
        email: dto.email,
        phone: dto.phone || null,
        password: hashedPassword,
        role: "nurse",
        age: dto.age || 0,
        gender: dto.gender || null,
        address: dto.address || null,
        mustChangePassword: true,
      })
      .returning({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role });

    const [newNurse] = await tx
      .insert(nurses)
      .values({
        userId: newUser.id,
        organizationId,
        employeeId: dto.employeeId || null,
        department: dto.department || null,
      })
      .returning();

    await tx.insert(userNotificationPreferences).values({
      userId: newUser.id,
      preferenceKey: "nurse_critical_alert",
      isEnabled: true,
    }).onConflictDoNothing();

    return { ...newNurse, user: newUser };
  });

  invalidateNurseCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "nurse.created",
    resourceType: "nurse",
    resourceId: nurse.id,
    changes: { after: { id: nurse.id, userId: nurse.userId, employeeId: nurse.employeeId, department: nurse.department } },
  });

  return nurse;
};

export const updateNurse = async (nurseId: string, dto: NurseUpdateDTO, user?: AccessUser) => {
  const existing = await getNurseByIdInternal(nurseId, user);

  const userUpdates: Partial<typeof users.$inferInsert> = {};
  if (dto.fullName !== undefined) userUpdates.fullName = dto.fullName;
  if (dto.email !== undefined) userUpdates.email = dto.email;
  if (dto.phone !== undefined) userUpdates.phone = dto.phone;
  if (dto.gender !== undefined) userUpdates.gender = dto.gender;
  if (dto.address !== undefined) userUpdates.address = dto.address;
  if (dto.age !== undefined) userUpdates.age = dto.age;
  if (dto.isActive !== undefined) userUpdates.isActive = dto.isActive;

  const nurseUpdates: Partial<typeof nurses.$inferInsert> = {};
  if (dto.employeeId !== undefined) nurseUpdates.employeeId = dto.employeeId;
  if (dto.department !== undefined) nurseUpdates.department = dto.department;
  if (dto.isActive !== undefined) nurseUpdates.isActive = dto.isActive;

  await db.transaction(async (tx) => {
    if (Object.keys(userUpdates).length > 0) {
      await tx.update(users).set({ ...userUpdates, updatedAt: new Date() }).where(eq(users.id, existing.userId));
    }

    if (Object.keys(nurseUpdates).length > 0) {
      await tx.update(nurses).set(nurseUpdates).where(eq(nurses.id, nurseId));
    }
  });

  invalidateNurseCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "nurse.updated",
    resourceType: "nurse",
    resourceId: nurseId,
    changes: { before: existing, requested: dto },
  });

  return getNurseById(nurseId, user);
};

export const deactivateNurse = async (nurseId: string, user?: AccessUser) => {
  const existing = await getNurseByIdInternal(nurseId, user);

  await db.transaction(async (tx) => {
    await tx.update(nurses).set({ isActive: false }).where(eq(nurses.id, nurseId));
    await tx.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, existing.userId));

    // Nonaktifkan semua penugasan aktif perawat ini
    await tx
      .update(patientNurseAssignments)
      .set({ isActive: false })
      .where(and(
        eq(patientNurseAssignments.nurseId, nurseId),
        eq(patientNurseAssignments.isActive, true),
      ));
    // Catatan: isActive pasien tidak diubah — dicek saat login via patientNurseAssignments
  });

  invalidateNurseCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "nurse.deactivated",
    resourceType: "nurse",
    resourceId: nurseId,
    changes: { isActive: { from: existing.isActive, to: false } },
  });
};
