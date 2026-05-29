import { and, count, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, patients, prescriptions } from "../db/schema";
import {
  MedicationScheduleCreateDTO,
  MedicationScheduleListQuery,
  MedicationScheduleUpdateDTO,
} from "../types/medication-schedule.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { diffChanges, writeAuditLogAsync } from "./audit-log.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { invalidatePatientCache, listPatients } from "./patient.service";

const CACHE_PREFIX = "medication-schedules:";
const CACHE_TTL_MS = Number(process.env.MEDICATION_SCHEDULE_CACHE_TTL_MS || 30_000);

const getBooleanFilter = (value?: string) => {
  if (value === undefined || value === "all") return undefined;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return undefined;
};

const ensurePatientExists = async (patientId: string) => {
  const patient = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patient.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }
};

const ensurePrescriptionExists = async (prescriptionId: string) => {
  const prescription = await db.select({ id: prescriptions.id }).from(prescriptions).where(eq(prescriptions.id, prescriptionId)).limit(1);
  if (prescription.length === 0) {
    throw { status: 404, message: "Resep tidak ditemukan", code: "PRESCRIPTION_NOT_FOUND" };
  }
};

const getCacheScope = (user?: AccessUser) => `${user?.id || "anonymous"}:${user?.role || "none"}`;

const getListCacheKey = (query: MedicationScheduleListQuery, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");

  return `${CACHE_PREFIX}list:${getCacheScope(user)}:${normalizedQuery}`;
};

const getDetailCacheKey = (id: string, user?: AccessUser) => `${CACHE_PREFIX}detail:${getCacheScope(user)}:${id}`;

export const invalidateMedicationScheduleCache = () => deleteCachedByPrefix(CACHE_PREFIX);

const invalidateScheduleDependentCaches = () => {
  invalidateMedicationScheduleCache();
  invalidatePatientCache();
};

export const getMedicationScheduleSummaryForPatients = async (patientIds: readonly string[]) => {
  if (patientIds.length === 0) return { active: 0, completed: 0, reminders: 0 };

  const [activeRows, completedRows, reminderRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(medicationSchedules)
      .where(and(
              inArray(medicationSchedules.patientId, [...patientIds]),
              eq(medicationSchedules.isActive, true),
              gt(medicationSchedules.stock, 0),
            )),
    db
      .select({ total: count() })
      .from(medicationSchedules)
      .where(and(
        inArray(medicationSchedules.patientId, [...patientIds]),
        lte(medicationSchedules.stock, 0),
      )),
    db
      .select({ total: count() })
      .from(medicationSchedules)
      .where(and(
        inArray(medicationSchedules.patientId, [...patientIds]),
        eq(medicationSchedules.reminderEnabled, true),
        eq(medicationSchedules.isActive, true),
        gt(medicationSchedules.stock, 0),
      )),
  ]);

  return {
    active: activeRows[0]?.total || 0,
    completed: completedRows[0]?.total || 0,
    reminders: reminderRows[0]?.total || 0,
  };
};

