"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

interface FormSectionProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly animated?: boolean;
  readonly delay?: number;
}

const baseClass = "space-y-5 rounded-3xl bg-surface p-4 sm:p-5";

export default function FormSection({ children, className = "", animated = false, delay = 0 }: FormSectionProps) {
  if (animated) {
    return (
      <motion.section
        className={`${baseClass} ${className}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay }}
      >
        {children}
      </motion.section>
    );
  }

  return <section className={`${baseClass} ${className}`}>{children}</section>;
}
