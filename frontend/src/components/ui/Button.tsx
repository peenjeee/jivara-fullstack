"use client";

import React from "react";
import { m } from "motion/react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingLabel?: string;
}

const SIZE_STYLES = {
  sm: "py-3 px-7 text-[13px] gap-2.5",
  md: "py-4 px-9 text-[13px] gap-2.5",
  lg: "py-5 px-10 text-base gap-3",
} as const;

const VARIANT_STYLES = {
  primary: "bg-primary text-white border border-white/10",
  outline: "bg-transparent text-primary border-2 border-primary",
} as const;

const HOVER_VARIANTS = {
  primary: {
    backgroundColor: "var(--primary-hover)",
  },
  outline: {
    backgroundColor: "var(--primary-hover)",
    color: "#ffffff",
  },
} as const;

const BASE_STYLES =
  "inline-flex items-center justify-center font-bold tracking-[0.1em] uppercase leading-none rounded-full relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group";

const SPRING_TRANSITION = {
  type: "spring" as const,
  stiffness: 400,
  damping: 17,
};

function DecorativeIcon({ icon }: { readonly icon: React.ReactNode }) {
  if (React.isValidElement<{ "aria-hidden"?: boolean; focusable?: string }>(icon)) {
    return React.cloneElement(icon, { "aria-hidden": true, focusable: "false" });
  }

  return icon;
}

export default function Button({
  children,
  className = "",
  icon,
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel = "Memuat…",
  ...props
}: ButtonProps) {
  const isDisabled = props.disabled || loading;

  return (
    <m.button
      {...(props as React.ComponentProps<typeof m.button>)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`${BASE_STYLES} ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${className}`}
      whileHover={isDisabled ? undefined : HOVER_VARIANTS[variant]}
      whileTap={isDisabled ? undefined : { y: -1, scale: 0.97 }}
      transition={SPRING_TRANSITION}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin -ml-1 mr-3 size-5" aria-hidden="true" focusable="false" />
          {loadingLabel}
        </>
      ) : (
        <>
          {children}

          {icon && (
            <m.span
              className="relative z-10 flex items-center justify-center"
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <DecorativeIcon icon={icon} />
            </m.span>
          )}
        </>
      )}
    </m.button>
  );
}
