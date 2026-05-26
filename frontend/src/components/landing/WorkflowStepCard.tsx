"use client";

import { m } from "motion/react";
import type { LucideIcon } from "lucide-react";

type StepColor = "emerald" | "leaf" | "pine" | "forest";

interface WorkflowStepCardProps {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly color: StepColor;
}

const stepColorStyles: Record<StepColor, string> = {
  emerald: "bg-emerald/15 text-emerald",
  leaf: "bg-leaf/15 text-leaf",
  pine: "bg-pine/15 text-pine",
  forest: "bg-forest/15 text-forest",
};

export default function WorkflowStepCard({ number, title, description, icon: Icon, color }: WorkflowStepCardProps) {
  return (
    <m.article
      className="relative rounded-[28px] bg-surface p-5 lg:bg-transparent lg:p-0"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Number(number) * 0.05 }}
    >
      <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
        <div className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full ring-8 ring-white ${stepColorStyles[color]}`}>
          <Icon size={26} strokeWidth={2.4} />
        </div>

        <div className="lg:mt-6">
          <h3 className="font-display text-xl font-black tracking-[-0.03em] text-text-main">
            {title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
      </div>
    </m.article>
  );
}
