"use client";

import { m } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SelectField from "@/components/ui/SelectField";
import { addMonths, getCalendarDays, type PatientCalendarDay } from "@/helpers/patientSchedule";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

interface PatientMedicationCalendarProps {
  readonly month: Date;
  readonly selectedDate: Date;
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly confirmedScheduleDates: Readonly<Record<string, readonly string[]>>;
  readonly onMonthChange: (month: Date) => void;
  readonly onDateSelect: (date: Date) => void;
}

const weekDays = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: new Date(2026, index, 1).toLocaleDateString("id-ID", { month: "short" }),
}));

const getYearOptions = (date: Date) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = date.getFullYear();
  const startYear = Math.min(currentYear - 5, selectedYear - 2);
  const endYear = Math.max(currentYear + 5, selectedYear + 2);
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

export default function PatientMedicationCalendar({ month, selectedDate, schedules, confirmedScheduleDates, onMonthChange, onDateSelect }: PatientMedicationCalendarProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const today = new Date();
  const calendarDays = getCalendarDays(month, selectedDate, schedules, confirmedScheduleDates, today);

  return (
    <m.section
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      {...getDashboardEntranceMotion(shouldAnimate, 0.12, 22)}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3 lg:w-auto lg:min-w-64">
          <button type="button" className="flex size-10 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => onMonthChange(addMonths(month, -1))} aria-label="Bulan sebelumnya">
            <ChevronLeft size={20} />
          </button>
          <MonthYearSelect month={month} onChange={(nextMonth) => onMonthChange(nextMonth)} />
          <button type="button" className="flex size-10 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => onMonthChange(addMonths(month, 1))} aria-label="Bulan berikutnya">
            <ChevronRight size={20} />
          </button>
        </div>
        <button type="button" className="w-full rounded-full bg-surface px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-text-main transition-colors hover:bg-line/70 lg:w-auto" onClick={() => {
          onMonthChange(today);
          onDateSelect(today);
        }}>
          Hari Ini
        </button>
      </div>

      <div className="mt-7 grid grid-cols-7 gap-2 text-center text-sm font-extrabold text-muted">
        {weekDays.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {calendarDays.map((day) => <CalendarDayButton key={day.dateKey} day={day} onSelect={onDateSelect} />)}
      </div>
    </m.section>
  );
}

function MonthYearSelect({ month, onChange }: { readonly month: Date; readonly onChange: (month: Date) => void }) {
  const years = getYearOptions(month).map((year) => ({ label: String(year), value: String(year) }));

  return (
    <div className="flex min-w-0 items-center justify-center gap-2">
      <div className="w-24">
        <SelectField
          id="patientScheduleMonth"
          value={String(month.getMonth())}
          options={monthOptions}
          className="justify-center rounded-xl bg-transparent px-2 py-1 font-display text-xl font-extrabold text-text-main hover:bg-surface sm:text-2xl"
          onChange={(value) => onChange(new Date(month.getFullYear(), Number(value), 1))}
        />
      </div>
      <div className="w-28">
        <SelectField
          id="patientScheduleYear"
          value={String(month.getFullYear())}
          options={years}
          className="justify-center rounded-xl bg-transparent px-2 py-1 font-display text-xl font-extrabold text-text-main hover:bg-surface sm:text-2xl"
          onChange={(value) => onChange(new Date(Number(value), month.getMonth(), 1))}
        />
      </div>
    </div>
  );
}

function CalendarDayButton({ day, onSelect }: { readonly day: PatientCalendarDay; readonly onSelect: (date: Date) => void }) {
  const statusLabelByStatus: Record<PatientCalendarDay["status"], string> = {
    empty: "tidak ada jadwal",
    done: "jadwal selesai",
    active: "jadwal hari ini belum selesai",
    missed: "jadwal terlewat",
    upcoming: "jadwal akan datang",
  };
  const statusDotClass = day.status === "missed" ? "bg-danger" : day.status === "active" ? "bg-warning" : day.status === "done" ? "bg-primary" : day.status === "upcoming" ? "bg-[var(--blue)]" : "bg-transparent";
  const isDone = day.status === "done";
  const hasSoftGreenBackground = day.isToday || isDone;
  const dayStateClass = day.isSelected ? "bg-text-main text-white hover:bg-dark" : hasSoftGreenBackground ? "bg-surface text-text-main hover:bg-line/60" : "hover:bg-surface";
  const dotClass = day.isSelected && day.status !== "empty" ? "bg-white" : statusDotClass;

  return (
    <button
      type="button"
      className={`group relative mx-auto flex aspect-square min-h-10 w-full max-w-14 flex-col items-center justify-center rounded-full text-sm font-extrabold transition-colors ${dayStateClass} ${day.isCurrentMonth ? "" : "opacity-45"}`}
      onClick={() => onSelect(day.date)}
      aria-label={`${day.date.toLocaleDateString("id-ID")}, ${statusLabelByStatus[day.status]}`}
    >
      <span className={isDone ? "relative inline-flex min-w-5 justify-center after:absolute after:left-0 after:right-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2 after:rounded-full after:bg-current" : ""}>{day.date.getDate()}</span>
      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden="true" />
    </button>
  );
}
