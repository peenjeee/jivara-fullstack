"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

interface SettingsCardProps {
  readonly title: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export default function SettingsCard({ title, icon, children, className = "", delay = 0 }: SettingsCardProps) {
  return (
    <motion.section
      className={`rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8 ${className}`}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
    >
      <div className="mb-8 flex items-center gap-5">
        <motion.div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-emerald [&_svg]:h-8 [&_svg]:w-8"
          initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: delay + 0.12 }}
        >
          {icon}
        </motion.div>
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}
