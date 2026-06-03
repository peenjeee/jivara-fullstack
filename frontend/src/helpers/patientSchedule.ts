import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getAppScheduledDateTime } from "@/lib/appTimezone";

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

export function getSchedulesForDate(schedules: readonly MedicationScheduleRecord[], date: Date, today = new Date()) {
  return getSchedulesForDateWithLimit(schedules, date, today);
}

export function getDoseTrackedSchedules(schedules: readonly MedicationScheduleRecord[]) {
  return schedules.filter((schedule) => schedule.status === "Aktif" && schedule.stock > 0);
}

function getCalendarTrackedSchedules(schedules: readonly MedicationScheduleRecord[]) {
  return schedules.filter((schedule) => schedule.status === "Aktif" || schedule.status === "Selesai");
}

export function getScheduleDoseCount(schedule: MedicationScheduleRecord) {
  if (schedule.times.length > 0) return schedule.times.length;

  const match = schedule.frequency.match(/\d+/);
  const parsed = match ? Number(match[0]) : 1;
  return Math.max(Number.isInteger(parsed) ? parsed : 1, 1);
}

export function getScheduleConfirmedDoseCount(schedule: MedicationScheduleRecord, date: Date, confirmedScheduleDates: Readonly<Record<string, readonly string[]>>) {
  const confirmedIds = confirmedScheduleDates[getDateKey(date)] ?? [];
  return Math.min(confirmedIds.filter((scheduleId) => scheduleId === schedule.id).length, getScheduleDoseCount(schedule));
}

export type ScheduleDoseWindow = {
  readonly doseIndex: number | null;
  readonly canConfirm: boolean;
  readonly isBeforeFirstDose: boolean;
  readonly isCurrentDoseConfirmed: boolean;
  readonly isFullyConfirmed: boolean;
  readonly nextDoseTime?: string;
};

const getDoseDate = (date: Date, time: string) => {
  return getAppScheduledDateTime(date, time);
};

export function getScheduleDoseWindow(schedule: MedicationScheduleRecord, date: Date, confirmedScheduleDates: Readonly<Record<string, readonly string[]>>, now = new Date()): ScheduleDoseWindow {
  const doseCount = getScheduleDoseCount(schedule);
  const confirmedDoseCount = getScheduleConfirmedDoseCount(schedule, date, confirmedScheduleDates);
  const doseTimes = schedule.times.length > 0 ? schedule.times : ["00:00"];
  const doseDates = doseTimes.map((time) => getDoseDate(date, time)).sort((first, second) => first.getTime() - second.getTime());
  const isFullyConfirmed = confirmedDoseCount >= doseCount;

  if (isFullyConfirmed) {
    return { doseIndex: null, canConfirm: false, isBeforeFirstDose: false, isCurrentDoseConfirmed: true, isFullyConfirmed };
  }

  if (now < doseDates[0]) {
    return { doseIndex: 0, canConfirm: false, isBeforeFirstDose: true, isCurrentDoseConfirmed: false, isFullyConfirmed, nextDoseTime: doseTimes[0] };
  }

  const currentIndex = Math.max(doseDates.findIndex((doseDate, index) => now >= doseDate && (!doseDates[index + 1] || now < doseDates[index + 1])), 0);
  const isCurrentDoseConfirmed = confirmedDoseCount > currentIndex;

  return {
    doseIndex: currentIndex,
    canConfirm: !isCurrentDoseConfirmed,
    isBeforeFirstDose: false,
    isCurrentDoseConfirmed,
    isFullyConfirmed,
    nextDoseTime: isCurrentDoseConfirmed ? doseTimes[currentIndex + 1] : undefined,
  };
}

export function getTotalDoseCount(schedules: readonly MedicationScheduleRecord[]) {
  return schedules.reduce((total, schedule) => total + getScheduleDoseCount(schedule), 0);
}

function addDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return getDateKey(date);
}

