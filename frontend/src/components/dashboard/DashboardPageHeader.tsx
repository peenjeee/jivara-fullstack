"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

interface DashboardPageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly id?: string;
  readonly className?: string;
  readonly delay?: number;
}

export default function DashboardPageHeader({ title, description, action, id, className = "", delay = 0 }: DashboardPageHeaderProps) {
  return (
    <motion.section
      id={id}
      className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-text-main sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-muted">{description}</p>}
      </div>
      {action}
    </motion.section>
  );
}
