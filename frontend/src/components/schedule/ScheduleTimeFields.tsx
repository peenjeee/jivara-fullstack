"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export const SCHEDULE_INPUT_CLASS = "min-h-12 w-full rounded-2xl bg-surface px-4 text-sm font-semibold text-text-main shadow-[0_2px_8px_rgba(15,23,42,0.08)] outline-none transition-shadow placeholder:text-muted focus:shadow-[0_0_0_2px_rgba(20,114,69,0.18),0_2px_8px_rgba(15,23,42,0.08)] disabled:text-muted";

interface ScheduleTimeFieldsProps {
  readonly name: string;
  readonly initialTimes: readonly string[];
}

export default function ScheduleTimeFields({ name, initialTimes }: ScheduleTimeFieldsProps) {
  const [times, setTimes] = useState(() => initialTimes.length > 0 ? [...initialTimes] : ["08:00"]);

  return (
    <div>
      <span className="mb-2 block text-sm font-extrabold text-text-main">Waktu Minum <span className="text-danger">*</span></span>
      <div className="space-y-3">
        {times.map((time, index) => (
          <TimeInput
            key={`${name}-${time}-${index}`}
            id={`${name}-${index}`}
            name={name}
            defaultValue={time}
            removable={times.length > 1}
            onRemove={() => setTimes((currentTimes) => currentTimes.filter((_, currentIndex) => currentIndex !== index))}
          />
        ))}
      </div>
      <button type="button" onClick={() => setTimes((currentTimes) => [...currentTimes, "08:00"])} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary">
        <Plus size={16} /> Tambah Waktu
      </button>
    </div>
  );
}

function TimeInput({ id, name, defaultValue, removable, onRemove }: { readonly id: string; readonly name: string; readonly defaultValue: string; readonly removable: boolean; readonly onRemove: () => void }) {
  return (
    <div className="flex gap-2">
      <input id={id} name={name} type="time" defaultValue={defaultValue} className={SCHEDULE_INPUT_CLASS} required />
      {removable && (
        <button type="button" onClick={onRemove} className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger" aria-label="Hapus waktu">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
