"use client";

interface SwitchProps {
  readonly id: string;
  readonly name?: string;
  readonly checked?: boolean;
  readonly defaultChecked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
}

export default function Switch({ id, name, checked, defaultChecked, onCheckedChange, ariaLabel, className = "" }: SwitchProps) {
  const isControlled = checked !== undefined;

  return (
    <span className={`relative inline-flex ${className}`}>
      <input
        id={id}
        name={name ?? id}
        type="checkbox"
        value="on"
        {...(isControlled ? { checked } : { defaultChecked })}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        aria-label={ariaLabel}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1 top-1 size-5 rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.22)] transition-transform peer-checked:translate-x-5"
      />
    </span>
  );
}
