import api from "@/lib/axios";
import { applyKnownActivityReadState } from "@/lib/activityReadApi";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getScheduleDoseCount, normalizeAdherenceForVisibleSchedules } from "@/helpers/patientSchedule";
import { getApiDateKey, getAppScheduledDateTime } from "@/lib/appTimezone";
import { notifyDashboardDataChanged } from "@/lib/cacheEvents";
import { getFoodScansPageFromApi } from "@/lib/foodScanApi";
import { clearPatientsCache, getCachedCurrentPatientFromApi, getCurrentPatientFromApi } from "@/lib/patientApi";
import { clearSchedulesCache, getSchedulesForPatientsFromApi } from "@/lib/scheduleApi";

export interface MedicationLogResponse {
  id: string;
  scheduleId: string;
  patientId: string;
  drugName: string;
  status: string;
  scheduledTime: string;
  confirmedAt?: string | null;
  createdAt?: string | null;
}

export interface PatientAdherenceDayResponse {
  date: string;
  scheduled: number;
  confirmed: number;
  missed?: number;
  snoozed?: number;
}

export interface PatientAdherenceStatsResponse {
  adherenceRate: number;
  totalScheduled: number;
  totalConfirmed?: number;
  totalMissed?: number;
  totalSnoozed?: number;
  dailyBreakdown: PatientAdherenceDayResponse[];
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

interface AdherenceStatsApiResponse extends PatientAdherenceStatsResponse {
  patientId?: string | null;
  patientName?: string | null;
  period?: string;
  trend?: string;
  reminderResponseRate?: number;
}

export interface PatientDashboardData {
  patient: PatientRecord;
  schedules: MedicationScheduleRecord[];
  medicationLogs: MedicationLogResponse[];
  adherenceStats: PatientAdherenceStatsResponse;
}

export type PatientDashboardOverviewData = Omit<PatientDashboardData, "medicationLogs">;
export type PatientScheduleData = Omit<PatientDashboardData, "adherenceStats">;
export interface PatientActivityLogData {
  patient: PatientRecord;
  schedules: MedicationScheduleRecord[];
  activities: ActivityLogRecord[];
  monthKey: string;
  readStateHydrated?: boolean;
}

type PatientDashboardRequestOptions = {
  readonly forceRefresh?: boolean;
  readonly patient?: PatientRecord | null;
};

let dashboardRequest: Promise<PatientDashboardData> | null = null;
let dashboardOverviewRequest: Promise<PatientDashboardOverviewData> | null = null;
const patientScheduleCache = new Map<string, { data: PatientScheduleData }>();
const patientScheduleRequests = new Map<string, Promise<PatientScheduleData>>();
const patientMedicationLogHistoryCache = new Map<string, MedicationLogResponse[]>();
const patientMedicationLogHistoryRequests = new Map<string, Promise<MedicationLogResponse[]>>();

const activitiesCache = new Map<string, { data: PatientActivityLogData }>();
const activitiesRequests = new Map<string, Promise<PatientActivityLogData>>();

export const clearPatientDashboardCache = () => {
  dashboardRequest = null;
  dashboardOverviewRequest = null;
  patientScheduleCache.clear();
  patientScheduleRequests.clear();
  patientMedicationLogHistoryCache.clear();
  patientMedicationLogHistoryRequests.clear();
  activitiesCache.clear();
  activitiesRequests.clear();
  clearSchedulesCache();
};

const medicationLogMonthPageSize = 100;
const medicationLogHistoryPageSize = 100;
const activityMonthPageSize = 100;

const formatDateParam = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonthLogRange = (monthDate: Date) => {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const startDate = formatDateParam(monthStart);
  const endDate = formatDateParam(monthEnd);

  return {
    startDate,
    endDate,
    cacheKey: `${startDate}:${endDate}`,
  };
};

const patientActivityScheduleLimit = 50;

const getCurrentPatientForDashboard = (options: PatientDashboardRequestOptions = {}) => {
  if (!options.forceRefresh && options.patient) return Promise.resolve(options.patient);

  const cachedPatient = options.forceRefresh ? null : getCachedCurrentPatientFromApi();
  if (cachedPatient) return Promise.resolve(cachedPatient);

  return getCurrentPatientFromApi();
};

const getPatientScheduleBaseData = async (options: PatientDashboardRequestOptions & { readonly scheduleLimit?: number; readonly loadAllSchedulePages?: boolean } = {}) => {
  const patient = await getCurrentPatientForDashboard(options);
  const schedules = await getSchedulesForPatientsFromApi([patient], { ...(options.scheduleLimit ? { limit: options.scheduleLimit } : {}), forceRefresh: options.forceRefresh, loadAllPages: options.loadAllSchedulePages });

  return {
    patient,
    schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
  };
};

const getPatientDashboardBaseData = async (options: PatientDashboardRequestOptions = {}): Promise<PatientDashboardOverviewData> => {
  if (options.forceRefresh) {
    dashboardOverviewRequest = null;
  }
  if (dashboardOverviewRequest) return dashboardOverviewRequest;

  dashboardOverviewRequest = (async () => {
    const patient = await getCurrentPatientForDashboard(options);

    const [schedules, adherenceResponse, medicationLogs] = await Promise.all([
      getSchedulesForPatientsFromApi([patient]),
      api.get<{ data: AdherenceStatsApiResponse }>("/adherence", { params: { patient_id: patient.id, period: "all" } }),
      getMedicationLogsForPatient(patient.id, { forceRefresh: options.forceRefresh }),
    ]);
    const patientSchedules = applyCompletedScheduleEndDates(
      schedules.filter((schedule) => schedule.patientId === patient.id),
      medicationLogs,
    );
    const adherenceStats = normalizeAdherenceForVisibleSchedules(
      mergeAdherenceStatsWithMedicationLogs(adherenceResponse.data.data, patientSchedules, medicationLogs),
      patientSchedules,
    );

    const result = {
      patient: { ...patient, adherence: Math.round(adherenceStats.adherenceRate) },
      schedules: patientSchedules,
      adherenceStats,
    };
    return result;
  })().finally(() => {
    dashboardOverviewRequest = null;
  });

  return dashboardOverviewRequest;
};

export const getPatientDashboardOverviewData = async (options: PatientDashboardRequestOptions = {}): Promise<PatientDashboardOverviewData> => {
  if (options.forceRefresh) {
    dashboardRequest = null;
  }
  return getPatientDashboardBaseData(options);
};

export const getPatientDashboardData = async (options: PatientDashboardRequestOptions = {}): Promise<PatientDashboardData> => {
  if (options.forceRefresh) {
    dashboardRequest = null;
  }
  if (dashboardRequest) return dashboardRequest;

  dashboardRequest = (async () => {
    const patient = await getCurrentPatientForDashboard(options);
    const [baseData, logResponse] = await Promise.all([
      getPatientDashboardBaseData({ ...options, patient }),
      api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patient.id, limit: 10 } }),
    ]);

