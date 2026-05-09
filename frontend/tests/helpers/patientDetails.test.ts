import { describe, expect, it } from "vitest";
import { getActivityDistribution, getAdherenceTrend, getPatientDetailData, getPatientSummary } from "@/helpers/patientDetails";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const patient: PatientRecord = {
  id: "JVR-001",
  name: "Budi Santoso",
  age: 50,
  gender: "Pria",
  status: "On Ideal Schedule",
  lastVisit: "Hari ini",
  adherence: 82,
  avatar: "BS",
};

const activity: ActivityLogRecord = {
  id: "act-1",
  title: "Reminder",
  description: "Reminder obat",
  category: "Reminder",
  severity: "Kritis",
  timestamp: "2026-05-09T08:00:00.000Z",
  read: false,
};

const schedule: MedicationScheduleRecord = {
  id: "SCH-001",
  patientId: "JVR-001",
  patientName: "Budi Santoso",
  patientAvatar: "BS",
  medicineName: "Metformin",
  dose: "500 mg",
  medicineForm: "Tablet",
  stock: 10,
  frequency: "1 kali sehari",
  times: ["08:00"],
  mealRule: "Sesudah makan",
  startDate: "2026-05-09",
  reminderEnabled: true,
  status: "Aktif",
};

describe("patient detail helpers", () => {
  it("returns mock detail data for known patient and null for unknown patient", () => {
    expect(getPatientDetailData("JVR-01")?.patient.id).toBe("JVR-01");
    expect(getPatientDetailData("unknown")).toBeNull();
  });

  it("generates adherence trend within valid range", () => {
    const trend = getAdherenceTrend(patient, 7);

    expect(trend).toHaveLength(7);
    expect(trend.every((point) => point.value >= 18 && point.value <= 100)).toBe(true);
  });

  it("counts activity distribution and patient summary", () => {
    expect(getActivityDistribution([activity, { ...activity, id: "act-2", category: "Scan Makanan" }])).toEqual([
      { label: "Reminder", value: 1 },
      { label: "Kepatuhan", value: 0 },
      { label: "Scan Makanan", value: 1 },
    ]);

    expect(getPatientSummary({ patient, schedules: [schedule, { ...schedule, id: "SCH-002", reminderEnabled: false, status: "Nonaktif" }], activities: [activity], scans: [] })).toEqual({
      activeMedicineCount: 1,
      activeReminderCount: 1,
      criticalActivityCount: 1,
    });
  });
});
