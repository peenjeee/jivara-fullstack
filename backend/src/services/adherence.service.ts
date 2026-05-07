import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "../db";
import {
  foodScans,
  interactionResults,
  medicationLogs,
  medicationSchedules,
  nurses,
  patientNurseAssignments,
  patients,
  users,
} from "../db/schema";
import { AdherenceQuery } from "../types/adherence.types";
import { AccessUser, assertCanAccessPatient, getNurseIdForUser, getAssignedPatientIdsForNurse } from "./access-control.service";

const getPeriodDays = (period?: string) => {
  if (period === "90d") return 90;
  if (period === "30d") return 30;
  return 7;
};

const getDateKey = (date: Date) => date.toISOString().slice(0, 10);

const getTimeKey = (date: Date) => date.toISOString().slice(11, 16);

const getOccurrenceKey = (scheduleId: string, scheduledTime: Date) =>
  `${scheduleId}|${getDateKey(scheduledTime)}|${getTimeKey(scheduledTime)}`;

const getStartDate = (days: number) => {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return start;
};

const buildDailyBreakdown = (days: number, occurrences: Array<{ scheduledTime: Date; status: string }>) => {
  const start = getStartDate(days);
  const breakdown = new Map<string, { date: string; scheduled: number; confirmed: number; missed: number; snoozed: number }>();

  for (let index = 0; index < days; index += 1) {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    const key = getDateKey(current);
    breakdown.set(key, { date: key, scheduled: 0, confirmed: 0, missed: 0, snoozed: 0 });
  }

  for (const occurrence of occurrences) {
    const key = getDateKey(occurrence.scheduledTime);
    const day = breakdown.get(key);
    if (!day) continue;

    day.scheduled += 1;
    if (occurrence.status === "confirmed") day.confirmed += 1;
    if (occurrence.status === "missed") day.missed += 1;
    if (occurrence.status === "snoozed") day.snoozed += 1;
  }

  return Array.from(breakdown.values());
};

const buildScheduledOccurrences = (
  days: number,
  schedules: Array<{ id: string; createdAt: Date | null; scheduledTimes: unknown }>,
  logs: Array<{ scheduleId: string; scheduledTime: Date; status: string }>,
) => {
  const now = new Date();
  const start = getStartDate(days);
  const logsByOccurrence = new Map<string, string>();

  for (const log of logs) {
    const key = getOccurrenceKey(log.scheduleId, log.scheduledTime);
    const existing = logsByOccurrence.get(key);
    if (!existing || log.status === "confirmed") {
      logsByOccurrence.set(key, log.status);
    }
  }

  const occurrences: Array<{ scheduledTime: Date; status: string }> = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);

    for (const schedule of schedules) {
      const scheduledTimes = Array.isArray(schedule.scheduledTimes) ? schedule.scheduledTimes : [];

      for (const time of scheduledTimes) {
        if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) continue;

        const [hour, minute] = time.split(":").map(Number);
        const scheduledTime = new Date(day);
        scheduledTime.setUTCHours(hour, minute, 0, 0);

        if (schedule.createdAt && scheduledTime < schedule.createdAt) continue;
        if (scheduledTime > now) continue;

        const status = logsByOccurrence.get(getOccurrenceKey(schedule.id, scheduledTime)) || "missed";
        occurrences.push({ scheduledTime, status });
      }
    }
  }

  return occurrences;
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

export const getAdherenceStats = async (query: AdherenceQuery, user?: AccessUser) => {
  const period = query.period || "7d";
  const days = getPeriodDays(period);
  const startDate = getStartDate(days);
  const patientId = query.patientId || query.patient_id;
  const nurseId = user?.role === "nurse"
    ? await getNurseIdForUser(user.id)
    : query.nurseId || query.nurse_id;
  const logConditions = [gte(medicationLogs.scheduledTime, startDate)];
  const scheduleConditions = [eq(medicationSchedules.isActive, true)];

  if (patientId) {
    if (user) await assertCanAccessPatient(user, patientId);
    logConditions.push(eq(medicationLogs.patientId, patientId));
    scheduleConditions.push(eq(medicationSchedules.patientId, patientId));
  } else if (nurseId) {
    const assignedPatientIds = await getAssignedPatientIdsForNurse(nurseId);
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
        trend: "stabil",
        reminderResponseRate: 0,
      };
    }
    logConditions.push(inArray(medicationLogs.patientId, assignedPatientIds));
    scheduleConditions.push(inArray(medicationSchedules.patientId, assignedPatientIds));
  }

  const [schedules, logs] = await Promise.all([
    db
      .select({
        id: medicationSchedules.id,
        createdAt: medicationSchedules.createdAt,
        scheduledTimes: medicationSchedules.scheduledTimes,
      })
      .from(medicationSchedules)
      .where(and(...scheduleConditions)),
    db
      .select({
        scheduleId: medicationLogs.scheduleId,
        patientId: medicationLogs.patientId,
        status: medicationLogs.status,
        scheduledTime: medicationLogs.scheduledTime,
      })
      .from(medicationLogs)
      .where(and(...logConditions)),
  ]);

  const occurrences = buildScheduledOccurrences(days, schedules, logs);

  const totalScheduled = occurrences.length;
  const totalConfirmed = occurrences.filter((occurrence) => occurrence.status === "confirmed").length;
  const totalMissed = occurrences.filter((occurrence) => occurrence.status === "missed").length;
  const totalSnoozed = occurrences.filter((occurrence) => occurrence.status === "snoozed").length;
  const adherenceRate = totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 0;
  const reminderResponseRate = totalScheduled > 0 ? Number((((totalConfirmed + totalSnoozed) / totalScheduled) * 100).toFixed(1)) : 0;
  const dailyBreakdown = buildDailyBreakdown(days, occurrences);
  const midpoint = Math.floor(dailyBreakdown.length / 2);
  const firstHalf = dailyBreakdown.slice(0, midpoint);
  const secondHalf = dailyBreakdown.slice(midpoint);
  const firstConfirmed = firstHalf.reduce((sum, day) => sum + day.confirmed, 0);
  const firstScheduled = firstHalf.reduce((sum, day) => sum + day.scheduled, 0);
  const secondConfirmed = secondHalf.reduce((sum, day) => sum + day.confirmed, 0);
  const secondScheduled = secondHalf.reduce((sum, day) => sum + day.scheduled, 0);
  const firstRate = firstScheduled > 0 ? firstConfirmed / firstScheduled : 0;
  const secondRate = secondScheduled > 0 ? secondConfirmed / secondScheduled : 0;
  const trend = secondRate > firstRate ? "membaik" : secondRate < firstRate ? "menurun" : "stabil";

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