    const result = {
      ...baseData,
      medicationLogs: logResponse.data.data,
    };
    return result;
  })().finally(() => {
    dashboardRequest = null;
  });

  return dashboardRequest;
};

const getMedicationLogsForMonth = async (patientId: string, monthDate: Date) => {
  const { startDate, endDate } = getMonthLogRange(monthDate);
  return getMedicationLogsForRange(patientId, startDate, endDate);
};

const getMedicationLogsForRange = async (patientId: string, startDate: string, endDate: string) => {
  const params = {
    patient_id: patientId,
    start_date: startDate,
    end_date: endDate,
    limit: medicationLogMonthPageSize,
  };

  const firstResponse = await api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", {
    params: { ...params, page: 1 },
  });
  const firstPage = firstResponse.data.data;
  const total = firstResponse.data.meta?.total ?? firstPage.length;
  const totalPages = Math.ceil(total / medicationLogMonthPageSize);

  if (totalPages <= 1) return firstPage;

  const additionalResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", {
      params: { ...params, page: index + 2 },
    })),
  );

  return [
    ...firstPage,
    ...additionalResponses.flatMap((response) => response.data.data),
  ];
};

const getMedicationLogsForPatient = async (patientId: string, options: { readonly forceRefresh?: boolean } = {}) => {
  if (options.forceRefresh) {
    patientMedicationLogHistoryCache.delete(patientId);
    patientMedicationLogHistoryRequests.delete(patientId);
  }

  const cachedLogs = patientMedicationLogHistoryCache.get(patientId);
  if (cachedLogs) return cachedLogs;

  const activeRequest = patientMedicationLogHistoryRequests.get(patientId);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const params = {
      patient_id: patientId,
      limit: medicationLogHistoryPageSize,
    };

    const firstResponse = await api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", {
      params: { ...params, page: 1 },
    });
    const firstPage = firstResponse.data.data;
    const total = firstResponse.data.meta?.total ?? firstPage.length;
    const totalPages = Math.ceil(total / medicationLogHistoryPageSize);

    if (totalPages <= 1) {
      patientMedicationLogHistoryCache.set(patientId, firstPage);
      return firstPage;
    }

    const additionalResponses = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", {
        params: { ...params, page: index + 2 },
      })),
    );

    const logs = [
      ...firstPage,
      ...additionalResponses.flatMap((response) => response.data.data),
    ];
    patientMedicationLogHistoryCache.set(patientId, logs);
    return logs;
  })().finally(() => {
    patientMedicationLogHistoryRequests.delete(patientId);
  });

  patientMedicationLogHistoryRequests.set(patientId, request);
  return request;
};

