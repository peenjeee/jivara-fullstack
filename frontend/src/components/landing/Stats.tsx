"use client";

import { useEffect, useState } from "react";
import { HeartPulse, UsersRound } from "lucide-react";
import Section from "@/components/ui/Section";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import LandingReveal from "./LandingReveal";
import LandingSummaryGrid from "./LandingSummaryGrid";
import SystemDemoVideo from "./SystemDemoVideo";

interface PublicStatsResponse {
  data: {
    totalNurses: number;
    totalPatients: number;
  };
}

const fallbackStats: SummaryCardItem[] = [
  {
    label: "Total Semua Perawat",
    value: "-",
    helper: "",
    tone: "safe",
    color: "emerald",
    icon: HeartPulse,
  },
  {
    label: "Total Semua Pasien",
    value: "-",
    helper: "",
    tone: "safe",
    color: "leaf",
    icon: UsersRound,
  },
];

const getPublicStatsUrls = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) return [`${apiUrl.replace(/\/$/, "")}/public/stats`];
  return process.env.NODE_ENV === "development"
    ? ["http://localhost:3001/api/v1/public/stats", "/api/v1/public/stats"]
    : ["/api/v1/public/stats"];
};

export default function Stats() {
  const [stats, setStats] = useState(fallbackStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.any(getPublicStatsUrls().map((url) => fetch(url, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("PUBLIC_STATS_FAILED");
      return response.json() as Promise<PublicStatsResponse>;
    })))
      .then((response) => {
        if (!isMounted) return;
        const { totalNurses, totalPatients } = response.data;
        setStats([
          { ...fallbackStats[0], value: `+${totalNurses}` },
          { ...fallbackStats[1], value: `+${totalPatients}` },
        ]);
      })
      .catch(() => {
        if (isMounted) setStats(fallbackStats);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Section id="tentang" className="bg-bg pt-10 pb-12 md:pt-16 md:pb-20" aria-labelledby="stats-title">
      <LandingReveal className="text-center" y={26} amount={0.4}>
        <h2 id="stats-title" className="font-display text-[clamp(34px,7vw,64px)] font-black leading-tight tracking-[-0.05em] text-text-main">
          Dipercaya Bersama
        </h2>
      </LandingReveal>

      {isLoading ? <div className="mx-auto mt-10 grid max-w-[720px] gap-4 sm:grid-cols-2"><div className="h-32 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" /><div className="h-32 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" /></div> : <LandingSummaryGrid stats={stats} />}

      <SystemDemoVideo />
    </Section>
  );
}
