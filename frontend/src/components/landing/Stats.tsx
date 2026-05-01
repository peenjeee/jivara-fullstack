"use client";

import { HeartPulse, UsersRound } from "lucide-react";
import { motion } from "motion/react";
import Section from "@/components/ui/Section";
import SummaryCard from "@/components/ui/SummaryCard";
import SystemDemoVideo from "./SystemDemoVideo";

const stats = [
  {
    label: "Total Perawat",
    value: "+67",
    helper: "",
    tone: "safe",
    color: "emerald",
    icon: HeartPulse,
  },
  {
    label: "Total Pasien",
    value: "+6.7K",
    helper: "",
    tone: "safe",
    color: "leaf",
    icon: UsersRound,
  },
] as const;

export default function Stats() {
  return (
    <Section id="tentang" className="bg-bg pt-10 pb-12 md:pt-16 md:pb-20" aria-labelledby="stats-title">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <h2 id="stats-title" className="font-display text-[clamp(34px,7vw,64px)] font-black leading-tight tracking-[-0.05em] text-text-main">
          Dipercaya Bersama
        </h2>
      </motion.div>

      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:gap-4 lg:mt-12">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
          >
            <SummaryCard stat={stat} />
          </motion.div>
        ))}
      </div>

      <SystemDemoVideo />
    </Section>
  );
}