const getFoodScansForPatientMonth = async (patientId: string, monthDate: Date) => {
  const { startDate, endDate } = getMonthLogRange(monthDate);
  const date = `${startDate}..${endDate}`;
  const firstPage = await getFoodScansPageFromApi({
    patientId,
    date,
    limit: activityMonthPageSize,
    page: 1,
  });
  const totalPages = Math.ceil(firstPage.meta.total / activityMonthPageSize);

  if (totalPages <= 1) return firstPage.data;

  const additionalPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => getFoodScansPageFromApi({
      patientId,
      date,
      limit: activityMonthPageSize,
      page: index + 2,
    })),
  );

  return [
    ...firstPage.data,
    ...additionalPages.flatMap((page) => page.data),
  ];
};

export const getLatestPatientActivityMonth = async (patientId: string) => {
  const [logResponse, scanPage] = await Promise.all([
    api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patientId, limit: 1, page: 1 } }),
    getFoodScansPageFromApi({ patientId, limit: 5, page: 1 }).catch(() => ({ data: [], meta: { page: 1, limit: 5, total: 0 } })),
  ]);

  const latestLogTime = logResponse.data.data[0]
    ? logResponse.data.data[0].scheduledTime || logResponse.data.data[0].confirmedAt || logResponse.data.data[0].createdAt
    : undefined;
  const latestScanTime = scanPage.data.find((scan) => scan.hasDetectedFood)?.scannedAt;
  const latestTimestamp = [latestLogTime, latestScanTime]
    .filter((timestamp): timestamp is string => Boolean(timestamp && !Number.isNaN(Date.parse(timestamp))))
    .reduce<string | undefined>((latest, timestamp) => (!latest || Date.parse(timestamp) > Date.parse(latest) ? timestamp : latest), undefined);

  if (!latestTimestamp) return null;
  const latestDate = new Date(latestTimestamp);
  return new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
};

const getMedicationLogDateKey = (log: MedicationLogResponse) => getApiDateKey(log.scheduledTime || log.confirmedAt || log.createdAt, "");

const isTrackedMedicationLogStatus = (status: string) => status === "confirmed" || status === "missed" || status === "snoozed";

const isDateWithinScheduleWindow = (dateKey: string, schedule: MedicationScheduleRecord) => {
  if (dateKey < schedule.startDate) return false;
  if (schedule.endDate && dateKey > schedule.endDate) return false;
  return true;
};

const mergeMedicationLogs = (
  primaryLogs: readonly MedicationLogResponse[],
  secondaryLogs: readonly MedicationLogResponse[],
) => {
  const logsById = new Map<string, MedicationLogResponse>();
  [...primaryLogs, ...secondaryLogs].forEach((log) => {
    logsById.set(log.id, log);
  });

  return Array.from(logsById.values()).sort((first, second) => {
    const firstTime = first.scheduledTime || first.confirmedAt || first.createdAt || "";
    const secondTime = second.scheduledTime || second.confirmedAt || second.createdAt || "";
    return secondTime.localeCompare(firstTime);
  });
};

type LogDerivedAdherenceDay = Required<PatientAdherenceDayResponse>;

