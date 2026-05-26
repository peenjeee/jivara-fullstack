"use client";

import type { ReactNode } from "react";
import { m, type Transition } from "motion/react";
import { useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface SettingsCardProps {
  readonly title: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
}

export default function SettingsCard({ title, icon, children, className = "", delay = 0 }: SettingsCardProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const sectionInitial = shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : false;
  const sectionTransition: Transition = shouldAnimate ? { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay } : { duration: 0 };
  const iconInitial = shouldAnimate ? { opacity: 0, rotate: -8, scale: 0.9 } : false;
  const iconTransition: Transition = shouldAnimate ? { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: delay + 0.12 } : { duration: 0 };

  return (
    <m.section
      className={`rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8 ${className}`}
      initial={sectionInitial}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={sectionTransition}
    >
      <div className="mb-8 flex items-center gap-5">
        <m.div
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-emerald [&_svg]:size-8"
          initial={iconInitial}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={iconTransition}
        >
          {icon}
        </m.div>
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
      </div>
      {children}
    </m.section>
  );
}
