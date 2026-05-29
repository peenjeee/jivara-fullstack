import type { MedicationScheduleRecord, MedicationScheduleStatus, PatientScheduleGroup } from "@/lib/mocks/schedules";
import type { PatientRecord } from "@/lib/mocks/patients";

const defaultLowStockThreshold = 5;

export function getNextScheduleOrder(records: readonly MedicationScheduleRecord[]) {
  const maxOrder = records.reduce((max, schedule) => {
    const order = Number(schedule.id.replace("SCH-", ""));
    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, 0);

  return maxOrder + 1;
}

export function groupSchedulesByPatient(records: readonly MedicationScheduleRecord[], lowStockThreshold = defaultLowStockThreshold, patients: readonly PatientRecord[] = []): PatientScheduleGroup[] {
  const groups = new Map<string, MedicationScheduleRecord[]>();

  records.forEach((schedule) => {
    const currentSchedules = groups.get(schedule.patientId) ?? [];
    groups.set(schedule.patientId, [...currentSchedules, schedule]);
  });

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const orderedPatientIds = [
    ...patients.map((patient) => patient.id),
    ...Array.from(groups.keys()).filter((patientId) => !patientById.has(patientId)),
  ];

  return orderedPatientIds.map((patientId) => {
    const groupSchedules = groups.get(patientId) ?? [];
    const [firstSchedule] = groupSchedules;
    const patient = patientById.get(patientId);

    return {
      patientId,
      patientName: firstSchedule?.patientName ?? patient?.name ?? "Pasien tidak diketahui",
      patientAvatar: firstSchedule?.patientAvatar ?? patient?.avatar ?? "PX",
      patientStatus: firstSchedule?.patientStatus ?? patient?.status ?? "On Ideal Schedule",
      schedules: groupSchedules,
      summaryStatus: groupSchedules.length > 0 ? getSummaryStatus(groupSchedules) : "Nonaktif",
      nextSchedule: getNextScheduleLabel(groupSchedules),
      activeReminders: groupSchedules.filter((schedule) => isActiveMedicationSchedule(schedule) && schedule.reminderEnabled).length,
      totalMedicineStock: groupSchedules.reduce((total, schedule) => total + schedule.stock, 0),
      lowStockCount: groupSchedules.filter((schedule) => schedule.stock <= lowStockThreshold).length,
    };
  });
}

export function isActiveMedicationSchedule(schedule: MedicationScheduleRecord) {
  return schedule.status !== "Selesai" && schedule.status !== "Nonaktif";
}

export function getSummaryStatus(records: readonly MedicationScheduleRecord[]): MedicationScheduleStatus {
  if (records.some((schedule) => schedule.status === "Aktif")) return "Aktif";
  if (records.every((schedule) => schedule.status === "Selesai")) return "Selesai";
  return "Nonaktif";
}

export function getNextScheduleLabel(records: readonly MedicationScheduleRecord[]) {
  const activeRecords = records.filter(isActiveMedicationSchedule);
  const candidates = (activeRecords.length > 0 ? activeRecords : records)
    .flatMap((schedule) => schedule.times.map((time) => ({ time, medicineName: schedule.medicineName })))
    .sort((first, second) => first.time.localeCompare(second.time));
  const [nextSchedule] = candidates;

  return nextSchedule ? `${nextSchedule.time} - ${nextSchedule.medicineName}` : "Belum ada jadwal";
}
