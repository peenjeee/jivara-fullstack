"use client";

import { HeartPulse, UsersRound } from "lucide-react";
import Section from "@/components/ui/Section";
import LandingReveal from "./LandingReveal";
import LandingSummaryGrid from "./LandingSummaryGrid";
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
      <LandingReveal className="text-center" y={26} amount={0.4}>
        <h2 id="stats-title" className="font-display text-[clamp(34px,7vw,64px)] font-black leading-tight tracking-[-0.05em] text-text-main">
          Dipercaya Bersama
        </h2>
      </LandingReveal>

      <LandingSummaryGrid stats={stats} />

      <SystemDemoVideo />
    </Section>
  );
}
