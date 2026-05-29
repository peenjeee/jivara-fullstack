import { activityLogs, type ActivityCategory, type ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { foodScans, type FoodScanRecord } from "@/lib/mocks/foodScans";
import { patients, type PatientRecord } from "@/lib/mocks/patients";
import { medicationSchedules, type MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { isActiveMedicationSchedule } from "./schedules";

export type AdherenceRange = 7 | 14 | 30 | "1y" | "all";

export interface AdherenceTrendPoint {
  readonly label: string;
  readonly value: number;
}

export interface ActivityDistributionItem {
  readonly label: ActivityCategory;
  readonly value: number;
}

export interface PatientDetailData {
  readonly patient: PatientRecord;
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly activities: readonly ActivityLogRecord[];
  readonly activityDistribution: readonly ActivityDistributionItem[];
  readonly scans: readonly FoodScanRecord[];
}

export function getPatientDetailData(patientId: string): PatientDetailData | null {
  const patient = patients.find((currentPatient) => currentPatient.id === patientId);
  if (!patient) return null;

  return {
    patient,
    schedules: medicationSchedules.filter((schedule) => schedule.patientId === patient.id),
    activities: activityLogs.filter((activity) => activity.patientId === patient.id).sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
    activityDistribution: getActivityDistribution(activityLogs.filter((activity) => activity.patientId === patient.id)),
    scans: foodScans.filter((scan) => scan.patientId === patient.id).sort((a, b) => Date.parse(b.scannedAt) - Date.parse(a.scannedAt)),
  };
}

export function getActivityDistribution(activities: readonly ActivityLogRecord[]): ActivityDistributionItem[] {
  const categories: readonly ActivityCategory[] = ["Reminder", "Kepatuhan", "Scan Makanan"];

  return categories.map((category) => ({
    label: category,
    value: activities.filter((activity) => activity.category === category).length,
  }));
}

export function getAdherenceTrend(patient: PatientRecord, days: number): AdherenceTrendPoint[] {
  return Array.from({ length: days }, (_, index) => {
    const variation = ((index * 13 + patient.id.length * 7) % 24) - 12;
    const value = Math.max(18, Math.min(100, patient.adherence + variation));

    return {
      label: `Hari ${index + 1}`,
      value,
    };
  });
}

export function getPatientSummary(data: PatientDetailData) {
  const totalMedicineCount = data.schedules.length;
  const activeMedicineCount = data.schedules.filter(isActiveMedicationSchedule).length;
  const activeReminderCount = data.schedules.filter((schedule) => isActiveMedicationSchedule(schedule) && schedule.reminderEnabled).length;
  const criticalActivityCount = data.activities.filter((activity) => activity.severity === "Kritis").length;

  return {
    totalMedicineCount,
    activeMedicineCount,
    activeReminderCount,
    criticalActivityCount,
  };
}
