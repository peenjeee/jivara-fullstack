import { and, count, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "../db";
import { medicationLogs, medicationSchedules } from "../db/schema";
import {
  MedicationLogCreateDTO,
  MedicationLogListQuery,
} from "../types/medication-log.types";
import { AccessUser, assertCanAccessPatient, scopedPatientFilter } from "./access-control.service";

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

export const createMedicationLog = async (dto: MedicationLogCreateDTO, user?: AccessUser) => {
  const schedule = await getScheduleById(dto.scheduleId);
  if (user) await assertCanAccessPatient(user, schedule.patientId);
  const scheduledTime = dto.scheduledTime ? new Date(dto.scheduledTime) : new Date();
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
      scheduledTime,
      status: dto.status,
      confirmedAt,
      snoozeCount: dto.snoozeCount || 0,
    })
    .returning();

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
