"use client";

import { m } from "motion/react";

interface WorkflowCardProps {
  number: number;
  title: string;
  description: string;
  span?: string;
  label?: string;
}

export default function WorkflowCard({
  number,
  title,
  description,
  span = "lg:col-span-6",
  label,
}: WorkflowCardProps) {
  return (
    <m.article
      className={`relative min-h-[280px] md:min-h-[320px] flex flex-col lg:flex-row items-start lg:items-end overflow-hidden rounded-[36px] bg-primary text-white border border-white/10 isolate transform-gpu col-span-1 md:col-span-1 ${span} p-10 lg:p-0 cursor-default`}
      whileHover={{
        y: -12,
        rotate: -0.5,
        boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
        scale: 1.02,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      {label && (
        <span className="hidden lg:block absolute top-[44px] left-[44px] text-text-main/5 font-display text-lg">
          {label}
        </span>
      )}
      <m.span
        className="relative lg:absolute lg:top-8 lg:right-8 w-12 lg:w-[58px] h-12 lg:h-[58px] grid place-items-center rounded-full bg-white text-primary text-lg lg:text-[22px] font-black mb-5 lg:mb-0"
        whileHover={{
          scale: 1.15,
          rotate: 10,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        {number}
      </m.span>
      <div className="w-full lg:w-[min(520px,calc(100%-96px))] lg:p-[42px]">
        <h3 className="mb-3 font-display text-[22px] md:text-[26px] font-black text-white">
          {title}
        </h3>
        <p className="mb-4 opacity-90 text-sm leading-relaxed text-white/95">
          {description}
        </p>
      </div>
    </m.article>
  );
}
