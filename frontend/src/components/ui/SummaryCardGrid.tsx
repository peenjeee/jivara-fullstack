"use client";

import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import SummaryCard, { type SummaryCardItem } from "./SummaryCard";

interface SummaryCardGridProps {
  readonly stats: readonly SummaryCardItem[];
  readonly className?: string;
  readonly desktopColumns?: 3 | 4;
  readonly variant?: "default" | "compact";
  readonly compactLayout?: "default" | "constrained";
}

export default function SummaryCardGrid({ stats, className = "", desktopColumns = 3, variant = "compact", compactLayout = "default" }: SummaryCardGridProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const desktopGridClass = desktopColumns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";
  const isCompact = variant === "compact";
  const isConstrainedCompact = isCompact && compactLayout === "constrained";
  const gridClass = isConstrainedCompact
    ? "mx-auto max-w-[680px] justify-items-center"
    : desktopGridClass;

  return (
    <section className={`mt-6 grid auto-rows-fr grid-cols-2 items-stretch gap-4 ${gridClass} ${className}`}>
      {stats.map((stat, index) => (
        <m.div
          key={stat.label}
          className={`${isConstrainedCompact ? "w-full max-w-[320px]" : "h-full"} ${!isConstrainedCompact && stats.length === 3 && index === 2 ? "col-span-2 xl:col-span-1" : ""}`}
          {...getDashboardEntranceMotion(shouldAnimate, 0.08 + index * 0.08, 22)}
        >
          <SummaryCard stat={stat} compact={isCompact} />
        </m.div>
      ))}
    </section>
  );
}
