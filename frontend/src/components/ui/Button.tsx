"use client";

import React from "react";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
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

export default function Button({
  children,
  className = "",
  icon,
  variant = "primary",
  size = "md",
  loading = false,
  ...props
}: ButtonProps) {
  const isDisabled = props.disabled || loading;

  return (
    <motion.button
      {...(props as React.ComponentProps<typeof motion.button>)}
      disabled={isDisabled}
      className={`${BASE_STYLES} ${SIZE_STYLES[size]} ${VARIANT_STYLES[variant]} ${className}`}
      whileHover={isDisabled ? undefined : HOVER_VARIANTS[variant]}
      whileTap={isDisabled ? undefined : { y: -1, scale: 0.97 }}
      transition={SPRING_TRANSITION}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5" />
          Memuat...
        </>
      ) : (
        <>
          {children}

          {icon && (
            <motion.span
              className="relative z-10 flex items-center justify-center"
              whileHover={{ x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              {icon}
            </motion.span>
          )}
        </>
      )}
    </motion.button>
  );
}
