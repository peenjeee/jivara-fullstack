"use client";

import type { ReactNode } from "react";
import { m } from "motion/react";

interface LandingRevealProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
  readonly y?: number;
  readonly amount?: number;
}

export default function LandingReveal({ children, className = "", delay = 0, y = 24, amount = 0.35 }: LandingRevealProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </m.div>
  );
}