const buildMedicationLogAdherenceDays = (
  schedules: readonly MedicationScheduleRecord[],
  medicationLogs: readonly MedicationLogResponse[],
) => {
  const schedulesById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const activityByScheduleDate = new Map<string, { date: string; scheduleId: string; confirmed: number; missed: number; snoozed: number }>();

  medicationLogs.forEach((log) => {
    if (!isTrackedMedicationLogStatus(log.status)) return;
    const schedule = schedulesById.get(log.scheduleId);
    if (!schedule) return;

    const dateKey = getMedicationLogDateKey(log);
    if (!dateKey) return;
    if (!isDateWithinScheduleWindow(dateKey, schedule)) return;

    const bucketKey = `${log.scheduleId}:${dateKey}`;
    const bucket = activityByScheduleDate.get(bucketKey) ?? {
      date: dateKey,
      scheduleId: log.scheduleId,
      confirmed: 0,
      missed: 0,
      snoozed: 0,
    };

    activityByScheduleDate.set(bucketKey, {
      ...bucket,
      confirmed: bucket.confirmed + (log.status === "confirmed" ? 1 : 0),
      missed: bucket.missed + (log.status === "missed" ? 1 : 0),
      snoozed: bucket.snoozed + (log.status === "snoozed" ? 1 : 0),
    });
  });

  const daysByDate = new Map<string, LogDerivedAdherenceDay>();
  activityByScheduleDate.forEach((activity) => {
    const schedule = schedulesById.get(activity.scheduleId);
    if (!schedule) return;

    const scheduled = getScheduleDoseCount(schedule);
    const confirmed = Math.min(scheduled, activity.confirmed);
    const remainingAfterConfirmed = Math.max(scheduled - confirmed, 0);
    const snoozed = confirmed >= scheduled ? 0 : Math.min(remainingAfterConfirmed, activity.snoozed);
    const missed = confirmed >= scheduled ? 0 : Math.min(Math.max(remainingAfterConfirmed - snoozed, 0), activity.missed);
    const day = daysByDate.get(activity.date) ?? {
      date: activity.date,
      scheduled: 0,
      confirmed: 0,
      missed: 0,
      snoozed: 0,
    };

    daysByDate.set(activity.date, {
      date: activity.date,
      scheduled: day.scheduled + scheduled,
      confirmed: day.confirmed + confirmed,
      missed: day.missed + missed,
      snoozed: day.snoozed + snoozed,
    });
  });

  return daysByDate;
};

const mergeAdherenceStatsWithMedicationLogs = <T extends PatientAdherenceStatsResponse>(
  adherenceStats: T,
  schedules: readonly MedicationScheduleRecord[],
  medicationLogs: readonly MedicationLogResponse[],
): T => {
  const logDays = buildMedicationLogAdherenceDays(schedules, medicationLogs);
  if (logDays.size === 0) return adherenceStats;

  const dailyBreakdownByDate = new Map<string, LogDerivedAdherenceDay>(
    adherenceStats.dailyBreakdown.map((day) => [day.date, {
      date: day.date,
      scheduled: day.scheduled,
      confirmed: day.confirmed,
      missed: day.missed ?? 0,
      snoozed: day.snoozed ?? 0,
    }]),
  );

  logDays.forEach((logDay, date) => {
    const existingDay = dailyBreakdownByDate.get(date);
    if (!existingDay) {
      dailyBreakdownByDate.set(date, logDay);
      return;
    }

    const scheduled = Math.max(existingDay.scheduled, logDay.scheduled);
    const confirmed = Math.min(scheduled, Math.max(existingDay.confirmed, logDay.confirmed));
    const remainingAfterConfirmed = Math.max(scheduled - confirmed, 0);
    const snoozed = Math.min(remainingAfterConfirmed, Math.max(existingDay.snoozed, logDay.snoozed));
    const missed = Math.min(Math.max(remainingAfterConfirmed - snoozed, 0), Math.max(existingDay.missed, logDay.missed));

    dailyBreakdownByDate.set(date, {
      date,
      scheduled,
      confirmed,
      missed,
      snoozed,
    });
  });

  const dailyBreakdown = Array.from(dailyBreakdownByDate.values())
    .sort((first, second) => first.date.localeCompare(second.date));
  const totalScheduled = dailyBreakdown.reduce((total, day) => total + day.scheduled, 0);
  const totalConfirmed = dailyBreakdown.reduce((total, day) => total + day.confirmed, 0);

  return {
    ...adherenceStats,
    totalScheduled,
    totalConfirmed,
    totalMissed: dailyBreakdown.reduce((total, day) => total + day.missed, 0),
    totalSnoozed: dailyBreakdown.reduce((total, day) => total + day.snoozed, 0),
    adherenceRate: totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 100,
    dailyBreakdown,
  };
};

