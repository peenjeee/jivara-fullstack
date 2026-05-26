"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface DashboardPageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly id?: string;
  readonly className?: string;
  readonly delay?: number;
}

export default function DashboardPageHeader({ title, description, action, id, className = "", delay = 0 }: DashboardPageHeaderProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.section
      id={id}
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}
      {...getDashboardEntranceMotion(shouldAnimate, delay, 18)}
    >
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-text-main sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-muted">{description}</p>}
      </div>
      {action}
    </m.section>
  );
}
