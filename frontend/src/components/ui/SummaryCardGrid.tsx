"use client";

import { motion } from "motion/react";
import SummaryCard, { type SummaryCardItem } from "./SummaryCard";

interface SummaryCardGridProps {
  readonly stats: readonly SummaryCardItem[];
  readonly className?: string;
}

export default function SummaryCardGrid({ stats, className = "" }: SummaryCardGridProps) {
  return (
    <section className={`mt-6 grid auto-rows-fr grid-cols-2 items-stretch gap-4 md:grid-cols-3 ${className}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className={`h-full ${index === 2 ? "col-span-2 md:col-span-1" : ""}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 + index * 0.08 }}
        >
          <SummaryCard stat={stat} />
        </motion.div>
      ))}
    </section>
  );
}