function getScheduleDisplayEndDate(schedule: MedicationScheduleRecord, today = new Date()) {
  const rollingDisplayEndDate = addDays(getDateKey(today), 30);
  if (!schedule.endDate) return rollingDisplayEndDate;
  return schedule.endDate < rollingDisplayEndDate ? schedule.endDate : rollingDisplayEndDate;
}

function getSchedulesForDateWithLimit(schedules: readonly MedicationScheduleRecord[], date: Date, today = new Date()) {
  const dateKey = getDateKey(date);

  return schedules.filter((schedule) => {
    if (schedule.startDate > dateKey) return false;
    if (getScheduleDisplayEndDate(schedule, today) < dateKey) return false;
    return true;
  });
}

export function getDayStatus(schedules: readonly MedicationScheduleRecord[], date: Date, confirmedScheduleDates: Readonly<Record<string, readonly string[]>>, today: Date): PatientScheduleDayStatus {
  const schedulesForDate = getSchedulesForDateWithLimit(schedules, date, today);
  if (schedulesForDate.length === 0) return "empty";

  const dateKey = getDateKey(date);
  const totalDoses = getTotalDoseCount(schedulesForDate);
  const confirmedDoses = schedulesForDate.reduce((total, schedule) => total + getScheduleConfirmedDoseCount(schedule, date, confirmedScheduleDates), 0);
  const isDone = totalDoses > 0 && confirmedDoses >= totalDoses;

  if (isDone) return "done";
  if (confirmedDoses > 0 && dateKey < getDateKey(today)) return "missed";

  const calendarTrackedSchedules = getCalendarTrackedSchedules(schedulesForDate);
  if (calendarTrackedSchedules.length === 0) return "empty";

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
  return schedules.reduce((total, schedule) => total + getScheduleConfirmedDoseCount(schedule, date, confirmedScheduleDates), 0);
}

export interface AdherenceStatsForNormalization {
  adherenceRate: number;
  totalScheduled: number;
  totalConfirmed?: number;
  totalMissed?: number;
  totalSnoozed?: number;
  dailyBreakdown: Array<{
    date: string;
    scheduled: number;
    confirmed: number;
    missed?: number;
    snoozed?: number;
  }>;
}

export function normalizeAdherenceForVisibleSchedules<T extends AdherenceStatsForNormalization>(
  adherenceStats: T,
  schedules: readonly MedicationScheduleRecord[],
): T {
  if (schedules.length === 0) return adherenceStats;

  const dailyBreakdown = adherenceStats.dailyBreakdown.map((day) => {
    const date = getDateFromKey(day.date);
    if (!date) return day;

    const schedulesForDate = getSchedulesForDate(schedules, date);
    if (schedulesForDate.length === 0) return { ...day, scheduled: 0, confirmed: 0, missed: 0, snoozed: 0 };
    if (day.scheduled <= 0) return day;

    const scheduled = getTotalDoseCount(schedulesForDate);
    const confirmed = Math.min(scheduled, Math.round((day.confirmed / day.scheduled) * scheduled));
    const missed = Math.min(scheduled, Math.round(((day.missed ?? 0) / day.scheduled) * scheduled));
    const snoozed = Math.min(scheduled, Math.round(((day.snoozed ?? 0) / day.scheduled) * scheduled));

    return { ...day, scheduled, confirmed, missed, snoozed };
  });
  const totalScheduled = dailyBreakdown.reduce((total, day) => total + day.scheduled, 0);
  const totalConfirmed = dailyBreakdown.reduce((total, day) => total + day.confirmed, 0);

  return {
    ...adherenceStats,
    totalScheduled,
    totalConfirmed,
    totalMissed: dailyBreakdown.reduce((total, day) => total + (day.missed ?? 0), 0),
    totalSnoozed: dailyBreakdown.reduce((total, day) => total + (day.snoozed ?? 0), 0),
    adherenceRate: totalScheduled > 0 ? Number(((totalConfirmed / totalScheduled) * 100).toFixed(1)) : 100,
    dailyBreakdown,
  };
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}
