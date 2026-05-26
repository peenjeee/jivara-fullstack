"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface FormSectionProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly animated?: boolean;
  readonly delay?: number;
}

const baseClass = "space-y-5 rounded-3xl bg-surface p-4 sm:p-5";

export default function FormSection({ children, className = "", animated = false, delay = 0 }: FormSectionProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  if (animated) {
    return (
      <m.section
        className={`${baseClass} ${className}`}
        {...getDashboardEntranceMotion(shouldAnimate, delay, 16)}
      >
        {children}
      </m.section>
    );
  }

  return <section className={`${baseClass} ${className}`}>{children}</section>;
}
