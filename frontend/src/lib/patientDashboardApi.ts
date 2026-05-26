import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getFoodScansPageFromApi } from "@/lib/foodScanApi";
import { clearPatientsCache, getCurrentPatientFromApi } from "@/lib/patientApi";
import { getSchedulesForPatientsFromApi } from "@/lib/scheduleApi";

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
}

export interface PatientAdherenceStatsResponse {
  adherenceRate: number;
  totalScheduled: number;
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
}

const dashboardCacheTtl = 15_000;
let dashboardCache: { data: PatientDashboardData; expiresAt: number } | null = null;
let dashboardRequest: Promise<PatientDashboardData> | null = null;
let dashboardOverviewCache: { data: PatientDashboardOverviewData; expiresAt: number } | null = null;
let dashboardOverviewRequest: Promise<PatientDashboardOverviewData> | null = null;
const patientScheduleCache = new Map<string, { data: PatientScheduleData; expiresAt: number }>();
const patientScheduleRequests = new Map<string, Promise<PatientScheduleData>>();

const activitiesCacheTtl = 15_000;
const activitiesCache = new Map<string, { data: PatientActivityLogData; expiresAt: number }>();
const activitiesRequests = new Map<string, Promise<PatientActivityLogData>>();

export const clearPatientDashboardCache = () => {
  dashboardCache = null;
  dashboardRequest = null;
  dashboardOverviewCache = null;
  dashboardOverviewRequest = null;
  patientScheduleCache.clear();
  patientScheduleRequests.clear();
  activitiesCache.clear();
  activitiesRequests.clear();
};

const medicationLogMonthPageSize = 100;
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

const getPatientScheduleBaseData = async (scheduleLimit?: number) => {
  const patient = await getCurrentPatientFromApi();
  const schedules = await getSchedulesForPatientsFromApi([patient], scheduleLimit ? { limit: scheduleLimit } : {});

  return {
    patient,
    schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
  };
};

const getPatientDashboardBaseData = async (): Promise<PatientDashboardOverviewData> => {
  const now = Date.now();
  if (dashboardOverviewCache && dashboardOverviewCache.expiresAt > now) return dashboardOverviewCache.data;
  if (dashboardOverviewRequest) return dashboardOverviewRequest;

  dashboardOverviewRequest = (async () => {
    const patient = await getCurrentPatientFromApi();

    const [schedules, adherenceResponse] = await Promise.all([
      getSchedulesForPatientsFromApi([patient]),
      api.get<{ data: PatientAdherenceStatsResponse }>("/adherence", { params: { patient_id: patient.id, period: "1y" } }),
    ]);

    const result = {
      patient,
      schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
      adherenceStats: adherenceResponse.data.data,
    };
    dashboardOverviewCache = { data: result, expiresAt: Date.now() + dashboardCacheTtl };
    return result;
  })().finally(() => {
    dashboardOverviewRequest = null;
  });

  return dashboardOverviewRequest;
};

export const getPatientDashboardOverviewData = async (): Promise<PatientDashboardOverviewData> => {
  const now = Date.now();
  if (dashboardCache && dashboardCache.expiresAt > now) {
    const { patient, schedules, adherenceStats } = dashboardCache.data;
    return { patient, schedules, adherenceStats };
  }

  return getPatientDashboardBaseData();
};

export const getPatientDashboardData = async (): Promise<PatientDashboardData> => {
  const now = Date.now();
  if (dashboardCache && dashboardCache.expiresAt > now) return dashboardCache.data;
  if (dashboardRequest) return dashboardRequest;

  dashboardRequest = (async () => {
    const baseData = await getPatientDashboardBaseData();

    const logResponse = await api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: baseData.patient.id, limit: 10 } });

    const result = {
      ...baseData,
      medicationLogs: logResponse.data.data,
    };
    dashboardCache = { data: result, expiresAt: Date.now() + dashboardCacheTtl };
    return result;
  })().finally(() => {
    dashboardRequest = null;
  });

  return dashboardRequest;
};

