import api from "@/lib/axios";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientDetailFromApi, getPatientsFromApi } from "@/lib/patientApi";
import { getSchedulesFromApi } from "@/lib/scheduleApi";

interface MedicationLogResponse {
  id: string;
  scheduleId: string;
  patientId: string;
  drugName: string;
  status: string;
  scheduledTime: string;
  confirmedAt?: string | null;
  createdAt?: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
}

export interface PatientDashboardData {
  patient: PatientRecord;
  schedules: MedicationScheduleRecord[];
  medicationLogs: MedicationLogResponse[];
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
  const [schedules, logResponse] = await Promise.all([
    getSchedulesFromApi(),
    api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params: { patient_id: patient.id, limit: 100 } }),
  ]);

  return {
    patient,
    schedules: schedules.filter((schedule) => schedule.patientId === patient.id),
    medicationLogs: logResponse.data.data,
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

export const getPatientActivitiesFromApi = async (): Promise<ActivityLogRecord[]> => {
  const data = await getPatientDashboardData();

  return data.medicationLogs.map((log) => ({
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
    read: true,
  }));
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