export const listMedicationSchedules = async (query: MedicationScheduleListQuery, user?: AccessUser) => {
  const cacheKey = getListCacheKey(query, user);
  const cached = getCached<Array<typeof medicationSchedules.$inferSelect>>(cacheKey);
  if (cached) return cached;

  const patientId = query.patientId || query.patient_id;
  const patientIds = (query.patientIds || query.patient_ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const parsedLimit = Number(query.limit);
  const limit = query.limit && Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100)
    : undefined;
  const activeFilter = getBooleanFilter(query.isActive || query.is_active);
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(medicationSchedules.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return [];
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (activeFilter !== undefined) conditions.push(eq(medicationSchedules.isActive, activeFilter));
  if (!patientId && patientIds.length > 0) conditions.push(inArray(medicationSchedules.patientId, patientIds));

  const baseQuery = db
    .select()
    .from(medicationSchedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(medicationSchedules.createdAt));
  const rows = limit ? await baseQuery.limit(limit) : await baseQuery;

  setCached(cacheKey, rows, CACHE_TTL_MS);
  return rows;
};

export const listMedicationSchedulePatientGroups = async (query: MedicationScheduleListQuery, user?: AccessUser) => {
  const limit = String(Math.min(Math.max(Number(query.limit || 10), 1), 10));
  const patientPage = await listPatients({
    page: query.page,
    limit,
    search: query.search,
    status: query.status || "active",
    adherenceStatus: query.adherenceStatus,
  }, user);

  const patientIds = patientPage.data.map((patient) => patient.id);
  const schedules = patientIds.length > 0
    ? await listMedicationSchedules({ patient_ids: patientIds.join(",") }, user)
    : [];
  const summaryPatientIds = query.search || query.adherenceStatus
    ? (patientPage.meta.total > patientPage.data.length
      ? (await listPatients({
        page: "1",
        limit: String(Math.max(patientPage.meta.total, 1)),
        search: query.search,
        status: query.status || "active",
        adherenceStatus: query.adherenceStatus,
      }, user)).data.map((patient) => patient.id)
      : patientPage.data.map((patient) => patient.id))
    : await (async () => {
      const summaryScopedFilter = await scopedPatientFilter(patients.id, user);
      if (!summaryScopedFilter.scope.allowed) return [];
      const rows = await db
        .select({ id: patients.id })
        .from(patients)
        .where(summaryScopedFilter.condition ?? undefined);
      return rows.map((patient) => patient.id);
    })();
  const summary = await getMedicationScheduleSummaryForPatients(summaryPatientIds);

  return {
    patients: patientPage.data,
    schedules,
    meta: { ...patientPage.meta, summary },
  };
};

export const getMedicationScheduleById = async (id: string, user?: AccessUser) => {
  const cacheKey = getDetailCacheKey(id, user);
  const cached = getCached<typeof medicationSchedules.$inferSelect>(cacheKey);
  if (cached) return cached;

  const schedule = await db.select().from(medicationSchedules).where(eq(medicationSchedules.id, id)).limit(1);

  if (schedule.length === 0) {
    throw { status: 404, message: "Jadwal obat tidak ditemukan", code: "SCHEDULE_NOT_FOUND" };
  }

  if (user) await assertCanAccessPatient(user, schedule[0].patientId);

  setCached(cacheKey, schedule[0], CACHE_TTL_MS);
  return schedule[0];
};

export const createMedicationSchedule = async (dto: MedicationScheduleCreateDTO, createdBy?: string, user?: AccessUser) => {
  await ensurePatientExists(dto.patientId);
  if (user) await assertCanAccessPatient(user, dto.patientId);
  if (dto.prescriptionId) await ensurePrescriptionExists(dto.prescriptionId);

  const stock = dto.stock ?? 0;
  const [schedule] = await db
    .insert(medicationSchedules)
    .values({
      patientId: dto.patientId,
      prescriptionId: dto.prescriptionId || null,
      drugName: dto.drugName,
      dosage: dto.dosage,
      stock,
      frequency: dto.frequency,
      scheduledTimes: dto.scheduledTimes,
      instructions: dto.instructions || null,
      reminderEnabled: dto.reminderEnabled ?? true,
      isActive: dto.isActive ?? true,
      completedAt: stock <= 0 ? new Date() : null,
      createdBy: createdBy || null,
    })
    .returning();

  writeAuditLogAsync({
    userId: createdBy || user?.id || null,
    action: "medication_schedule.created",
    resourceType: "medication_schedule",
    resourceId: schedule.id,
    changes: { after: schedule },
  });

  invalidateScheduleDependentCaches();

  return schedule;
};

export const createMedicationSchedules = async (dtos: MedicationScheduleCreateDTO[], createdBy?: string, user?: AccessUser) => {
  return Promise.all(dtos.map((dto) => createMedicationSchedule(dto, createdBy, user)));
};

export const updateMedicationSchedule = async (id: string, dto: MedicationScheduleUpdateDTO, user?: AccessUser) => {
  const existing = await getMedicationScheduleById(id, user);

  if (dto.prescriptionId) await ensurePrescriptionExists(dto.prescriptionId);

  const updates: Partial<typeof medicationSchedules.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (dto.prescriptionId !== undefined) updates.prescriptionId = dto.prescriptionId;
  if (dto.drugName !== undefined) updates.drugName = dto.drugName;
  if (dto.dosage !== undefined) updates.dosage = dto.dosage;
  if (dto.stock !== undefined) updates.stock = dto.stock;
  if (dto.frequency !== undefined) updates.frequency = dto.frequency;
  if (dto.scheduledTimes !== undefined) updates.scheduledTimes = dto.scheduledTimes;
  if (dto.instructions !== undefined) updates.instructions = dto.instructions;
  if (dto.reminderEnabled !== undefined) updates.reminderEnabled = dto.reminderEnabled;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;

  const nextStock = dto.stock ?? existing.stock ?? 0;
  const nextIsActive = dto.isActive ?? existing.isActive ?? true;
  if (nextStock > 0 && nextIsActive) {
    updates.completedAt = null;
  } else if (nextStock <= 0 && !existing.completedAt) {
    updates.completedAt = new Date();
  }

  const [schedule] = await db
    .update(medicationSchedules)
    .set(updates)
    .where(eq(medicationSchedules.id, id))
    .returning();

  const changes = diffChanges(existing, schedule, ["prescriptionId", "drugName", "dosage", "stock", "frequency", "scheduledTimes", "instructions", "reminderEnabled", "isActive", "completedAt"]);
  if (Object.keys(changes).length > 0) {
    writeAuditLogAsync({
      userId: user?.id || null,
      action: "medication_schedule.updated",
      resourceType: "medication_schedule",
      resourceId: id,
      changes,
    });
  }

  invalidateScheduleDependentCaches();

  return schedule;
};

export const deactivateMedicationSchedule = async (id: string, user?: AccessUser) => {
  const existing = await getMedicationScheduleById(id, user);

  await db
    .update(medicationSchedules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(medicationSchedules.id, id));

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "medication_schedule.deactivated",
    resourceType: "medication_schedule",
    resourceId: id,
    changes: { isActive: { from: existing.isActive, to: false } },
  });

  invalidateScheduleDependentCaches();
};
