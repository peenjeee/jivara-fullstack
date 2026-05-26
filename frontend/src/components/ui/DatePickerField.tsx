"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface DatePickerFieldProps {
  readonly id: string;
  readonly name?: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly mode?: "single" | "range";
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly popoverAlign?: "left" | "right";
  readonly className?: string;
  readonly onChange?: (value: string) => void;
}

const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function DatePickerField({ id, name, value, defaultValue = "", mode = "single", required = false, placeholder, popoverAlign = "left", className = "", onChange }: DatePickerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedRange = parseRangeValue(selectedValue);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedRange.start ?? selectedRange.end ?? new Date());
  const nextVisibleMonth = useMemo(() => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1), [visibleMonth]);
  const inputName = name ?? id;
  const inputPlaceholder = placeholder ?? (mode === "range" ? "dd/mm/yyyy - dd/mm/yyyy" : "dd/mm/yyyy");
  const popoverPositionClass = mode === "range"
    ? `absolute top-[calc(100%+8px)] w-[min(310px,calc(100vw-2rem))] lg:w-[min(620px,calc(100vw-2rem))] ${popoverAlign === "right" ? "right-0" : "left-0"}`
    : `absolute top-[calc(100%+8px)] w-[min(320px,calc(100vw-4rem))] ${popoverAlign === "right" ? "right-0" : "left-0"}`;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const commitValue = (nextValue: string, closePopover: boolean) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    if (closePopover) setIsOpen(false);
  };

  const setNextValue = (nextValue: string) => {
    if (mode === "single") {
      commitValue(nextValue, true);
      return;
    }

    const currentRange = parseRangeValue(selectedValue);
    if (!currentRange.start || currentRange.end) {
      commitValue(`${nextValue}..`, false);
      return;
    }

    const startValue = formatDateValue(currentRange.start);
    const [nextStart, nextEnd] = nextValue < startValue ? [nextValue, startValue] : [startValue, nextValue];
    commitValue(`${nextStart}..${nextEnd}`, true);
  };

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <input id={id} name={inputName} type="hidden" value={selectedValue} required={required} />
      <button
        type="button"
        id={`${id}-button`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-w-0 items-center justify-between gap-3 ${className}`}
      >
        <span className={`min-w-0 truncate ${selectedValue ? "text-text-main" : "text-muted"}`}>{formatSelectedLabel(selectedValue, mode) || inputPlaceholder}</span>
        <CalendarDays size={18} className="shrink-0 text-text-main" />
      </button>

      {isOpen && (
        <div className={`${popoverPositionClass} z-40 max-h-[min(78vh,620px)] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] lg:p-4`}>
          <div className="mb-3 flex items-center justify-between gap-2 lg:mb-4 lg:gap-3">
            <button type="button" onClick={() => moveMonth(-1)} className="grid h-8 w-8 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text-main lg:h-9 lg:w-9" aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} />
            </button>
            {mode === "range" ? (
              <>
                <p className="min-w-0 flex-1 truncate text-center text-xs font-extrabold text-text-main lg:hidden">
                  {formatMonthTitle(visibleMonth)}
                </p>
                <div className="hidden min-w-0 flex-1 grid-cols-2 gap-3 text-center lg:grid">
                  <p className="truncate text-sm font-extrabold text-text-main">{formatMonthTitle(visibleMonth)}</p>
                  <p className="truncate text-sm font-extrabold text-text-main">{formatMonthTitle(nextVisibleMonth)}</p>
                </div>
              </>
            ) : (
              <p className="min-w-0 flex-1 truncate text-center text-sm font-extrabold text-text-main">{formatMonthTitle(visibleMonth)}</p>
            )}
            <button type="button" onClick={() => moveMonth(1)} className="grid h-8 w-8 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text-main lg:h-9 lg:w-9" aria-label="Bulan berikutnya">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className={mode === "range" ? "grid gap-4 lg:grid-cols-2" : ""}>
            <CalendarMonth month={visibleMonth} selectedRange={selectedRange} onSelect={setNextValue} compact={mode === "range"} />
            {mode === "range" && (
              <div className="hidden lg:block">
                <CalendarMonth month={nextVisibleMonth} selectedRange={selectedRange} onSelect={setNextValue} compact />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarMonth({ month, selectedRange, onSelect, compact = false }: { readonly month: Date; readonly selectedRange: { start: Date | null; end: Date | null }; readonly onSelect: (value: string) => void; readonly compact?: boolean }) {
  const calendarDays = useMemo(() => getCalendarDays(month), [month]);
  const gridClass = compact ? "gap-0.5 sm:gap-1" : "gap-1";
  const dayLabelClass = compact ? "py-1.5 text-[10px] sm:py-2 sm:text-[11px]" : "py-2 text-[11px]";
  const dayButtonClass = compact ? "h-8 rounded-lg text-[13px] sm:h-9 sm:rounded-xl sm:text-sm lg:h-10" : "h-10 rounded-xl text-sm";

  return (
    <div className={`grid grid-cols-7 ${gridClass} text-center`}>
      {dayLabels.map((day) => <span key={`${month.toISOString()}-${day}`} className={`${dayLabelClass} font-extrabold uppercase tracking-[0.08em] text-muted`}>{day}</span>)}
      {calendarDays.map((day) => {
        const dateValue = formatDateValue(day.date);
        const isCurrentMonth = day.date.getMonth() === month.getMonth();
        const isSelected = isDateSelected(day.date, selectedRange);
        const isInRange = isDateInsideRange(day.date, selectedRange);

        return (
          <button
            key={dateValue}
            type="button"
            onClick={() => onSelect(dateValue)}
            className={`${dayButtonClass} font-bold transition-colors ${
              isSelected ? "bg-primary text-white" : isInRange ? "bg-primary/10 text-primary" : isCurrentMonth ? "text-text-main hover:bg-surface" : "text-muted/60 hover:bg-surface"
            }`}
          >
            {day.date.getDate()}
          </button>
        );
      })}
    </div>
  );
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return { date };
  });
}

function parseDateValue(value: string | undefined) {
  if (!value) return null;
  if (value.includes("..")) return parseDateValue(value.split("..")[0]);
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function parseRangeValue(value: string | undefined) {
  if (!value) return { start: null, end: null };
  const [startValue, endValue] = value.split("..");
  return {
    start: parseDateValue(startValue),
    end: parseDateValue(endValue),
  };
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatSelectedLabel(value: string | undefined, mode: "single" | "range") {
  if (!value) return "";
  if (mode === "single") {
    const date = parseDateValue(value);
    return date ? formatDisplayDate(date) : "";
  }

  const range = parseRangeValue(value);
  const start = range.start ? formatDisplayDate(range.start) : "";
  const end = range.end ? formatDisplayDate(range.end) : "";
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - ...`;
  return "";
}

function isDateSelected(date: Date, range: { start: Date | null; end: Date | null }) {
  const dateValue = formatDateValue(date);
  return Boolean(range.start && formatDateValue(range.start) === dateValue || range.end && formatDateValue(range.end) === dateValue);
}

function isDateInsideRange(date: Date, range: { start: Date | null; end: Date | null }) {
  if (!range.start || !range.end) return false;
  const dateValue = formatDateValue(date);
  return dateValue > formatDateValue(range.start) && dateValue < formatDateValue(range.end);
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
