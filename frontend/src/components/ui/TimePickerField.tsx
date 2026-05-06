"use client";

import { Check, Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TimePickerFieldProps {
  readonly id: string;
  readonly name: string;
  readonly defaultValue?: string;
  readonly required?: boolean;
  readonly className?: string;
}

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export default function TimePickerField({ id, name, defaultValue = "08:00", required = false, className = "" }: TimePickerFieldProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(() => parseTime(defaultValue).hour);
  const [minute, setMinute] = useState(() => parseTime(defaultValue).minute);
  const value = `${hour}:${minute}`;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <input id={id} name={name} type="hidden" value={value} required={required} />
      <button
        type="button"
        id={`${id}-button`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-w-0 items-center justify-between gap-3 ${className}`}
      >
        <span className="min-w-0 truncate">{value}</span>
        <Clock size={18} className="shrink-0 text-text-main" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(260px,calc(100vw-4rem))] overflow-hidden rounded-2xl border border-line bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="grid grid-cols-2 gap-3">
            <TimeColumn label="Jam" options={hours} value={hour} onChange={setHour} />
            <TimeColumn label="Menit" options={minutes} value={minute} onChange={setMinute} />
          </div>
        </div>
      )}
    </div>
  );
}

function TimeColumn({ label, options, value, onChange }: { readonly label: string; readonly options: readonly string[]; readonly value: string; readonly onChange: (value: string) => void }) {
  return (
    <div>
      <p className="px-2 pb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {options.map((option) => {
          const isSelected = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                isSelected ? "bg-primary/10 text-primary" : "text-text-main hover:bg-surface"
              }`}
            >
              <span>{option}</span>
              {isSelected && <Check size={15} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function parseTime(value: string) {
  const [rawHour = "08", rawMinute = "00"] = value.split(":");
  const hour = hours.includes(rawHour) ? rawHour : "08";
  const minute = minutes.includes(rawMinute) ? rawMinute : "00";

  return { hour, minute };
}