const getMedicationLogsForMonth = async (patientId: string, monthDate: Date) => {
  const { startDate, endDate } = getMonthLogRange(monthDate);
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

const getMedicationLogDateKey = (log: MedicationLogResponse) => (log.scheduledTime || log.confirmedAt || log.createdAt || "").slice(0, 10);

const applyCompletedScheduleEndDates = (
  schedules: readonly MedicationScheduleRecord[],
  medicationLogs: readonly MedicationLogResponse[],
): MedicationScheduleRecord[] => {
  const latestLogDateBySchedule = medicationLogs.reduce<Record<string, string>>((latestDates, log) => {
    const dateKey = getMedicationLogDateKey(log);
    if (!dateKey) return latestDates;

    const currentDate = latestDates[log.scheduleId];
    if (currentDate && currentDate >= dateKey) return latestDates;

    return {
      ...latestDates,
      [log.scheduleId]: dateKey,
    };
  }, {});

  return schedules.map((schedule) => {
    if (schedule.status !== "Selesai" || schedule.endDate) return schedule;

    return {
      ...schedule,
      endDate: latestLogDateBySchedule[schedule.id] ?? schedule.startDate,
    };
  });
};

export const getPatientScheduleData = async (monthDate = new Date()): Promise<PatientScheduleData> => {
  const now = Date.now();
  const { cacheKey } = getMonthLogRange(monthDate);
  const cached = patientScheduleCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = patientScheduleRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const baseData = await getPatientScheduleBaseData();
    const medicationLogs = await getMedicationLogsForMonth(baseData.patient.id, monthDate);

    const result = {
      ...baseData,
      schedules: applyCompletedScheduleEndDates(baseData.schedules, medicationLogs),
      medicationLogs,
    };
    patientScheduleCache.set(cacheKey, { data: result, expiresAt: Date.now() + dashboardCacheTtl });
    return result;
  })().finally(() => {
    patientScheduleRequests.delete(cacheKey);
  });

  patientScheduleRequests.set(cacheKey, request);
  return request;
};

export const getConfirmedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((confirmedDates, log) => {
  if (log.status !== "confirmed") return confirmedDates;

  const dateKey = (log.scheduledTime || log.confirmedAt || log.createdAt || "").slice(0, 10);
  if (!dateKey) return confirmedDates;

  return {
    ...confirmedDates,
    [dateKey]: [...(confirmedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getCompletedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((completedDates, log) => {
  if (log.status !== "confirmed" && log.status !== "missed") return completedDates;

  const dateKey = (log.scheduledTime || log.confirmedAt || log.createdAt || "").slice(0, 10);
  if (!dateKey) return completedDates;

  return {
    ...completedDates,
    [dateKey]: [...(completedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getPatientActivityLogData = async (monthDate = new Date()): Promise<PatientActivityLogData> => {
  const now = Date.now();
  const { cacheKey } = getMonthLogRange(monthDate);
  const cached = activitiesCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = activitiesRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = (async () => {
    const baseData = await getPatientScheduleBaseData(patientActivityScheduleLimit);
    const [logResponse, scans] = await Promise.all([
      getMedicationLogsForMonth(baseData.patient.id, monthDate),
      getFoodScansForPatientMonth(baseData.patient.id, monthDate).catch(() => []),
    ]);
    const data = {
      ...baseData,
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

    const scanActivities: ActivityLogRecord[] = scans.map((scan) => ({
      id: `food-scan-${scan.id}`,
      title: scan.risk === "High Risk" ? "Scan makanan berisiko" : "Scan makanan selesai",
      description: scan.result,
      category: "Scan Makanan",
      severity: scan.risk === "High Risk" ? "Peringatan" : "Sukses",
      timestamp: scan.scannedAt,
      patientId: scan.patientId,
      patientName: data.patient.name,
      patientAvatar: data.patient.avatar,
      scanId: scan.id,
      read: false,
    }));

    const activities = [...medicationActivities, ...scanActivities]
      .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
    const result = {
      patient: data.patient,
      schedules: data.schedules,
      activities,
      monthKey: cacheKey,
    };
    activitiesCache.set(cacheKey, { data: result, expiresAt: Date.now() + activitiesCacheTtl });
    return result;
  })().finally(() => {
    activitiesRequests.delete(cacheKey);
  });

  activitiesRequests.set(cacheKey, request);
  return request;
};

export const getPatientActivitiesFromApi = async (monthDate = new Date()): Promise<ActivityLogRecord[]> => {
  const data = await getPatientActivityLogData(monthDate);
  return data.activities;
};

export const confirmMedicationScheduleViaApi = async (schedule: MedicationScheduleRecord, selectedDate: Date, doseIndex = 0) => {
  const scheduledTime = new Date(selectedDate);
  const selectedTime = schedule.times[doseIndex] ?? schedule.times[0];

  if (selectedTime) {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    scheduledTime.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  }

  await api.post("/medication-logs", {
    scheduleId: schedule.id,
    status: "confirmed",
    scheduledTime: scheduledTime.toISOString(),
    confirmedAt: new Date().toISOString(),
  });

  // Invalidate caches after confirmation
  clearPatientDashboardCache();
  clearPatientsCache();
};
