import { and, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { medicationReminderJobs, medicationSchedules, patients, users } from "../db/schema";
import { AlertListQuery } from "../types/alert.types";
import { AccessUser, scopedPatientFilter } from "./access-control.service";
import { writeAuditLog } from "./audit-log.service";

const ALERT_STATUSES = ["urgent", "urgent_failed", "missed"];

const parsePagination = (query: AlertListQuery) => {
  const page = Math.max(Number(query.page || 1), 1);
  const limit = Math.min(Math.max(Number(query.limit || 20), 1), 100);
  return { page, limit, offset: (page - 1) * limit };
};

const mapSeverityToStatuses = (severity?: string) => {
  if (severity === "critical") return ["missed"];
  if (severity === "warning") return ["urgent", "urgent_failed"];
  return ALERT_STATUSES;
};

export const listAlerts = async (query: AlertListQuery, user?: AccessUser) => {
  const { page, limit, offset } = parsePagination(query);
  const patientId = query.patientId || query.patient_id;
  const conditions = [];
  const scopedFilter = await scopedPatientFilter(medicationReminderJobs.patientId, user, patientId);

  if (!scopedFilter.scope.allowed) {
    return { data: [], meta: { page, limit, total: 0 } };
  }

  if (scopedFilter.condition) conditions.push(scopedFilter.condition);

  if (query.status) {
    if (!ALERT_STATUSES.includes(query.status)) {
      return { data: [], meta: { page, limit, total: 0 } };
    }
    conditions.push(eq(medicationReminderJobs.status, query.status));
  } else {
    conditions.push(inArray(medicationReminderJobs.status, mapSeverityToStatuses(query.severity)));
  }

  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: medicationReminderJobs.id,
        patientId: medicationReminderJobs.patientId,
        patientName: users.fullName,
        scheduleId: medicationReminderJobs.scheduleId,
        drugName: medicationSchedules.drugName,
        dosage: medicationSchedules.dosage,
        scheduledTime: medicationReminderJobs.scheduledTime,
        status: medicationReminderJobs.status,
        attempts: medicationReminderJobs.attempts,
        lastError: medicationReminderJobs.lastError,
        createdAt: medicationReminderJobs.createdAt,
        updatedAt: medicationReminderJobs.updatedAt,
      })
      .from(medicationReminderJobs)
      .innerJoin(patients, eq(medicationReminderJobs.patientId, patients.id))
      .innerJoin(users, eq(patients.userId, users.id))
      .innerJoin(medicationSchedules, eq(medicationReminderJobs.scheduleId, medicationSchedules.id))
      .where(where)
      .orderBy(desc(medicationReminderJobs.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(medicationReminderJobs)
      .where(where),
  ]);

  return {
    data: rows.map((row) => ({
      ...row,
      severity: row.status === "missed" ? "critical" : "warning",
      message: row.status === "missed"
        ? `${row.patientName} melewatkan ${row.drugName} ${row.dosage}`
        : `${row.patientName} belum mengonfirmasi ${row.drugName} ${row.dosage}`,
    })),
    meta: { page, limit, total: totalRows[0]?.total || 0 },
  };
};

export const resolveAlert = async (alertId: string, user?: AccessUser) => {
  const alert = await db
    .select({ id: medicationReminderJobs.id, patientId: medicationReminderJobs.patientId, status: medicationReminderJobs.status })
    .from(medicationReminderJobs)
    .where(eq(medicationReminderJobs.id, alertId))
    .limit(1);

  if (alert.length === 0) {
    throw { status: 404, message: "Alert tidak ditemukan", code: "ALERT_NOT_FOUND" };
  }

  const scopedFilter = await scopedPatientFilter(medicationReminderJobs.patientId, user, alert[0].patientId);
  if (!scopedFilter.scope.allowed) {
    throw { status: 403, message: "Anda tidak memiliki izin untuk menyelesaikan alert ini", code: "FORBIDDEN" };
  }

  if (!ALERT_STATUSES.includes(alert[0].status)) {
    throw { status: 400, message: "Alert sudah tidak aktif", code: "ALERT_NOT_ACTIVE" };
  }

  const [updated] = await db
    .update(medicationReminderJobs)
    .set({ status: "resolved", updatedAt: new Date() })
    .where(eq(medicationReminderJobs.id, alertId))
    .returning();

  await writeAuditLog({
    userId: user?.id || null,
    action: "alert.resolved",
    resourceType: "medication_reminder_job",
    resourceId: alertId,
    changes: { status: { from: alert[0].status, to: "resolved" } },
  });

  return updated;
};