const applyCompletedScheduleEndDates = (
  schedules: readonly MedicationScheduleRecord[],
  medicationLogs: readonly MedicationLogResponse[],
): MedicationScheduleRecord[] => {
  const schedulesById = new Map(schedules.map((schedule) => [schedule.id, schedule]));
  const latestLogDateBySchedule = medicationLogs.reduce<Record<string, string>>((latestDates, log) => {
    if (!isTrackedMedicationLogStatus(log.status)) return latestDates;
    const schedule = schedulesById.get(log.scheduleId);
    if (!schedule || schedule.status !== "Selesai" || schedule.endDate) return latestDates;

    const dateKey = getMedicationLogDateKey(log);
    if (!dateKey) return latestDates;
    if (dateKey < schedule.startDate) return latestDates;

    const currentDate = latestDates[log.scheduleId];
    if (currentDate && currentDate >= dateKey) return latestDates;

    return {
      ...latestDates,
      [log.scheduleId]: dateKey,
    };
  }, {});

  return schedules.map((schedule) => {
    if (schedule.status !== "Selesai") return schedule;

    const latestLogDate = latestLogDateBySchedule[schedule.id];
    if (schedule.endDate) return schedule;
    if (!latestLogDate) return { ...schedule, endDate: schedule.startDate };

    return {
      ...schedule,
      endDate: latestLogDate,
    };
  });
};

export const getPatientScheduleData = async (monthDate = new Date(), options: PatientDashboardRequestOptions = {}): Promise<PatientScheduleData> => {
  const { cacheKey } = getMonthLogRange(monthDate);
  if (options.forceRefresh) {
    patientScheduleCache.delete(cacheKey);
    patientScheduleRequests.delete(cacheKey);
  }
  const activeRequest = patientScheduleRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const patient = await getCurrentPatientForDashboard(options);
    const [baseData, medicationLogs, medicationHistoryLogs] = await Promise.all([
      getPatientScheduleBaseData({ ...options, patient }),
      getMedicationLogsForMonth(patient.id, monthDate),
      getMedicationLogsForPatient(patient.id, { forceRefresh: options.forceRefresh }),
    ]);

    const result = {
      ...baseData,
      schedules: applyCompletedScheduleEndDates(baseData.schedules, medicationHistoryLogs),
      medicationLogs: mergeMedicationLogs(medicationLogs, medicationHistoryLogs),
    };
    patientScheduleCache.set(cacheKey, { data: result });
    return result;
  })().finally(() => {
    patientScheduleRequests.delete(cacheKey);
  });

  patientScheduleRequests.set(cacheKey, request);
  return request;
};

export const getCachedPatientScheduleData = (monthDate = new Date()): PatientScheduleData | null => {
  return patientScheduleCache.get(getMonthLogRange(monthDate).cacheKey)?.data ?? null;
};

