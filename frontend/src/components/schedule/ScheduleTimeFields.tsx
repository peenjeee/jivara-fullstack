"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import TimePickerField from "@/components/ui/TimePickerField";
import { FORM_INPUT_CLASS } from "@/components/ui/formStyles";

export const SCHEDULE_INPUT_CLASS = FORM_INPUT_CLASS;

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
      <button type="button" onClick={() => setTimes((currentTimes) => [...currentTimes, "08:00"])} className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white hover:cursor-pointer">
        <Plus size={16} /> Tambah Waktu
      </button>
    </div>
  );
}

function TimeInput({ id, name, defaultValue, removable, onRemove }: { readonly id: string; readonly name: string; readonly defaultValue: string; readonly removable: boolean; readonly onRemove: () => void }) {
  return (
    <div className="flex min-w-0 gap-2">
      <div className="min-w-0 flex-1">
        <TimePickerField id={id} name={name} defaultValue={defaultValue} className={SCHEDULE_INPUT_CLASS} required />
      </div>
      {removable && (
        <button type="button" onClick={onRemove} className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl hover:bg-danger/10 text-danger" aria-label="Hapus waktu">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
