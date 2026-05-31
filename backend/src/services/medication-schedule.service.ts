import { and, asc, count, desc, eq, gt, ilike, inArray, lte } from "drizzle-orm";
import { db } from "../db";
import { medicationSchedules, medicineCatalog, patients } from "../db/schema";
import {
  MedicationScheduleCreateDTO,
  MedicationScheduleListQuery,
  MedicationScheduleUpdateDTO,
} from "../types/medication-schedule.types";
import { getAppDateKey } from "../utils/app-timezone";
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

const parsePagination = (query: MedicationScheduleListQuery) => {
  const parsedPage = Number(query.page || 1);
  const parsedLimit = Number(query.limit);
  const page = Math.max(Number.isFinite(parsedPage) ? Math.trunc(parsedPage) : 1, 1);
  const limit = query.limit && Number.isFinite(parsedLimit)
    ? Math.min(Math.max(Math.trunc(parsedLimit), 1), 100)
    : undefined;

  return { page, limit, offset: limit ? (page - 1) * limit : 0 };
};

const ensurePatientExists = async (patientId: string) => {
  const patient = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
  if (patient.length === 0) {
    throw { status: 404, message: "Pasien tidak ditemukan", code: "PATIENT_NOT_FOUND" };
  }
};

const getCacheScope = (user?: AccessUser) => `${user?.id || "anonymous"}:${user?.role || "none"}`;

const isDateString = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getScheduleStartDate = (dtoStartDate: unknown, fallback?: Date | string | null) => {
  if (isDateString(dtoStartDate)) return dtoStartDate;
  if (fallback instanceof Date) return getAppDateKey(fallback);
  if (typeof fallback === "string" && fallback) return fallback.slice(0, 10);
  return getAppDateKey(new Date());
};

const getScheduleEndDate = (dtoEndDate: unknown) => {
  if (dtoEndDate === null || dtoEndDate === "") return null;
  return isDateString(dtoEndDate) ? dtoEndDate : undefined;
};

const normalizeOptionalText = (value: unknown) => {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || null;
};

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

export const listMedicineCatalog = async (query: { search?: string; limit?: string | number }) => {
  const search = String(query.search || "").trim();
  const parsedLimit = Number(query.limit || 333);
  const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? Math.trunc(parsedLimit) : 333, 1), 500);

  return db
    .select({
      id: medicineCatalog.id,
      registrationNumber: medicineCatalog.registrationNumber,
      productName: medicineCatalog.productName,
      compositionNormalized: medicineCatalog.compositionNormalized,
      activeSubstances: medicineCatalog.activeSubstances,
      drugCategories: medicineCatalog.drugCategories,
      dosageFormGroup: medicineCatalog.dosageFormGroup,
    })
    .from(medicineCatalog)
    .where(search ? ilike(medicineCatalog.productName, `%${search}%`) : undefined)
    .orderBy(asc(medicineCatalog.productName))
    .limit(limit);
};

