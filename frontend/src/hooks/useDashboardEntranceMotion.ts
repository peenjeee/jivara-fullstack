"use client";

import type { Transition } from "motion/react";
import { useEffect, useState } from "react";

let hasPlayedDashboardEntrance = false;

export function useDashboardEntranceMotion() {
  const [shouldAnimate] = useState(() => !hasPlayedDashboardEntrance);

  useEffect(() => {
    hasPlayedDashboardEntrance = true;
  }, []);

  return shouldAnimate;
}

export function getDashboardEntranceMotion(shouldAnimate: boolean, delay = 0, y = 22) {
  const easing: NonNullable<Transition["ease"]> = [0.16, 1, 0.3, 1];

  return {
    initial: shouldAnimate ? { opacity: 0, y } : false,
    animate: { opacity: 1, y: 0 },
    transition: shouldAnimate
      ? { duration: 0.42, ease: easing, delay }
      : { duration: 0 },
  } as const;
}
