"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface PatientDetailSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export default function PatientDetailSection({ title, description, action, children, className = "", delay = 0 }: PatientDetailSectionProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.section
      className={`rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-6 ${className}`}
      {...getDashboardEntranceMotion(shouldAnimate, delay, 22)}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
          {description && <p className="mt-1 text-sm font-semibold leading-6 text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </m.section>
  );
}
