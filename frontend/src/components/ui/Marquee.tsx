import { m } from "motion/react";

interface MarqueeProps {
  readonly className?: string;
}

const marqueeItems = [
  "Fullstack Developer: Rama Danadipa Putra Wijaya, Panji Ihsanudin Fajri",
  "Data Scientist: Rizki Pangestu, La Rayan",
  "AI Engineer: Alfito Juanda, Hanif Rifan",
] as const;

export default function Marquee({ className = "" }: MarqueeProps) {
  return (
    <m.div
      className={`relative w-screen overflow-hidden z-999 bg-leaf text-white shadow-[0_18px_60px_rgba(15,23,42,0.12)] ${className}`}
      aria-hidden="true"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-leaf to-leaf/0 sm:w-16" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-leaf to-leaf/0 sm:w-16" />

      <div className="flex w-max animate-marquee py-4 md:py-6">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center gap-5 pr-5 font-display text-[14px] font-extrabold uppercase leading-none tracking-[0.14em] text-white sm:gap-7 sm:pr-7 sm:text-[20px] md:text-[28px]">
            {marqueeItems.map((item) => (
              <span key={`${copy}-${item}`} className="flex shrink-0 items-center gap-5 sm:gap-7">
                <span>{item}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-white/55 sm:h-2 sm:w-2" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </m.div>
  );
}
