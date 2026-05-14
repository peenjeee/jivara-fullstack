"use client";

import { motion } from "motion/react";
import SummaryCard, { type SummaryCardItem } from "./SummaryCard";

interface SummaryCardGridProps {
  readonly stats: readonly SummaryCardItem[];
  readonly className?: string;
  readonly desktopColumns?: 3 | 4;
  readonly variant?: "default" | "compact";
  readonly compactLayout?: "default" | "constrained";
}

export default function SummaryCardGrid({ stats, className = "", desktopColumns = 3, variant = "compact", compactLayout = "default" }: SummaryCardGridProps) {
  const desktopGridClass = desktopColumns === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";
  const isCompact = variant === "compact";
  const isConstrainedCompact = isCompact && compactLayout === "constrained";
  const gridClass = isConstrainedCompact
    ? "mx-auto max-w-[680px] justify-items-center"
    : desktopGridClass;

  return (
    <section className={`mt-6 grid auto-rows-fr grid-cols-2 items-stretch gap-4 ${gridClass} ${className}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`${isConstrainedCompact ? "w-full max-w-[320px]" : "h-full"} ${!isConstrainedCompact && stats.length === 3 && index === 2 ? "col-span-2 xl:col-span-1" : ""}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 + index * 0.08 }}
        >
          <SummaryCard stat={stat} compact={isCompact} />
        </motion.div>
      ))}
    </section>
  );
}
