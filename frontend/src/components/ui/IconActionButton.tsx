import type { ReactNode } from "react";

export type IconActionTone = "primary" | "danger" | "warning" | "blue" | "delete";

interface IconActionButtonProps {
  readonly label: string;
  readonly children: ReactNode;
  readonly tone?: IconActionTone;
  readonly size?: "sm" | "md";
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

export default function IconActionButton({ label, children, tone = "primary", size = "md", onClick }: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${sizeClasses[size]} ${toneClasses[tone]}`}
    >
      {children}
    </button>
  );
}
