"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface SelectFieldOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
  readonly disabled?: boolean;
}

interface SelectFieldProps<TValue extends string> {
  readonly id: string;
  readonly name?: string;
  readonly value?: TValue;
  readonly defaultValue?: TValue;
  readonly options: readonly SelectFieldOption<TValue>[];
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
  readonly className?: string;
  readonly inlineOptions?: boolean;
  readonly optionsPlacement?: "top" | "bottom";
  readonly onChange?: (value: TValue) => void;
}

export default function SelectField<TValue extends string>({ id, name, value, defaultValue, options, placeholder = "Pilih", disabled = false, required = false, className = "", inlineOptions = false, optionsPlacement = "bottom", onChange }: SelectFieldProps<TValue>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isControlled = value !== undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<TValue | "">((defaultValue ?? "") as TValue | "");
  const selectedValue = isControlled ? value : internalValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const inputName = name ?? id;

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectValue = (nextValue: TValue) => {
    if (!isControlled) setInternalValue(nextValue);
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <input id={id} name={inputName} type="hidden" value={selectedValue ?? ""} required={required} />
      <button
        type="button"
        id={`${id}-button`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        onClick={() => setIsOpen((current) => !current)}
        className={`flex min-w-0 items-center justify-between gap-3 disabled:cursor-not-allowed disabled:text-muted ${className}`}
      >
        <span id={`${id}-label`} className={`min-w-0 truncate ${selectedOption ? "text-text-main" : "text-muted"}`}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown size={18} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className={`${inlineOptions ? "mt-2" : `absolute left-0 right-0 z-40 ${optionsPlacement === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"}`} overflow-hidden rounded-2xl border border-line bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]`}
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div
            aria-labelledby={`${id}-label`}
            className="max-h-64 overflow-y-auto py-1"
          >
            {options.map((option) => {
              const isSelected = option.value === selectedValue;

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => selectValue(option.value)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-muted ${
                    isSelected ? "bg-primary/10 text-primary" : "text-text-main hover:bg-surface"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {isSelected && <Check size={16} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
