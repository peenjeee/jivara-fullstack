"use client";

import { cloneElement, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  warning: "text-muted hover:bg-warning/10 hover:text-warning-dark",
  blue: "text-muted hover:bg-[color:var(--blue)]/10 hover:text-[var(--blue)]",
  delete: "text-danger hover:bg-danger/10 hover:text-danger",
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

interface TooltipPosition {
  readonly left: number;
  readonly top: number;
  readonly transform: string;
}

export default function IconActionButton({ label, children, tone = "primary", size = "md", disabled = false, loading = false, onClick }: IconActionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLSpanElement | null>(null);
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const updateTooltipPositionRef = useRef<() => void>(() => {});

  const icon = isValidElement<{ "aria-hidden"?: boolean; focusable?: string }>(children)
    ? cloneElement(children, { "aria-hidden": true, focusable: "false" })
    : children;

  const updateTooltipPosition = () => {
    if (!buttonRef.current || typeof window === "undefined") {
      return;
    }

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.getBoundingClientRect().width ?? Math.min(label.length * 7 + 24, 280);
    const viewportPadding = 8;
    const centeredLeft = buttonRect.left + buttonRect.width / 2;
    const minLeft = viewportPadding + tooltipWidth / 2;
    const maxLeft = window.innerWidth - viewportPadding - tooltipWidth / 2;
    const left = Math.min(maxLeft, Math.max(minLeft, centeredLeft));
    const showBelow = buttonRect.top < 40;

    setTooltipPosition({
      left,
      top: showBelow ? buttonRect.bottom + 8 : buttonRect.top - 8,
      transform: showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
    });
  };

  useEffect(() => { updateTooltipPositionRef.current = updateTooltipPosition; });

  useLayoutEffect(() => {
    if (!isTooltipVisible) return;

    updateTooltipPositionRef.current();
  }, [isTooltipVisible]);

  useEffect(() => {
    if (!isTooltipVisible) {
      return;
    }

    const handler = () => updateTooltipPositionRef.current();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [isTooltipVisible]);

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizeClasses[size]} ${toneClasses[tone]}`}
        onBlur={() => setIsTooltipVisible(false)}
        onFocus={() => setIsTooltipVisible(true)}
        onMouseEnter={() => setIsTooltipVisible(true)}
        onMouseLeave={() => setIsTooltipVisible(false)}
      >
        {loading ? <Loader2 size={size === "sm" ? 16 : 18} className="animate-spin" aria-hidden="true" focusable="false" /> : icon}
      </button>
      {isTooltipVisible && typeof document !== "undefined" && createPortal(
        <span
          ref={tooltipRef}
          className="pointer-events-none fixed z-[60000] whitespace-nowrap rounded-full bg-text-main px-3 py-1.5 text-[11px] font-extrabold leading-none text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]"
          style={{
            left: tooltipPosition?.left ?? 0,
            top: tooltipPosition?.top ?? 0,
            transform: tooltipPosition?.transform ?? "translate(-50%, -100%)",
            visibility: tooltipPosition ? "visible" : "hidden",
          }}
        >
          {label}
        </span>,
        document.body,
      )}
    </span>
  );
}
