import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

export type PatientScheduleDayStatus = "empty" | "done" | "active" | "missed" | "upcoming";

export interface PatientCalendarDay {
  readonly date: Date;
  readonly dateKey: string;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly status: PatientScheduleDayStatus;
}

export function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMonthLabel(date: Date) {
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

export function getReadableDate(date: Date) {
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function isSameDate(a: Date, b: Date) {
  return getDateKey(a) === getDateKey(b);
}

export function getSchedulesForDate(schedules: readonly MedicationScheduleRecord[], date: Date) {
  const dateKey = getDateKey(date);

  return schedules.filter((schedule) => {
    if (schedule.status !== "Aktif") return false;
    if (schedule.startDate > dateKey) return false;
    if (schedule.endDate && schedule.endDate < dateKey) return false;
    return true;
  });
}

export function getDayStatus(schedules: readonly MedicationScheduleRecord[], date: Date, confirmedScheduleDates: Readonly<Record<string, readonly string[]>>, today: Date): PatientScheduleDayStatus {
  const schedulesForDate = getSchedulesForDate(schedules, date);
  if (schedulesForDate.length === 0) return "empty";

  const dateKey = getDateKey(date);
  const confirmedIds = confirmedScheduleDates[dateKey] ?? [];
  const isDone = schedulesForDate.every((schedule) => confirmedIds.includes(schedule.id));

  if (isDone) return "done";
  if (dateKey < getDateKey(today)) return "missed";
  if (dateKey > getDateKey(today)) return "upcoming";
  return "active";
}

export function getCalendarDays(month: Date, selectedDate: Date, schedules: readonly MedicationScheduleRecord[], confirmedScheduleDates: Readonly<Record<string, readonly string[]>>, today = new Date()): PatientCalendarDay[] {
  const monthStart = getMonthStart(month);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date,
      dateKey: getDateKey(date),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: isSameDate(date, today),
      isSelected: isSameDate(date, selectedDate),
      status: getDayStatus(schedules, date, confirmedScheduleDates, today),
    };
  });
}

export function getConfirmedCount(schedules: readonly MedicationScheduleRecord[], date: Date, confirmedScheduleDates: Readonly<Record<string, readonly string[]>>) {
  const confirmedIds = confirmedScheduleDates[getDateKey(date)] ?? [];
  return schedules.filter((schedule) => confirmedIds.includes(schedule.id)).length;
}
