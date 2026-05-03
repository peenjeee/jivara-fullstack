"use client";

import { motion } from "motion/react";
import SummaryCard, { type SummaryCardItem } from "@/components/ui/SummaryCard";

interface LandingSummaryGridProps {
  readonly stats: readonly SummaryCardItem[];
  readonly className?: string;
}

export default function LandingSummaryGrid({ stats, className = "" }: LandingSummaryGridProps) {
  return (
    <div className={`mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:mt-12 ${className}`}>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
        >
          <SummaryCard stat={stat} />
        </motion.div>
      ))}
    </div>
  );
}
