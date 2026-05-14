import { cloneElement, isValidElement, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type IconActionTone = "primary" | "danger" | "warning" | "blue" | "delete";

interface IconActionButtonProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly tone?: IconActionTone;
  readonly size?: "sm" | "md";
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly onClick?: () => void;
}

const toneClasses: Record<IconActionTone, string> = {
  primary: "text-muted hover:bg-primary/10 hover:text-primary",
  danger: "text-muted hover:bg-danger/10 hover:text-danger",
  warning: "text-muted hover:bg-warning/10 hover:text-warning",
  blue: "text-muted hover:bg-[color:var(--blue)]/10 hover:text-[var(--blue)]",
  delete: "text-danger hover:bg-danger/10 hover:text-danger",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

export default function IconActionButton({ label, children, tone = "primary", size = "md", disabled = false, loading = false, onClick }: IconActionButtonProps) {
  const icon = isValidElement<{ "aria-hidden"?: boolean; focusable?: string }>(children)
    ? cloneElement(children, { "aria-hidden": true, focusable: "false" })
    : children;

  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${toneClasses[tone]}`}
      >
        {loading ? <Loader2 size={size === "sm" ? 16 : 18} className="animate-spin" aria-hidden="true" focusable="false" /> : icon}
      </button>
      <span className="pointer-events-none absolute bottom-full right-0 z-[9999] mb-2 whitespace-nowrap rounded-full bg-text-main px-3 py-1.5 text-[11px] font-extrabold leading-none text-white opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {label}
      </span>
    </span>
  );
}
