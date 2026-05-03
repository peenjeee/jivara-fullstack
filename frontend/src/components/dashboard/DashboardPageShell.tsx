"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

interface DashboardPageShellProps {
  readonly children: ReactNode;
}

export default function DashboardPageShell({ children }: DashboardPageShellProps) {
  return (
    <motion.main
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
  );
}