export const getAggregateAdherenceStats = async (query: AdherenceQuery = {}) => {
  const period = query.period || "30d";
  const days = getPeriodDays(period);
  const startDate = getStartDate(days);

  const [activePatientRows, schedules, logs, foodScanRows, interactionRows, nurseRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(patients)
      .where(eq(patients.isActive, true)),
    db
      .select({
        id: medicationSchedules.id,
        patientId: medicationSchedules.patientId,
        createdAt: medicationSchedules.createdAt,
        scheduledTimes: medicationSchedules.scheduledTimes,
      })
      .from(medicationSchedules)
      .where(eq(medicationSchedules.isActive, true)),
    db
      .select({
        scheduleId: medicationLogs.scheduleId,
        patientId: medicationLogs.patientId,
        status: medicationLogs.status,
        scheduledTime: medicationLogs.scheduledTime,
      })
      .from(medicationLogs)
      .where(gte(medicationLogs.scheduledTime, startDate)),
    db
      .select({ total: count() })
      .from(foodScans)
      .where(gte(foodScans.createdAt, startDate)),
    db
      .select({ total: count() })
      .from(interactionResults)
      .where(gte(interactionResults.createdAt, startDate)),
    db
      .select({
        nurseId: nurses.id,
        nurseName: users.fullName,
        patientId: patientNurseAssignments.patientId,
      })
      .from(nurses)
      .innerJoin(users, eq(nurses.userId, users.id))
      .leftJoin(patientNurseAssignments, and(
        eq(patientNurseAssignments.nurseId, nurses.id),
        eq(patientNurseAssignments.isActive, true),
      ))
      .where(eq(nurses.isActive, true))
      .orderBy(desc(nurses.createdAt)),
  ]);

  const occurrences = buildScheduledOccurrences(days, schedules, logs);
  const totalScheduled = occurrences.length;
  const totalConfirmed = occurrences.filter((occurrence) => occurrence.status === "confirmed").length;
  const totalMissed = occurrences.filter((occurrence) => occurrence.status === "missed").length;
  const totalSnoozed = occurrences.filter((occurrence) => occurrence.status === "snoozed").length;
  const averageAdherenceRate = totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 0;
  const reminderResponseRate = totalScheduled > 0 ? Number((((totalConfirmed + totalSnoozed) / totalScheduled) * 100).toFixed(1)) : 0;

  const schedulesByPatient = new Map<string, typeof schedules>();
  const logsByPatient = new Map<string, typeof logs>();

  for (const schedule of schedules) {
    const existing = schedulesByPatient.get(schedule.patientId) || [];
    existing.push(schedule);
    schedulesByPatient.set(schedule.patientId, existing);
  }

  for (const log of logs) {
    const existing = logsByPatient.get(log.patientId) || [];
    existing.push(log);
    logsByPatient.set(log.patientId, existing);
  }

  const nurseMap = new Map<string, { nurseId: string; nurseName: string; patientIds: Set<string> }>();
  for (const row of nurseRows) {
    const nurse = nurseMap.get(row.nurseId) || { nurseId: row.nurseId, nurseName: row.nurseName, patientIds: new Set<string>() };
    if (row.patientId) nurse.patientIds.add(row.patientId);
    nurseMap.set(row.nurseId, nurse);
  }

  const nurseMetrics = Array.from(nurseMap.values()).map((nurse) => {
    const patientIds = Array.from(nurse.patientIds);
    const nurseSchedules = patientIds.flatMap((patientId) => schedulesByPatient.get(patientId) || []);
    const nurseLogs = patientIds.flatMap((patientId) => logsByPatient.get(patientId) || []);
    const nurseOccurrences = buildScheduledOccurrences(days, nurseSchedules, nurseLogs);
    const nurseScheduled = nurseOccurrences.length;
    const nurseConfirmed = nurseOccurrences.filter((occurrence) => occurrence.status === "confirmed").length;

    return {
      nurseId: nurse.nurseId,
      nurseName: nurse.nurseName,
      assignedPatients: patientIds.length,
      averagePatientAdherence: nurseScheduled > 0 ? Number(((nurseConfirmed / nurseScheduled) * 100).toFixed(1)) : 0,
    };
  });

  return {
    period,
    totalActivePatients: activePatientRows[0]?.total || 0,
    averageAdherenceRate,
    totalScheduled,
    totalConfirmed,
    totalMissed,
    totalSnoozed,
    reminderResponseRate,
    totalFoodScans: foodScanRows[0]?.total || 0,
    totalInteractionWarnings: interactionRows[0]?.total || 0,
    nurseMetrics,
  };
};
