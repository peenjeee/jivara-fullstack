import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getFoodScansForPatientFromApi } from "@/lib/foodScanApi";
import { getPatientDetailFromApi, getPatientsFromApi } from "@/lib/patientApi";
import { getSchedulesFromApi } from "@/lib/scheduleApi";

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
}

export interface PatientDashboardData {
  patient: PatientRecord;
  schedules: MedicationScheduleRecord[];
  medicationLogs: MedicationLogResponse[];
  adherenceStats: PatientAdherenceStatsResponse;
}

export const getCurrentPatientFromApi = async () => {
  const patients = await getPatientsFromApi();
  const patient = patients[0];

  if (!patient) {
    throw new Error("Data pasien tidak ditemukan.");
  }

  const detail = await getPatientDetailFromApi(patient.id);
  return detail.patient;
};

export const getPatientDashboardData = async (): Promise<PatientDashboardData> => {
  const patient = await getCurrentPatientFromApi();
  const patients = await getPatientsFromApi();
  const [schedules, logResponse, adherenceResponse] = await Promise.all([
    getSchedulesFromApi(patients),
    api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patient.id, limit: 100 } }),
    api.get<{ data: PatientAdherenceStatsResponse }>("/adherence", { params: { patient_id: patient.id, period: "30d" } }),
  ]);

  return {
    patient,
    schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
    medicationLogs: logResponse.data.data,
    adherenceStats: adherenceResponse.data.data,
  };
};

export const getConfirmedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((confirmedDates, log) => {
  if (log.status !== "confirmed") return confirmedDates;

  const dateKey = (log.confirmedAt || log.scheduledTime || log.createdAt || "").slice(0, 10);
  if (!dateKey) return confirmedDates;

  return {
    ...confirmedDates,
    [dateKey]: [...(confirmedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getCompletedScheduleDates = (logs: readonly MedicationLogResponse[]) => logs.reduce<Record<string, string[]>>((completedDates, log) => {
  if (log.status !== "confirmed" && log.status !== "missed") return completedDates;

  const dateKey = (log.confirmedAt || log.scheduledTime || log.createdAt || "").slice(0, 10);
  if (!dateKey) return completedDates;

  return {
    ...completedDates,
    [dateKey]: [...(completedDates[dateKey] ?? []), log.scheduleId],
  };
}, {});

export const getPatientActivitiesFromApi = async (): Promise<ActivityLogRecord[]> => {
  const data = await getPatientDashboardData();
  const scans = await getFoodScansForPatientFromApi(data.patient.id).catch(() => []);

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

  return [...medicationActivities, ...scanActivities]
    .sort((first, second) => Date.parse(second.timestamp) - Date.parse(first.timestamp));
};

export const confirmMedicationScheduleViaApi = async (schedule: MedicationScheduleRecord, selectedDate: Date) => {
  const scheduledTime = new Date(selectedDate);
  const [firstTime] = schedule.times;

  if (firstTime) {
    const [hours, minutes] = firstTime.split(":").map(Number);
    scheduledTime.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  }

  await api.post("/medication-logs", {
    scheduleId: schedule.id,
    status: "confirmed",
    scheduledTime: scheduledTime.toISOString(),
    confirmedAt: new Date().toISOString(),
  });
};
