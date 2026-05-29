import { describe, expect, it } from "vitest";
import { getNextScheduleLabel, getNextScheduleOrder, getSummaryStatus, groupSchedulesByPatient } from "@/helpers/schedules";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const schedule: MedicationScheduleRecord = {
  id: "SCH-001",
  patientId: "JVR-001",
  patientName: "Budi Santoso",
  patientAvatar: "BS",
  medicineName: "Metformin",
  dose: "500 mg",
  medicineForm: "Tablet",
  stock: 4,
  frequency: "1 kali sehari",
  times: ["08:00"],
  mealRule: "Sesudah makan",
  startDate: "2026-05-09",
  reminderEnabled: true,
  status: "Aktif",
};

describe("schedule helpers", () => {
  it("returns next schedule order from valid ids", () => {
    expect(getNextScheduleOrder([{ ...schedule, id: "legacy" }, { ...schedule, id: "SCH-010" }])).toBe(11);
  });

  it("summarizes status priority", () => {
    expect(getSummaryStatus([{ ...schedule, status: "Selesai" }, { ...schedule, id: "SCH-002", status: "Selesai" }])).toBe("Selesai");
    expect(getSummaryStatus([{ ...schedule, status: "Nonaktif" }])).toBe("Nonaktif");
    expect(getSummaryStatus([{ ...schedule, status: "Nonaktif" }, schedule])).toBe("Aktif");
  });

  it("groups schedules by patient with stock and reminder summary", () => {
    const groups = groupSchedulesByPatient([
      schedule,
      { ...schedule, id: "SCH-002", medicineName: "Amlodipine", stock: 8, times: ["07:00"], reminderEnabled: false },
      { ...schedule, id: "SCH-003", medicineName: "Simvastatin", stock: 0, times: ["20:00"], status: "Selesai", reminderEnabled: true },
      { ...schedule, id: "SCH-004", medicineName: "Captopril", stock: 6, times: ["21:00"], status: "Nonaktif", reminderEnabled: true },
    ], 5);

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      patientId: "JVR-001",
      nextSchedule: "07:00 - Amlodipine",
      activeReminders: 1,
      totalMedicineStock: 18,
      lowStockCount: 2,
    });
  });

  it("falls back when no schedule time exists", () => {
    expect(getNextScheduleLabel([{ ...schedule, times: [] }])).toBe("Belum ada jadwal");
  });
});
