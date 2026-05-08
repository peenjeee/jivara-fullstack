import api from "@/lib/axios";
import { medicationSchedules as fallbackSchedules, type MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientsFromApi } from "@/lib/patientApi";

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

const getScheduledTimes = (value: unknown) => Array.isArray(value)
  ? value.filter((time): time is string => typeof time === "string")
  : [];

export const getSchedulesFromApi = async (): Promise<MedicationScheduleRecord[]> => {
  const [scheduleResponse, patients] = await Promise.all([
    api.get<{ data: ScheduleResponse[] }>("/medication-schedules"),
    getPatientsFromApi(),
  ]);
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const schedules = scheduleResponse.data.data.map((schedule) => {
    const patient = patientById.get(schedule.patientId);

    return {
      id: schedule.id,
      patientId: schedule.patientId,
      patientName: patient?.name ?? "Pasien tidak diketahui",
      patientAvatar: patient?.avatar ?? "PX",
      medicineName: schedule.drugName,
      dose: schedule.dosage,
      medicineForm: "Tablet" as const,
      stock: 0,
      frequency: `${schedule.frequency} kali sehari`,
      times: getScheduledTimes(schedule.scheduledTimes),
      mealRule: "Tidak tergantung makan" as const,
      startDate: schedule.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      reminderEnabled: Boolean(schedule.isActive),
      instructions: schedule.instructions ?? undefined,
      status: schedule.isActive === false ? "Nonaktif" as const : "Aktif" as const,
    };
  });

  return schedules.length > 0 ? schedules : fallbackSchedules;
};
