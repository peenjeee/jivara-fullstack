"use client";

import { domAnimation, LazyMotion } from "motion/react";
import type { ReactNode } from "react";

interface MotionProviderProps {
  readonly children: ReactNode;
}

export default function MotionProvider({ children }: MotionProviderProps) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
