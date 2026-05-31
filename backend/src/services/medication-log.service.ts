import { and, count, desc, eq, gt, gte, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { medicationLogs, medicationReminderJobs, medicationSchedules } from "../db/schema";
import {
  MedicationLogCreateDTO,
  MedicationLogListQuery,
  MedicationSnoozeDTO,
} from "../types/medication-log.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { deleteCachedByPrefix, getCached, setCached } from "./cache.service";
import { writeAuditLogAsync } from "./audit-log.service";
import { invalidatePatientCache } from "./patient.service";
import { invalidateMedicationScheduleCache } from "./medication-schedule.service";
import { getAppDateRangeFromQuery } from "../utils/app-timezone";

const MED_LOG_CACHE_TTL_MS = Number(process.env.MED_LOG_CACHE_TTL_MS || 15_000);
const MED_LOG_CACHE_PREFIX = "med-log:";

const getMedLogListCacheKey = (query: MedicationLogListQuery, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${MED_LOG_CACHE_PREFIX}list:${user?.id || "anon"}:${normalizedQuery}`;
};

const invalidateMedLogCache = () => deleteCachedByPrefix(MED_LOG_CACHE_PREFIX);

type MedLogListResult = {
  data: Array<{
    id: string;
    scheduleId: string;
    patientId: string;
    reminderJobId: string | null;
    drugName: string;
    dosage: string;
    status: string;
    scheduledTime: Date | null;
    confirmedAt: Date | null;
    snoozeCount: number | null;
    createdAt: Date | null;
  }>;
  meta: { page: number; limit: number; total: number };
};

const parsePagination = (query: MedicationLogListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getScheduleById = async (scheduleId: string) => {
  const schedule = await db
    .select()
    .from(medicationSchedules)
    .where(eq(medicationSchedules.id, scheduleId))
    .limit(1);

  if (schedule.length === 0) {
    throw { status: 404, message: "Jadwal obat tidak ditemukan", code: "SCHEDULE_NOT_FOUND" };
  }

  return schedule[0];
};

const getScheduleTimes = (schedule: typeof medicationSchedules.$inferSelect) => Array.isArray(schedule.scheduledTimes)
  ? schedule.scheduledTimes.filter((time): time is string => typeof time === "string")
  : [];

const getDoseDate = (date: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const doseDate = new Date(date);
  doseDate.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return doseDate;
};

const getDoseScheduleForDate = (schedule: typeof medicationSchedules.$inferSelect, date: Date) => getScheduleTimes(schedule)
  .map((time) => getDoseDate(date, time))
  .sort((first, second) => first.getTime() - second.getTime());

const getDayBounds = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const findDoseIndex = (doseDates: readonly Date[], scheduledTime: Date) => doseDates.findIndex((doseDate) => doseDate.getTime() === scheduledTime.getTime());

const assertConfirmationWindow = (doseDates: readonly Date[], doseIndex: number, now = new Date()) => {
  const startsAt = doseDates[doseIndex];
  const nextStartsAt = doseDates[doseIndex + 1];

  if (!startsAt) {
    throw { status: 400, message: "Waktu dosis tidak sesuai jadwal obat", code: "INVALID_DOSE_TIME" };
  }

  if (now < startsAt) {
    throw { status: 400, message: "Konfirmasi belum tersedia untuk jam obat ini", code: "DOSE_NOT_DUE" };
  }

  if (nextStartsAt && now >= nextStartsAt) {
    throw { status: 400, message: "Waktu konfirmasi dosis ini sudah terlewat", code: "DOSE_WINDOW_MISSED" };
  }
};

const getReminderJobById = async (reminderJobId: string) => {
  const job = await db
    .select()
    .from(medicationReminderJobs)
    .where(eq(medicationReminderJobs.id, reminderJobId))
    .limit(1);

  if (job.length === 0) {
    throw { status: 404, message: "Reminder tidak ditemukan", code: "REMINDER_JOB_NOT_FOUND" };
  }

  return job[0];
};

const countSnoozes = async (scheduleId: string, scheduledTime: Date) => {
  const rows = await db
    .select({ total: count() })
    .from(medicationLogs)
    .where(and(
      eq(medicationLogs.scheduleId, scheduleId),
      eq(medicationLogs.scheduledTime, scheduledTime),
      eq(medicationLogs.status, "snoozed"),
    ));

  return rows[0]?.total || 0;
};

export const createMedicationLog = async (dto: MedicationLogCreateDTO, user?: AccessUser) => {
  const schedule = await getScheduleById(dto.scheduleId);
  if (user) await assertCanAccessPatient(user, schedule.patientId);
  const reminderJob = dto.reminderJobId ? await getReminderJobById(dto.reminderJobId) : null;

  if (reminderJob && (reminderJob.scheduleId !== schedule.id || reminderJob.patientId !== schedule.patientId)) {
    throw { status: 400, message: "Reminder tidak sesuai dengan jadwal obat", code: "REMINDER_SCHEDULE_MISMATCH" };
  }

  const scheduledTime = dto.scheduledTime
    ? new Date(dto.scheduledTime)
    : reminderJob
      ? reminderJob.scheduledTime
      : new Date();
  const confirmedAt = dto.status === "confirmed"
    ? new Date(dto.confirmedAt || new Date())
    : dto.confirmedAt
      ? new Date(dto.confirmedAt)
      : null;

  if (dto.status === "confirmed") {
    if (schedule.isActive === false) {
      throw { status: 400, message: "Jadwal obat sudah nonaktif atau selesai", code: "SCHEDULE_INACTIVE" };
    }

    const stock = Number(schedule.stock ?? 0);
    if (stock <= 0) {
      throw { status: 400, message: "Stok obat habis", code: "MEDICATION_OUT_OF_STOCK" };
    }

    const doseDates = getDoseScheduleForDate(schedule, scheduledTime);
    const doseIndex = findDoseIndex(doseDates, scheduledTime);
    if (doseIndex < 0) {
      throw { status: 400, message: "Waktu konfirmasi tidak sesuai jadwal obat", code: "INVALID_DOSE_TIME" };
    }

    assertConfirmationWindow(doseDates, doseIndex, confirmedAt || new Date());
  }

  const { start, end } = getDayBounds(scheduledTime);
  const existingLogs = await db
    .select()
    .from(medicationLogs)
    .where(and(
      eq(medicationLogs.scheduleId, schedule.id),
      gte(medicationLogs.scheduledTime, start),
      lt(medicationLogs.scheduledTime, end),
    ));

  if (dto.status === "confirmed" && existingLogs.some((log) => log.scheduledTime.getTime() === scheduledTime.getTime() && (log.status === "confirmed" || log.status === "missed"))) {
    throw { status: 409, message: "Dosis pada jam ini sudah diproses", code: "DOSE_ALREADY_PROCESSED" };
  }

  const [log] = await db.transaction(async (tx) => {
    if (dto.status === "confirmed") {
      const doseDates = getDoseScheduleForDate(schedule, scheduledTime);
      const missedDoseValues = doseDates
        .filter((doseDate) => doseDate < scheduledTime)
        .filter((doseDate) => !existingLogs.some((existingLog) => existingLog.scheduledTime.getTime() === doseDate.getTime()))
        .map((doseDate) => ({
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          reminderJobId: null,
          scheduledTime: doseDate,
          status: "missed",
          snoozeCount: 0,
        }));

      if (missedDoseValues.length > 0) {
        await tx.insert(medicationLogs).values(missedDoseValues).onConflictDoNothing();
      }
    }

    const [createdLog] = await tx
      .insert(medicationLogs)
      .values({
        scheduleId: schedule.id,
        patientId: schedule.patientId,
        reminderJobId: dto.reminderJobId || null,
        scheduledTime,
        status: dto.status,
        confirmedAt,
        snoozeCount: dto.snoozeCount || 0,
      })
      .onConflictDoNothing()
      .returning();

    if (!createdLog) {
      throw { status: 409, message: "Dosis pada jam ini sudah diproses", code: "DOSE_ALREADY_PROCESSED" };
    }

    if (dto.status === "confirmed") {
      const willCompleteSchedule = Number(schedule.stock ?? 0) <= 1;
      const completedAt = scheduledTime;
      const [updatedSchedule] = await tx
        .update(medicationSchedules)
        .set({
          stock: sql`greatest(${medicationSchedules.stock} - 1, 0)`,
          isActive: sql`${medicationSchedules.stock} > 1`,
          reminderEnabled: sql`${medicationSchedules.stock} > 1`,
          completedAt: willCompleteSchedule ? completedAt : schedule.completedAt,
          updatedAt: new Date(),
        })
        .where(and(
          eq(medicationSchedules.id, schedule.id),
          gt(medicationSchedules.stock, 0),
        ))
        .returning({ id: medicationSchedules.id });

      if (!updatedSchedule) {
        throw { status: 400, message: "Stok obat habis", code: "MEDICATION_OUT_OF_STOCK" };
      }
    }

    return [createdLog];
  });

  invalidateMedLogCache();
  invalidatePatientCache();
  invalidateMedicationScheduleCache();

  if (dto.reminderJobId && dto.status === "confirmed") {
    await db
      .update(medicationReminderJobs)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(medicationReminderJobs.id, dto.reminderJobId));
  }

  writeAuditLogAsync({
    userId: user?.id || null,
    action: `medication_log.${dto.status}`,
    resourceType: "medication_log",
    resourceId: log.id,
    changes: { after: { id: log.id, scheduleId: log.scheduleId, patientId: log.patientId, status: log.status, reminderJobId: log.reminderJobId } },
  });

  return {
    ...log,
    drugName: `${schedule.drugName} ${schedule.dosage}`,
  };
};

export const listMedicationLogs = async (query: MedicationLogListQuery, user?: AccessUser): Promise<MedLogListResult> => {
  const cacheKey = getMedLogListCacheKey(query, user);
  const cached = getCached<MedLogListResult>(cacheKey);
  if (cached) return cached;

  const { page, limit, offset } = parsePagination(query);
  const patientId = query.patientId || query.patient_id;
  const conditions = [];
  const dateRange = getAppDateRangeFromQuery(query);
  const scopedFilter = await scopedPatientFilter(medicationLogs.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (query.status) conditions.push(eq(medicationLogs.status, query.status));
  if (dateRange) {
    conditions.push(gte(medicationLogs.scheduledTime, dateRange.start));
    conditions.push(lt(medicationLogs.scheduledTime, dateRange.end));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: medicationLogs.id,
        scheduleId: medicationLogs.scheduleId,
        patientId: medicationLogs.patientId,
        reminderJobId: medicationLogs.reminderJobId,
        drugName: medicationSchedules.drugName,
        dosage: medicationSchedules.dosage,
        status: medicationLogs.status,
        scheduledTime: medicationLogs.scheduledTime,
        confirmedAt: medicationLogs.confirmedAt,
        snoozeCount: medicationLogs.snoozeCount,
        createdAt: medicationLogs.createdAt,
      })
      .from(medicationLogs)
      .innerJoin(medicationSchedules, eq(medicationLogs.scheduleId, medicationSchedules.id))
      .where(where)
      .orderBy(desc(medicationLogs.scheduledTime))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(medicationLogs)
      .where(where),
  ]);

  const result = {
    data: rows.map((row) => ({
      ...row,
      drugName: `${row.drugName} ${row.dosage}`,
    })),
    meta: {
      page,
      limit,
      total: totalRows[0]?.total || 0,
    },
  };

  setCached(cacheKey, result, MED_LOG_CACHE_TTL_MS);
  return result;
};

export const snoozeMedicationReminder = async (dto: MedicationSnoozeDTO, user?: AccessUser) => {
  const job = await getReminderJobById(dto.reminderJobId);
  const schedule = await getScheduleById(job.scheduleId);
  if (user) await assertCanAccessPatient(user, job.patientId);

  if (!["sent", "urgent", "skipped"].includes(job.status)) {
    throw { status: 400, message: "Reminder tidak bisa ditunda pada status saat ini", code: "INVALID_REMINDER_STATUS" };
  }

  const existingSnoozes = await countSnoozes(job.scheduleId, job.scheduledTime);
  if (existingSnoozes >= 3) {
    throw { status: 400, message: "Batas maksimal snooze sudah tercapai", code: "SNOOZE_LIMIT_REACHED" };
  }

  const nextScheduledTime = new Date(Date.now() + dto.minutes * 60_000);

  const [log, nextJob] = await db.transaction(async (tx) => {
    const [createdLog] = await tx
      .insert(medicationLogs)
      .values({
        scheduleId: job.scheduleId,
        patientId: job.patientId,
        reminderJobId: job.id,
        scheduledTime: job.scheduledTime,
        status: "snoozed",
        snoozeCount: existingSnoozes + 1,
      })
      .returning();

    await tx
      .update(medicationReminderJobs)
      .set({ status: "snoozed", updatedAt: new Date() })
      .where(eq(medicationReminderJobs.id, job.id));

    const [createdJob] = await tx
      .insert(medicationReminderJobs)
      .values({
        scheduleId: job.scheduleId,
        patientId: job.patientId,
        scheduledTime: nextScheduledTime,
        status: "pending",
      })
      .returning();

    return [createdLog, createdJob];
  });

  invalidateMedLogCache();
  invalidatePatientCache();

  writeAuditLogAsync({
    userId: user?.id || null,
    action: "medication_reminder.snoozed",
    resourceType: "medication_reminder_job",
    resourceId: job.id,
    changes: { patientId: job.patientId, scheduleId: job.scheduleId, minutes: dto.minutes, nextReminderJobId: nextJob.id, snoozeCount: existingSnoozes + 1 },
  });

  return {
    log,
    nextReminder: nextJob,
    drugName: `${schedule.drugName} ${schedule.dosage}`,
  };
};