export const listMedicationSchedules = async (query: MedicationScheduleListQuery, user?: AccessUser) => {
  const cacheKey = getListCacheKey(query, user);
  const cached = getCached<{ data: Array<typeof medicationSchedules.$inferSelect>; meta: { page: number; limit: number; total: number } }>(cacheKey);
  if (cached) return cached;

  const patientId = query.patientId || query.patient_id;
  const patientIds = (query.patientIds || query.patient_ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const { page, limit, offset } = parsePagination(query);
  const activeFilter = getBooleanFilter(query.isActive || query.is_active);
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(medicationSchedules.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) return { data: [], meta: { page, limit: limit ?? 0, total: 0 } };
  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (activeFilter !== undefined) conditions.push(eq(medicationSchedules.isActive, activeFilter));
  if (!patientId && patientIds.length > 0) conditions.push(inArray(medicationSchedules.patientId, patientIds));

  const totalRows = await db
    .select({ total: count() })
    .from(medicationSchedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const baseQuery = db
    .select()
    .from(medicationSchedules)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(medicationSchedules.createdAt));
  const rows = limit ? await baseQuery.limit(limit).offset(offset) : await baseQuery;
  const result = { data: rows, meta: { page, limit: limit ?? rows.length, total: totalRows[0]?.total ?? rows.length } };

  setCached(cacheKey, result, CACHE_TTL_MS);
  return result;
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
    ? (await listMedicationSchedules({ patient_ids: patientIds.join(",") }, user)).data
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

  const stock = dto.stock ?? 0;
  const completedAt = stock <= 0 ? new Date() : null;
  const [schedule] = await db
    .insert(medicationSchedules)
    .values({
      patientId: dto.patientId,
      drugName: dto.drugName,
      registrationNumber: normalizeOptionalText(dto.registrationNumber),
      compositionNormalized: normalizeOptionalText(dto.compositionNormalized),
      activeSubstances: normalizeOptionalText(dto.activeSubstances),
      drugCategories: normalizeOptionalText(dto.drugCategories),
      dosage: dto.dosage,
      medicineForm: normalizeOptionalText(dto.medicineForm) ?? "Tablet",
      mealRule: normalizeOptionalText(dto.mealRule) ?? "Tidak tergantung makan",
      stock,
      frequency: dto.frequency,
      scheduledTimes: dto.scheduledTimes,
      instructions: dto.instructions || null,
      reminderEnabled: dto.reminderEnabled ?? true,
      isActive: dto.isActive ?? true,
      completedAt,
      startDate: getScheduleStartDate(dto.startDate),
      endDate: getScheduleEndDate(dto.endDate) ?? (completedAt ? getAppDateKey(completedAt) : null),
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

  const updates: Partial<typeof medicationSchedules.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (dto.drugName !== undefined) updates.drugName = dto.drugName;
  if (dto.registrationNumber !== undefined) updates.registrationNumber = normalizeOptionalText(dto.registrationNumber);
  if (dto.compositionNormalized !== undefined) updates.compositionNormalized = normalizeOptionalText(dto.compositionNormalized);
  if (dto.activeSubstances !== undefined) updates.activeSubstances = normalizeOptionalText(dto.activeSubstances);
  if (dto.drugCategories !== undefined) updates.drugCategories = normalizeOptionalText(dto.drugCategories);
  if (dto.dosage !== undefined) updates.dosage = dto.dosage;
  if (dto.medicineForm !== undefined) updates.medicineForm = normalizeOptionalText(dto.medicineForm);
  if (dto.mealRule !== undefined) updates.mealRule = normalizeOptionalText(dto.mealRule);
  if (dto.stock !== undefined) updates.stock = dto.stock;
  if (dto.frequency !== undefined) updates.frequency = dto.frequency;
  if (dto.scheduledTimes !== undefined) updates.scheduledTimes = dto.scheduledTimes;
  if (dto.instructions !== undefined) updates.instructions = dto.instructions;
  if (dto.reminderEnabled !== undefined) updates.reminderEnabled = dto.reminderEnabled;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;
  if (dto.startDate !== undefined) updates.startDate = getScheduleStartDate(dto.startDate, existing.startDate ?? existing.createdAt);
  if (dto.endDate !== undefined) updates.endDate = getScheduleEndDate(dto.endDate);

  const nextStock = dto.stock ?? existing.stock ?? 0;
  const nextIsActive = dto.isActive ?? existing.isActive ?? true;
  if (nextStock > 0 && nextIsActive) {
    updates.completedAt = null;
  } else if (nextStock <= 0 && !existing.completedAt) {
    const completedAt = new Date();
    updates.completedAt = completedAt;
    if (dto.endDate === undefined) updates.endDate = getAppDateKey(completedAt);
  }

  const [schedule] = await db
    .update(medicationSchedules)
    .set(updates)
    .where(eq(medicationSchedules.id, id))
    .returning();

  const changes = diffChanges(existing, schedule, ["drugName", "registrationNumber", "compositionNormalized", "activeSubstances", "drugCategories", "dosage", "medicineForm", "mealRule", "stock", "frequency", "scheduledTimes", "instructions", "reminderEnabled", "isActive", "completedAt", "startDate", "endDate"]);
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