export const getConfirmedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((confirmedDates, log) => {
  if (log.status !== "confirmed") return confirmedDates;

  const dateKey = getMedicationLogDateKey(log);
  if (!dateKey) return confirmedDates;

  return {
    ...confirmedDates,
    [dateKey]: [...(confirmedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getCompletedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((completedDates, log) => {
  if (log.status !== "confirmed" && log.status !== "missed") return completedDates;

  const dateKey = getMedicationLogDateKey(log);
  if (!dateKey) return completedDates;

  return {
    ...completedDates,
    [dateKey]: [...(completedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getPatientActivityLogData = async (monthDate = new Date(), options: PatientDashboardRequestOptions = {}): Promise<PatientActivityLogData> => {
  const { cacheKey } = getMonthLogRange(monthDate);
  if (options.forceRefresh) {
    activitiesCache.delete(cacheKey);
  }
  const activeRequest = activitiesRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const patient = await getCurrentPatientForDashboard(options);
    const [schedules, logResponse, scans] = await Promise.all([
      getSchedulesForPatientsFromApi([patient], { limit: patientActivityScheduleLimit, forceRefresh: options.forceRefresh, loadAllPages: true }),
      getMedicationLogsForMonth(patient.id, monthDate),
      getFoodScansForPatientMonth(patient.id, monthDate).catch(() => []),
    ]);
    const data = {
      patient,
      schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
      medicationLogs: logResponse,
    };

    const medicationActivities: ActivityLogRecord[] = data.medicationLogs.map((log) => ({
      id: log.id,
      title: log.status === "confirmed" ? "Obat dikonfirmasi" : log.status === "missed" ? "Obat terlewat" : "Aktivitas obat",
      description: `${log.drugName} berstatus ${log.status}.`,
      category: "Reminder",
      severity: log.status === "missed" ? "Kritis" : log.status === "snoozed" ? "Peringatan" : "Sukses",
      timestamp: log.confirmedAt || log.createdAt || log.scheduledTime,
      patientId: log.patientId,
      patientName: data.patient.name,
      patientAvatar: data.patient.avatar,
      scheduleId: log.scheduleId,
      medicineName: log.drugName,
      read: false,
    }));

    const scanActivities: ActivityLogRecord[] = scans.flatMap((scan) => (scan.hasDetectedFood ? [{
      id: `food-scan-${scan.id}`,
      title: scan.risk === "High Risk" ? "Scan makanan berisiko" : "Scan makanan selesai",
      description: scan.result,
      category: "Scan Makanan" as const,
      severity: scan.risk === "High Risk" ? "Peringatan" as const : "Sukses" as const,
      timestamp: scan.scannedAt,
      patientId: scan.patientId,
      patientName: data.patient.name,
      patientAvatar: data.patient.avatar,
      scanId: scan.id,
      read: false,
    }] : []));

    const activities = applyKnownActivityReadState([...medicationActivities, ...scanActivities])
      .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
    const result = {
      patient: data.patient,
      schedules: data.schedules,
      activities,
      monthKey: cacheKey,
      readStateHydrated: false,
    };
    activitiesCache.set(cacheKey, { data: result });
    return result;
  })().finally(() => {
    activitiesRequests.delete(cacheKey);
  });

  activitiesRequests.set(cacheKey, request);
  return request;
};

export const getCachedPatientActivityLogData = (monthDate = new Date()): PatientActivityLogData | null => {
  return activitiesCache.get(getMonthLogRange(monthDate).cacheKey)?.data ?? null;
};

const markPatientActivityLogDataRead = (data: PatientActivityLogData, activityIds: readonly string[] = []) => {
  const readIds = new Set(activityIds.filter(Boolean));
  const shouldMarkAll = readIds.size === 0;

  return {
    ...data,
    activities: data.activities.map((activity) => (shouldMarkAll || readIds.has(activity.id) ? { ...activity, read: true } : activity)),
    readStateHydrated: shouldMarkAll ? true : data.readStateHydrated,
  };
};

export const hydrateCachedPatientActivityLogReadState = (monthDate = new Date(), readIds: ReadonlySet<string>) => {
  const { cacheKey } = getMonthLogRange(monthDate);
  const cached = activitiesCache.get(cacheKey);
  if (!cached) return;

  activitiesCache.set(cacheKey, {
    data: {
      ...cached.data,
      activities: cached.data.activities.map((activity) => (activity.read || readIds.has(activity.id) ? { ...activity, read: true } : activity)),
      readStateHydrated: true,
    },
  });
};

export const markCachedPatientActivityLogActivitiesRead = (monthDate = new Date(), activityIds: readonly string[] = []) => {
  const { cacheKey } = getMonthLogRange(monthDate);
  const cached = activitiesCache.get(cacheKey);
  if (!cached) return;

  activitiesCache.set(cacheKey, {
    data: markPatientActivityLogDataRead(cached.data, activityIds),
  });
};

export const markAllCachedPatientActivityLogActivitiesRead = () => {
  activitiesCache.forEach((cached, cacheKey) => {
    activitiesCache.set(cacheKey, { data: markPatientActivityLogDataRead(cached.data) });
  });
};

export const getPatientActivitiesFromApi = async (monthDate = new Date()): Promise<ActivityLogRecord[]> => {
  const data = await getPatientActivityLogData(monthDate);
  return data.activities;
};

export const confirmMedicationScheduleViaApi = async (schedule: MedicationScheduleRecord, selectedDate: Date, doseIndex = 0) => {
  const selectedTime = schedule.times[doseIndex] ?? schedule.times[0];
  const scheduledTime = getAppScheduledDateTime(selectedDate, selectedTime);

  await api.post("/medication-logs", {
    scheduleId: schedule.id,
    status: "confirmed",
    scheduledTime: scheduledTime.toISOString(),
    confirmedAt: new Date().toISOString(),
  });

  // Invalidate caches after confirmation
  clearPatientDashboardCache();
  clearPatientsCache();
  await Promise.all([
    import("./alertsApi").then(({ clearAlertsCache }) => clearAlertsCache()).catch(() => undefined),
    import("./auditLogApi").then(({ clearAuditLogCache }) => clearAuditLogCache()).catch(() => undefined),
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./notificationActivitiesApi").then(({ clearNotificationActivityCache }) => clearNotificationActivityCache()).catch(() => undefined),
  ]);
  notifyDashboardDataChanged("medication-logs");
};
