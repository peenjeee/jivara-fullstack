import api from "@/lib/axios";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientsFromApi } from "@/lib/patientApi";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { ScheduleMedicineFormValues } from "@/components/schedule/ScheduleForm";

interface ScheduleResponse {
  id: string;
  patientId: string;
  drugName: string;
  dosage: string;
  frequency: number;
  scheduledTimes: unknown;
  instructions?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
}

interface SingleScheduleResponse {
  data: ScheduleResponse;
}

const getScheduledTimes = (value: unknown) => Array.isArray(value)
  ? value.filter((time): time is string => typeof time === "string")
  : [];

const getFrequencyNumber = (value: string) => {
  const match = value.match(/\d+/);
  const parsed = match ? Number(match[0]) : 1;
  return Math.min(Math.max(Number.isInteger(parsed) ? parsed : 1, 1), 3);
};

const mapSchedule = (schedule: ScheduleResponse, patient?: PatientRecord): MedicationScheduleRecord => ({
  id: schedule.id,
  patientId: schedule.patientId,
  patientName: patient?.name ?? "Pasien tidak diketahui",
  patientAvatar: patient?.avatar ?? "PX",
  medicineName: schedule.drugName,
  dose: schedule.dosage,
  medicineForm: "Tablet",
  stock: 0,
  frequency: `${schedule.frequency} kali sehari`,
  times: getScheduledTimes(schedule.scheduledTimes),
  mealRule: "Tidak tergantung makan",
  startDate: schedule.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
  reminderEnabled: Boolean(schedule.isActive),
  instructions: schedule.instructions ?? undefined,
  status: schedule.isActive === false ? "Nonaktif" : "Aktif",
});

const mapMedicinePayload = (patientId: string, medicine: ScheduleMedicineFormValues, isActive = true) => ({
  patientId,
  drugName: medicine.medicineName,
  dosage: medicine.dose,
  frequency: getFrequencyNumber(medicine.frequency),
  scheduledTimes: [...medicine.times],
  instructions: medicine.instructions || null,
  isActive,
});

export const getSchedulesFromApi = async (): Promise<MedicationScheduleRecord[]> => {
  const [scheduleResponse, patients] = await Promise.all([
    api.get<{ data: ScheduleResponse[] }>("/medication-schedules"),
    getPatientsFromApi(),
  ]);
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const schedules = scheduleResponse.data.data.map((schedule) => mapSchedule(schedule, patientById.get(schedule.patientId)));

  return schedules;
};

export const createSchedulesViaApi = async (patientId: string, medicines: readonly ScheduleMedicineFormValues[], patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const responses = await Promise.all(medicines.map((medicine) => api.post<SingleScheduleResponse>("/medication-schedules", mapMedicinePayload(patientId, medicine, medicine.status !== "Nonaktif"))));
  return responses.map((response) => mapSchedule(response.data.data, patientById.get(response.data.data.patientId)));
};

export const updateScheduleViaApi = async (scheduleId: string, patientId: string, medicine: ScheduleMedicineFormValues, patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const response = await api.put<SingleScheduleResponse>(`/medication-schedules/${encodeURIComponent(scheduleId)}`, mapMedicinePayload(patientId, medicine, medicine.status !== "Nonaktif"));
  return mapSchedule(response.data.data, patientById.get(response.data.data.patientId));
};

export const setScheduleActiveViaApi = async (schedule: MedicationScheduleRecord, isActive: boolean, patients: readonly PatientRecord[]) => {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const response = await api.put<SingleScheduleResponse>(`/medication-schedules/${encodeURIComponent(schedule.id)}`, { isActive });
  return mapSchedule(response.data.data, patientById.get(response.data.data.patientId));
};

export const deactivateScheduleViaApi = async (scheduleId: string) => {
  await api.delete(`/medication-schedules/${encodeURIComponent(scheduleId)}`);
};
