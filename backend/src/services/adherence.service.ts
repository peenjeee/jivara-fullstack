import { and, count, desc, eq, gte, inArray, isNotNull, or } from "drizzle-orm";
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
import { getOrSetCached } from "./cache.service";
import { addAppDays, getAppDateKey, getAppDateStartUtc, getTodayAppDateStartUtc } from "../utils/app-timezone";
import { AccessUser, assertCanAccessPatient, getNurseIdForUser, getAssignedPatientIdsForNurse, getOrganizationIdForUser, patientScopeCondition } from "./access-control.service";

const getPeriodDays = (period?: string) => {
  if (period === "all") return null;
  if (period === "1y") return 365;
  if (period === "90d") return 90;
  if (period === "30d") return 30;
  if (period === "14d") return 14;
  return 7;
};

const getDateKey = getAppDateKey;

const isDateKey = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const getScheduleStartDateKey = (schedule: { startDate?: string | null; createdAt: Date | null }) => {
  if (isDateKey(schedule.startDate)) return schedule.startDate;
  return schedule.createdAt ? getDateKey(schedule.createdAt) : null;
};

const getStartDate = (days: number) => {
  return addAppDays(getTodayAppDateStartUtc(), -days + 1);
};

const getAllTimeOccurrenceDays = (
  schedules: Array<{ startDate?: string | null; createdAt: Date | null }>,
  logs: Array<{ scheduledTime: Date }>,
) => {
  const dates = [
    ...schedules.map((schedule) => isDateKey(schedule.startDate) ? getAppDateStartUtc(schedule.startDate) : schedule.createdAt),
    ...logs.map((log) => log.scheduledTime),
  ].filter((date): date is Date => date != null && !Number.isNaN(date.getTime()));

  if (dates.length === 0) return 1;

  const earliestRaw = new Date(Math.min(...dates.map((date) => date.getTime())));
  const earliest = getAppDateStartUtc(getDateKey(earliestRaw)) ?? earliestRaw;
  const today = getTodayAppDateStartUtc();
  const days = Math.floor((today.getTime() - earliest.getTime()) / 86_400_000) + 1;
  return Math.max(days, 1);
};

