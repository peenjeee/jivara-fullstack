import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  medicationLogs,
  patientNurseAssignments,
  patients,
  users,
} from "../db/schema";
import { AdherenceQuery } from "../types/adherence.types";

const getPeriodDays = (period?: string) => {
  if (period === "90d") return 90;
  if (period === "30d") return 30;
  return 7;
};

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getStartDate = (days: number) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return start;
};

const buildDailyBreakdown = (days: number, logs: Array<{ scheduledTime: Date; status: string }>) => {
  const start = getStartDate(days);
  const breakdown = new Map<string, { date: string; scheduled: number; confirmed: number; missed: number; snoozed: number }>();

  for (let index = 0; index < days; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const key = getDateKey(current);
    breakdown.set(key, { date: key, scheduled: 0, confirmed: 0, missed: 0, snoozed: 0 });
  }

  for (const log of logs) {
    const key = getDateKey(log.scheduledTime);
    const day = breakdown.get(key);
    if (!day) continue;

    day.scheduled += 1;
    if (log.status === "confirmed") day.confirmed += 1;
    if (log.status === "missed") day.missed += 1;
    if (log.status === "snoozed") day.snoozed += 1;
  }

  return Array.from(breakdown.values());
};

const getAssignedPatientIds = async (nurseId: string) => {
  const assignments = await db
    .select({ patientId: patientNurseAssignments.patientId })
    .from(patientNurseAssignments)
    .where(and(
      eq(patientNurseAssignments.nurseId, nurseId),
      eq(patientNurseAssignments.isActive, true),
    ));

  return assignments.map((assignment) => assignment.patientId);
};

const getPatientName = async (patientId?: string) => {
  if (!patientId) return null;

  const patient = await db
    .select({ fullName: users.fullName })
    .from(patients)
    .innerJoin(users, eq(patients.userId, users.id))
    .where(eq(patients.id, patientId))
    .limit(1);

  return patient[0]?.fullName || null;
};

export const getAdherenceStats = async (query: AdherenceQuery) => {
  const period = query.period || "7d";
  const days = getPeriodDays(period);
  const startDate = getStartDate(days);
  const patientId = query.patientId || query.patient_id;
  const nurseId = query.nurseId || query.nurse_id;
  const conditions = [gte(medicationLogs.scheduledTime, startDate)];

  if (patientId) {
    conditions.push(eq(medicationLogs.patientId, patientId));
  } else if (nurseId) {
    const assignedPatientIds = await getAssignedPatientIds(nurseId);
    if (assignedPatientIds.length === 0) {
      return {
        patientId: null,
        patientName: null,
        period,
        adherenceRate: 0,
        totalScheduled: 0,
        totalConfirmed: 0,
        totalMissed: 0,
        totalSnoozed: 0,
        dailyBreakdown: buildDailyBreakdown(days, []),
        trend: "stable",
        reminderResponseRate: 0,
      };
    }
    conditions.push(inArray(medicationLogs.patientId, assignedPatientIds));
  }

  const logs = await db
    .select({
      patientId: medicationLogs.patientId,
      status: medicationLogs.status,
      scheduledTime: medicationLogs.scheduledTime,
    })
    .from(medicationLogs)
    .where(and(...conditions));

  const totalScheduled = logs.length;
  const totalConfirmed = logs.filter((log) => log.status === "confirmed").length;
  const totalMissed = logs.filter((log) => log.status === "missed").length;
  const totalSnoozed = logs.filter((log) => log.status === "snoozed").length;
  const adherenceRate = totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 0;
  const reminderResponseRate = totalScheduled > 0 ? Number((((totalConfirmed + totalSnoozed) / totalScheduled) * 100).toFixed(1)) : 0;
  const dailyBreakdown = buildDailyBreakdown(days, logs);
  const midpoint = Math.floor(dailyBreakdown.length / 2);
  const firstHalf = dailyBreakdown.slice(0, midpoint);
  const secondHalf = dailyBreakdown.slice(midpoint);
  const firstConfirmed = firstHalf.reduce((sum, day) => sum + day.confirmed, 0);
  const firstScheduled = firstHalf.reduce((sum, day) => sum + day.scheduled, 0);
  const secondConfirmed = secondHalf.reduce((sum, day) => sum + day.confirmed, 0);
  const secondScheduled = secondHalf.reduce((sum, day) => sum + day.scheduled, 0);
  const firstRate = firstScheduled > 0 ? firstConfirmed / firstScheduled : 0;
  const secondRate = secondScheduled > 0 ? secondConfirmed / secondScheduled : 0;
  const trend = secondRate > firstRate ? "improving" : secondRate < firstRate ? "declining" : "stable";

  return {
    patientId: patientId || null,
    patientName: await getPatientName(patientId),
    period,
    adherenceRate,
    totalScheduled,
    totalConfirmed,
    totalMissed,
    totalSnoozed,
    dailyBreakdown,
    trend,
    reminderResponseRate,
  };
};
