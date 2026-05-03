"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

interface NumberStepperProps {
  readonly id: string;
  readonly name?: string;
  readonly value?: string | number;
  readonly defaultValue?: string | number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly required?: boolean;
  readonly ariaLabel?: string;
  readonly onChange?: (value: string) => void;
}

export default function NumberStepper({ id, name, value, defaultValue = "", min, max, step = 1, required = false, ariaLabel, onChange }: NumberStepperProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(String(defaultValue));
  const currentValue = isControlled ? String(value) : internalValue;

  const setNextValue = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  const adjustValue = (direction: 1 | -1) => {
    const fallback = direction > 0 ? min ?? 0 : min ?? 0;
    const numericValue = currentValue.trim() === "" ? fallback : Number(currentValue);
    const nextValue = clampValue(Number.isFinite(numericValue) ? numericValue + direction * step : fallback, min, max);
    setNextValue(String(nextValue));
  };

  return (
    <div className="flex min-h-12 min-w-0 w-full max-w-full overflow-hidden rounded-2xl bg-surface text-sm font-semibold text-text-main shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(20,114,69,0.18),0_2px_8px_rgba(15,23,42,0.08)]">
      <input id={id} name={name ?? id} type="hidden" value={currentValue} required={required} />
      <input
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        value={currentValue}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/[^0-9-]/g, "");
          setNextValue(nextValue);
        }}
        className="min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-muted"
        placeholder="0"
      />
      <button type="button" onClick={() => adjustValue(-1)} className="grid w-12 place-items-center border-l border-line text-muted transition-colors hover:bg-line/40 hover:text-text-main" aria-label="Kurangi nilai">
        <Minus size={16} />
      </button>
      <button type="button" onClick={() => adjustValue(1)} className="grid w-12 place-items-center border-l border-line text-muted transition-colors hover:bg-line/40 hover:text-text-main" aria-label="Tambah nilai">
        <Plus size={16} />
      </button>
    </div>
  );
}

function clampValue(value: number, min?: number, max?: number) {
  if (min !== undefined && value < min) return min;
  if (max !== undefined && value > max) return max;
  return value;
}
