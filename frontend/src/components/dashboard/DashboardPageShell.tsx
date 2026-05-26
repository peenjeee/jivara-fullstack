"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface DashboardPageShellProps {
  readonly children: ReactNode;
}

export default function DashboardPageShell({ children }: DashboardPageShellProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.main
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8"
      {...getDashboardEntranceMotion(shouldAnimate, 0, 18)}
    >
      {children}
    </m.main>
  );
}
