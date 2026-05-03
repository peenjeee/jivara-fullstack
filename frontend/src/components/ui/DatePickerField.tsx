"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface DatePickerFieldProps {
  readonly id: string;
  readonly name?: string;
  readonly value?: string;
  readonly defaultValue?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly popoverAlign?: "left" | "right";
  readonly className?: string;
  readonly onChange?: (value: string) => void;
}

const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export default function DatePickerField({ id, name, value, defaultValue = "", required = false, placeholder = "dd/mm/yyyy", popoverAlign = "left", className = "", onChange }: DatePickerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedDate = parseDateValue(selectedValue);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const calendarDays = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const setNextValue = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setIsOpen(false);
  };

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      {name && <input id={id} name={name} type="hidden" value={selectedValue} required={required} />}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-w-0 items-center justify-between gap-3 ${className}`}
      >
        <span className={`min-w-0 truncate ${selectedValue ? "text-text-main" : "text-muted"}`}>{selectedDate ? formatDisplayDate(selectedDate) : placeholder}</span>
        <CalendarDays size={18} className="shrink-0 text-text-main" />
      </button>

      {isOpen && (
        <div className={`absolute top-[calc(100%+8px)] z-40 w-[min(320px,calc(100vw-4rem))] rounded-2xl border border-line bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] ${popoverAlign === "right" ? "right-0" : "left-0"}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button type="button" onClick={() => moveMonth(-1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text-main" aria-label="Bulan sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-extrabold text-text-main">{formatMonthTitle(visibleMonth)}</p>
            <button type="button" onClick={() => moveMonth(1)} className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-text-main" aria-label="Bulan berikutnya">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {dayLabels.map((day) => <span key={day} className="py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted">{day}</span>)}
            {calendarDays.map((day) => {
              const dateValue = formatDateValue(day.date);
              const isCurrentMonth = day.date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedValue === dateValue;

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => setNextValue(dateValue)}
                  className={`h-10 rounded-xl text-sm font-bold transition-colors ${
                    isSelected ? "bg-primary text-white" : isCurrentMonth ? "text-text-main hover:bg-surface" : "text-muted/60 hover:bg-surface"
                  }`}
                >
                  {day.date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
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
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
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

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
