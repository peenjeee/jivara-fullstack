import { describe, expect, it } from "vitest";
import {
  addMonths,
  getCalendarDays,
  getConfirmedCount,
  getDateKey,
  getDayStatus,
  getMonthStart,
  getSchedulesForDate,
  isSameDate,
} from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const activeSchedule: MedicationScheduleRecord = {
  id: "schedule-1",
  patientId: "JVR-001",
  patientName: "Budi Santoso",
  patientAvatar: "BS",
  medicineName: "Metformin",
  dose: "500 mg",
  medicineForm: "Tablet",
  stock: 12,
  frequency: "1x sehari",
  mealRule: "Sesudah makan",
  times: ["08:00"],
  startDate: "2026-05-01",
  endDate: "2026-05-31",
  reminderEnabled: true,
  status: "Aktif",
};

const inactiveSchedule: MedicationScheduleRecord = {
  ...activeSchedule,
  id: "schedule-2",
  medicineName: "Amlodipine",
  status: "Selesai",
};

describe("patient schedule helpers", () => {
  it("formats and compares dates by local date key", () => {
    expect(getDateKey(new Date(2026, 4, 9))).toBe("2026-05-09");
    expect(getMonthStart(new Date(2026, 4, 20))).toEqual(new Date(2026, 4, 1));
    expect(addMonths(new Date(2026, 4, 20), 1)).toEqual(new Date(2026, 5, 1));
    expect(isSameDate(new Date(2026, 4, 9, 8), new Date(2026, 4, 9, 20))).toBe(true);
  });

  it("returns active schedules for a date", () => {
    expect(getSchedulesForDate([activeSchedule, inactiveSchedule], new Date())).toEqual(expect.arrayContaining([activeSchedule]));
    expect(getSchedulesForDate([activeSchedule], new Date(2026, 3, 30))).toEqual([]);
  });

  it("calculates day status", () => {
    const today = new Date(2026, 4, 9);

    expect(getDayStatus([activeSchedule], new Date(2026, 4, 9), {}, today)).toBe("active");
    expect(getDayStatus([activeSchedule], new Date(2026, 4, 9), { "2026-05-09": ["schedule-1"] }, today)).toBe("done");
    expect(getDayStatus([activeSchedule], new Date(2026, 4, 8), {}, today)).toBe("missed");
    expect(getDayStatus([activeSchedule], new Date(2026, 4, 10), {}, today)).toBe("upcoming");
    expect(getDayStatus([], new Date(2026, 4, 9), {}, today)).toBe("empty");
  });

  it("builds a 42-day calendar grid with selected and today markers", () => {
    const days = getCalendarDays(new Date(2026, 4, 1), new Date(2026, 4, 9), [activeSchedule], {}, new Date(2026, 4, 9));

    expect(days).toHaveLength(42);
    expect(days.find((day) => day.dateKey === "2026-05-09")).toMatchObject({ isToday: true, isSelected: true, status: "active" });
  });

  it("counts confirmed schedules for a date", () => {
    expect(getConfirmedCount([activeSchedule, inactiveSchedule], new Date(2026, 4, 9), { "2026-05-09": ["schedule-1"] })).toBe(1);
  });
});