const buildDailyBreakdown = (days: number, occurrences: Array<{ scheduledTime: Date; status: string }>) => {
  const start = getStartDate(days);
  const breakdown = new Map<string, { date: string; scheduled: number; confirmed: number; missed: number; snoozed: number }>();

  for (let index = 0; index < days; index += 1) {
    const current = addAppDays(start, index);
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

const getScheduleTimes = (scheduledTimes: unknown, frequency?: number | null) => {
  if (Array.isArray(scheduledTimes)) {
    const times = scheduledTimes.filter((time): time is string => typeof time === "string" && /^\d{1,2}:\d{2}$/.test(time));
    if (times.length > 0) return times;
  }

  const count = Math.max(Number.isInteger(frequency) ? Number(frequency) : 1, 1);
  return Array.from({ length: count }, (_, index) => `${String(index).padStart(2, "0")}:00`);
};

const getOccurrenceDateTime = (day: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const safeHours = Number.isFinite(hours) ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  return new Date(day.getTime() + ((safeHours * 60) + safeMinutes) * 60_000);
};

const getScheduleOccurrenceEndDateKey = (schedule: { startDate?: string | null; endDate?: string | null; createdAt: Date | null; completedAt?: Date | null; stock?: number | null; isActive?: boolean | null }, latestLogDate?: Date) => {
  const startDateKey = getScheduleStartDateKey(schedule);
  const latestLogDateKey = latestLogDate ? getDateKey(latestLogDate) : null;
  const configuredEndDateKey = isDateKey(schedule.endDate) ? schedule.endDate : null;
  const shouldUseLatestLogAsEnd = schedule.isActive === false || Number(schedule.stock ?? 1) <= 0;
  if (!startDateKey) {
    const completedDateKey = schedule.completedAt ? getDateKey(schedule.completedAt) : null;
    if (configuredEndDateKey && latestLogDateKey) return configuredEndDateKey < latestLogDateKey ? configuredEndDateKey : latestLogDateKey;
    if (configuredEndDateKey) return configuredEndDateKey;
    if (!completedDateKey && shouldUseLatestLogAsEnd) return latestLogDateKey;
    if (completedDateKey && latestLogDateKey) return completedDateKey < latestLogDateKey ? completedDateKey : latestLogDateKey;
    return completedDateKey || latestLogDateKey;
  }

  const displayStartDate = getAppDateStartUtc(startDateKey);
  if (!displayStartDate) return configuredEndDateKey || latestLogDateKey;
  const displayEndDate = addAppDays(displayStartDate, 30);
  const displayEndDateKey = getDateKey(displayEndDate);
  if (configuredEndDateKey) {
    const boundedEndDateKey = configuredEndDateKey < displayEndDateKey ? configuredEndDateKey : displayEndDateKey;
    if (shouldUseLatestLogAsEnd && latestLogDateKey) return latestLogDateKey < boundedEndDateKey ? latestLogDateKey : boundedEndDateKey;
    return boundedEndDateKey;
  }
  const completedDateKey = schedule.completedAt ? getDateKey(schedule.completedAt) : null;
  if (!completedDateKey && shouldUseLatestLogAsEnd && latestLogDateKey) return latestLogDateKey < displayEndDateKey ? latestLogDateKey : displayEndDateKey;

  const effectiveCompletedDateKey = completedDateKey && latestLogDateKey
    ? (completedDateKey < latestLogDateKey ? completedDateKey : latestLogDateKey)
    : completedDateKey;

  if (!effectiveCompletedDateKey) return displayEndDateKey;
  return effectiveCompletedDateKey < displayEndDateKey ? effectiveCompletedDateKey : displayEndDateKey;
};

const buildScheduledOccurrences = (
  days: number,
  schedules: Array<{ id: string; startDate?: string | null; endDate?: string | null; createdAt: Date | null; completedAt?: Date | null; stock?: number | null; isActive?: boolean | null; scheduledTimes: unknown; frequency?: number | null }>,
  logs: Array<{ scheduleId: string; scheduledTime: Date; status: string }>,
) => {
  const now = new Date();
  const start = getStartDate(days);

  const logsByScheduleDate = new Map<string, { confirmed: number; snoozed: number; missed: number }>();
  const earliestLogDateBySchedule = new Map<string, Date>();
  const latestLogDateBySchedule = new Map<string, Date>();
  for (const log of logs) {
    const key = `${log.scheduleId}|${getDateKey(log.scheduledTime)}`;
    const bucket = logsByScheduleDate.get(key) || { confirmed: 0, snoozed: 0, missed: 0 };
    if (log.status === "confirmed") bucket.confirmed += 1;
    else if (log.status === "snoozed") bucket.snoozed += 1;
    else if (log.status === "missed") bucket.missed += 1;
    logsByScheduleDate.set(key, bucket);

    const earliestLogDate = earliestLogDateBySchedule.get(log.scheduleId);
    if (!earliestLogDate || earliestLogDate > log.scheduledTime) earliestLogDateBySchedule.set(log.scheduleId, log.scheduledTime);
    const latestLogDate = latestLogDateBySchedule.get(log.scheduleId);
    if (!latestLogDate || latestLogDate < log.scheduledTime) latestLogDateBySchedule.set(log.scheduleId, log.scheduledTime);
  }

  const occurrences: Array<{ scheduledTime: Date; status: string }> = [];

  for (let index = 0; index < days; index += 1) {
    const day = addAppDays(start, index);

    for (const schedule of schedules) {
      const configuredStartDateKey = getScheduleStartDateKey(schedule);
      const earliestLogDate = earliestLogDateBySchedule.get(schedule.id);
      const earliestLogDateKey = earliestLogDate ? getDateKey(earliestLogDate) : null;
      const startDateKey = configuredStartDateKey || earliestLogDateKey;
      if (startDateKey && getDateKey(day) < startDateKey) continue;
      const occurrenceEndDateKey = getScheduleOccurrenceEndDateKey(schedule, latestLogDateBySchedule.get(schedule.id));
      if (occurrenceEndDateKey && getDateKey(day) > occurrenceEndDateKey) continue;
      if (day > now) continue;

      for (const time of getScheduleTimes(schedule.scheduledTimes, schedule.frequency)) {
        const scheduledTime = getOccurrenceDateTime(day, time);
        if (!schedule.startDate && schedule.createdAt && scheduledTime < schedule.createdAt) continue;
        if (scheduledTime > now) continue;

        const bucket = logsByScheduleDate.get(`${schedule.id}|${getDateKey(scheduledTime)}`);
        const status = bucket?.confirmed
          ? "confirmed"
          : bucket?.snoozed
            ? "snoozed"
            : bucket?.missed
              ? "missed"
              : "missed";
        if (bucket?.confirmed) bucket.confirmed -= 1;
        else if (bucket?.snoozed) bucket.snoozed -= 1;
        else if (bucket?.missed) bucket.missed -= 1;
        occurrences.push({ scheduledTime, status });
      }
    }
  }

  return occurrences;
};

type AdherenceScheduleRow = {
  id: string;
  patientId?: string | null;
  createdAt: Date | null;
  completedAt?: Date | null;
  startDate?: string | null;
  endDate?: string | null;
  stock?: number | null;
  isActive?: boolean | null;
  scheduledTimes: unknown;
  frequency?: number | null;
};

type AdherenceLogRow = {
  scheduleId: string;
  patientId?: string | null;
  scheduledTime: Date;
  status: string;
};

export type AdherenceStatsSnapshot = {
  adherenceRate: number;
  totalScheduled: number;
  totalConfirmed: number;
  totalMissed: number;
  totalSnoozed: number;
  dailyBreakdown: Array<{ date: string; scheduled: number; confirmed: number; missed: number; snoozed: number }>;
  trend: "membaik" | "menurun" | "stabil";
  reminderResponseRate: number;
};

const buildAdherenceStatsSnapshot = (
  period: string,
  schedules: AdherenceScheduleRow[],
  logs: AdherenceLogRow[],
): AdherenceStatsSnapshot => {
  const periodDays = getPeriodDays(period);
  const adherenceDays = periodDays ?? getAllTimeOccurrenceDays(schedules, logs);
  const occurrences = buildScheduledOccurrences(adherenceDays, schedules, logs);

  const totalScheduled = occurrences.length;
  const totalConfirmed = occurrences.filter((occurrence) => occurrence.status === "confirmed").length;
  const totalMissed = occurrences.filter((occurrence) => occurrence.status === "missed").length;
  const totalSnoozed = occurrences.filter((occurrence) => occurrence.status === "snoozed").length;
  const adherenceRate = totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 100;
  const reminderResponseRate = totalScheduled > 0 ? Number((((totalConfirmed + totalSnoozed) / totalScheduled) * 100).toFixed(1)) : 100;
  const dailyBreakdown = buildDailyBreakdown(adherenceDays, occurrences);
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

export const buildAdherenceStatsByPatientId = (
  patientIds: readonly string[],
  period: string,
  schedules: AdherenceScheduleRow[],
  logs: AdherenceLogRow[],
) => {
  const schedulesByPatientId = new Map<string, AdherenceScheduleRow[]>();
  const logsByPatientId = new Map<string, AdherenceLogRow[]>();

  for (const schedule of schedules) {
    if (!schedule.patientId) continue;
    const patientSchedules = schedulesByPatientId.get(schedule.patientId) ?? [];
    patientSchedules.push(schedule);
    schedulesByPatientId.set(schedule.patientId, patientSchedules);
  }

  for (const log of logs) {
    if (!log.patientId) continue;
    const patientLogs = logsByPatientId.get(log.patientId) ?? [];
    patientLogs.push(log);
    logsByPatientId.set(log.patientId, patientLogs);
  }

  return Array.from(new Set(patientIds)).reduce((statsByPatientId, patientId) => {
    statsByPatientId.set(
      patientId,
      buildAdherenceStatsSnapshot(
        period,
        schedulesByPatientId.get(patientId) ?? [],
        logsByPatientId.get(patientId) ?? [],
      ),
    );
    return statsByPatientId;
  }, new Map<string, AdherenceStatsSnapshot>());
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

const ADHERENCE_CACHE_TTL_MS = Math.max(Number(process.env.ADHERENCE_CACHE_TTL_MS || (process.env.NODE_ENV === "test" ? 0 : 10_000)), 0);
const ADHERENCE_CACHE_PREFIX = "adherence:v1:";

const getAdherenceCacheKey = (scope: string, query: AdherenceQuery, user?: AccessUser) => {
  const normalizedQuery = Object.entries(query)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
  return `${ADHERENCE_CACHE_PREFIX}${scope}:${user?.id || "anon"}:${user?.role || "anon"}:${normalizedQuery}`;
};

const loadAdherenceStats = async (query: AdherenceQuery, user?: AccessUser) => {
  const period = query.period || "7d";
  const periodDays = getPeriodDays(period);
  const startDate = periodDays ? getStartDate(periodDays) : null;
  const patientId = query.patientId || query.patient_id;
  const nurseId = user?.role === "nurse"
    ? await getNurseIdForUser(user.id)
    : query.nurseId || query.nurse_id;
  const logConditions = startDate ? [gte(medicationLogs.scheduledTime, startDate)] : [];
  const scheduleConditions = [or(eq(medicationSchedules.isActive, true), isNotNull(medicationSchedules.completedAt))];

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
        dailyBreakdown: buildDailyBreakdown(periodDays ?? 1, []),
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
        completedAt: medicationSchedules.completedAt,
        startDate: medicationSchedules.startDate,
        endDate: medicationSchedules.endDate,
        stock: medicationSchedules.stock,
        isActive: medicationSchedules.isActive,
        scheduledTimes: medicationSchedules.scheduledTimes,
        frequency: medicationSchedules.frequency,
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
      .where(logConditions.length > 0 ? and(...logConditions) : undefined),
  ]);

  const stats = buildAdherenceStatsSnapshot(period, schedules, logs);

  return {
    patientId: patientId || null,
    patientName: await getPatientName(patientId),
    period,
    ...stats,
  };
};

export const getAdherenceStats = async (query: AdherenceQuery, user?: AccessUser) => (
  getOrSetCached(getAdherenceCacheKey("detail", query, user), ADHERENCE_CACHE_TTL_MS, () => loadAdherenceStats(query, user))
);

const emptyAggregateStats = (period: string) => ({
  period,
  totalActivePatients: 0,
  averageAdherenceRate: 0,
  totalScheduled: 0,
  totalActiveSchedules: 0,
  totalConfirmed: 0,
  totalMissed: 0,
  totalSnoozed: 0,
  reminderResponseRate: 0,
  totalFoodScans: 0,
  totalInteractionWarnings: 0,
  nurseMetrics: [],
});

export const __test__ = {
  buildScheduledOccurrences,
  buildAdherenceStatsSnapshot,
};

const loadAggregateAdherenceStats = async (query: AdherenceQuery = {}, user?: AccessUser) => {
  const period = query.period || "all";
  const days = getPeriodDays(period);
  const startDate = days ? getStartDate(days) : null;
  const scope = await patientScopeCondition(user);

  if (!scope.allowed) return emptyAggregateStats(period);

  const patientConditions = [eq(patients.isActive, true)];
  const scheduleConditions = [or(eq(medicationSchedules.isActive, true), isNotNull(medicationSchedules.completedAt))];
  const logConditions = startDate ? [gte(medicationLogs.scheduledTime, startDate)] : [];
  const foodScanConditions = startDate ? [gte(foodScans.createdAt, startDate)] : [];
  const nurseConditions = [eq(nurses.isActive, true)];

  if (scope.patientIds) {
    if (scope.patientIds.length === 0) return emptyAggregateStats(period);
    patientConditions.push(inArray(patients.id, scope.patientIds));
    scheduleConditions.push(inArray(medicationSchedules.patientId, scope.patientIds));
    logConditions.push(inArray(medicationLogs.patientId, scope.patientIds));
    foodScanConditions.push(inArray(foodScans.patientId, scope.patientIds));
  }

  const organizationId = user?.role === "admin" ? await getOrganizationIdForUser(user.id) : null;
  if (user?.role === "admin" && !organizationId) return emptyAggregateStats(period);
  if (organizationId) nurseConditions.push(eq(nurses.organizationId, organizationId));

  const [activePatientRows, schedules, logs, foodScanRows, interactionRows, nurseRows] = await Promise.all([
    db
      .select({ total: count() })
      .from(patients)
      .where(and(...patientConditions)),
    db
      .select({
        id: medicationSchedules.id,
        patientId: medicationSchedules.patientId,
        createdAt: medicationSchedules.createdAt,
        completedAt: medicationSchedules.completedAt,
        startDate: medicationSchedules.startDate,
        endDate: medicationSchedules.endDate,
        stock: medicationSchedules.stock,
        isActive: medicationSchedules.isActive,
        scheduledTimes: medicationSchedules.scheduledTimes,
        frequency: medicationSchedules.frequency,
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
      .where(logConditions.length > 0 ? and(...logConditions) : undefined),
    db
      .select({ total: count() })
      .from(foodScans)
      .where(foodScanConditions.length > 0 ? and(...foodScanConditions) : undefined),
    db
      .select({ total: count() })
      .from(interactionResults)
      .innerJoin(foodScans, eq(interactionResults.scanId, foodScans.id))
      .where(foodScanConditions.length > 0 ? and(...foodScanConditions) : undefined),
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
      .where(and(...nurseConditions))
      .orderBy(desc(nurses.createdAt)),
  ]);

  const adherenceDays = days ?? getAllTimeOccurrenceDays(schedules, logs);
  const occurrences = buildScheduledOccurrences(adherenceDays, schedules, logs);
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
    const nurseOccurrences = buildScheduledOccurrences(adherenceDays, nurseSchedules, nurseLogs);
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
    totalActiveSchedules: schedules.length,
    totalConfirmed,
    totalMissed,
    totalSnoozed,
    reminderResponseRate,
    totalFoodScans: foodScanRows[0]?.total || 0,
    totalInteractionWarnings: interactionRows[0]?.total || 0,
    nurseMetrics,
  };
};

export const getAggregateAdherenceStats = async (query: AdherenceQuery = {}, user?: AccessUser) => (
  getOrSetCached(getAdherenceCacheKey("aggregate", query, user), ADHERENCE_CACHE_TTL_MS, () => loadAggregateAdherenceStats(query, user))
);
