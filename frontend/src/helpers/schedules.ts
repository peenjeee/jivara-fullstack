import type { MedicationScheduleRecord, MedicationScheduleStatus, PatientScheduleGroup } from "@/lib/mocks/schedules";
import { patients } from "@/lib/mocks/patients";

const defaultLowStockThreshold = 5;

export function getNextScheduleOrder(records: readonly MedicationScheduleRecord[]) {
  const maxOrder = records.reduce((max, schedule) => {
    const order = Number(schedule.id.replace("SCH-", ""));
    return Number.isFinite(order) ? Math.max(max, order) : max;
  }, 0);

  return maxOrder + 1;
}

export function groupSchedulesByPatient(records: readonly MedicationScheduleRecord[], lowStockThreshold = defaultLowStockThreshold): PatientScheduleGroup[] {
  const groups = new Map<string, MedicationScheduleRecord[]>();

  records.forEach((schedule) => {
    const currentSchedules = groups.get(schedule.patientId) ?? [];
    groups.set(schedule.patientId, [...currentSchedules, schedule]);
  });

  return Array.from(groups.values()).map((groupSchedules) => {
    const [firstSchedule] = groupSchedules;
    const patient = patients.find((currentPatient) => currentPatient.id === firstSchedule.patientId);

    return {
      patientId: firstSchedule.patientId,
      patientName: firstSchedule.patientName,
      patientAvatar: firstSchedule.patientAvatar,
      patientStatus: patient?.status ?? "On Ideal Schedule",
      schedules: groupSchedules,
      summaryStatus: getSummaryStatus(groupSchedules),
      nextSchedule: getNextScheduleLabel(groupSchedules),
      activeReminders: groupSchedules.filter((schedule) => schedule.reminderEnabled).length,
      totalMedicineStock: groupSchedules.reduce((total, schedule) => total + schedule.stock, 0),
      lowStockCount: groupSchedules.filter((schedule) => schedule.stock <= lowStockThreshold).length,
    };
  });
}

export function getSummaryStatus(records: readonly MedicationScheduleRecord[]): MedicationScheduleStatus {
  if (records.some((schedule) => schedule.status === "Aktif")) return "Aktif";
  if (records.every((schedule) => schedule.status === "Selesai")) return "Selesai";
  return "Nonaktif";
}

export function getNextScheduleLabel(records: readonly MedicationScheduleRecord[]) {
  const activeRecords = records.filter((schedule) => schedule.status !== "Selesai" && schedule.status !== "Nonaktif");
  const candidates = (activeRecords.length > 0 ? activeRecords : records)
    .flatMap((schedule) => schedule.times.map((time) => ({ time, medicineName: schedule.medicineName })))
    .sort((first, second) => first.time.localeCompare(second.time));
  const [nextSchedule] = candidates;

  return nextSchedule ? `${nextSchedule.time} - ${nextSchedule.medicineName}` : "Belum ada jadwal";
}
