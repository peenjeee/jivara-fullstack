import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { medicationLogs, medicationReminderJobs, medicationSchedules } from "../db/schema";
import {
  MedicationLogCreateDTO,
  MedicationLogListQuery,
  MedicationSnoozeDTO,
} from "../types/medication-log.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";

const parsePagination = (query: MedicationLogListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const getDateRange = (date?: string) => {
  if (!date) return null;

  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
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

  const [log] = await db
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
    .returning();

  if (dto.reminderJobId && dto.status === "confirmed") {
    await db
      .update(medicationReminderJobs)
      .set({ status: "confirmed", updatedAt: new Date() })
      .where(eq(medicationReminderJobs.id, dto.reminderJobId));
  }

  await writeAuditLog({
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

export const listMedicationLogs = async (query: MedicationLogListQuery, user?: AccessUser) => {
  const { page, limit, offset } = parsePagination(query);
  const patientId = query.patientId || query.patient_id;
  const conditions = [];
  const dateRange = getDateRange(query.date);
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

  return {
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

  await writeAuditLog({
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
