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

const getPublicStatsUrl = () => {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001/api/v1/public/stats";
  }
  return "/api/v1/public/stats";
};

const publicStatsCacheTtl = 60_000;
let publicStatsCache: { data: PublicStatsResponse; expiresAt: number } | null = null;
let publicStatsRequest: Promise<PublicStatsResponse> | null = null;

const fetchPublicStats = async () => {
  const now = Date.now();
  if (publicStatsCache && publicStatsCache.expiresAt > now) return publicStatsCache.data;
  if (publicStatsRequest) return publicStatsRequest;

  publicStatsRequest = (async () => {
    try {
      const response = await fetch(getPublicStatsUrl(), { cache: "no-store" });
      if (!response.ok) throw new Error("PUBLIC_STATS_FAILED");
      const data = await response.json() as PublicStatsResponse;
      publicStatsCache = { data, expiresAt: Date.now() + publicStatsCacheTtl };
      return data;
    } catch {
      // fallback: try the other URL in case of proxy mismatch
      const fallbackUrl = getPublicStatsUrl().includes("localhost")
        ? "/api/v1/public/stats"
        : "https://api.jivara.web.id/api/v1/public/stats";
      const response = await fetch(fallbackUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("PUBLIC_STATS_FAILED");
      const data = await response.json() as PublicStatsResponse;
      publicStatsCache = { data, expiresAt: Date.now() + publicStatsCacheTtl };
      return data;
    }
  })().finally(() => {
    publicStatsRequest = null;
  });

  return publicStatsRequest;
};

export default function Stats() {
  const [stats, setStats] = useState<SummaryCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchPublicStats()
      .then((response) => {
        if (!isMounted) return;
        const { totalNurses, totalPatients } = response.data;
        setHasError(false);
        setStats([
          {
            label: "Total Semua Perawat",
            value: `+${totalNurses}`,
            helper: "",
            tone: "safe",
            color: "emerald",
            icon: HeartPulse,
          },
          {
            label: "Total Semua Pasien",
            value: `+${totalPatients}`,
            helper: "",
            tone: "safe",
            color: "leaf",
            icon: UsersRound,
          },
        ]);
      })
      .catch(() => {
        if (isMounted) {
          setHasError(true);
          setStats([]);
        }
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

      {isLoading && <LandingStatsSkeleton />}
      {!isLoading && !hasError && <LandingSummaryGrid stats={stats} />}
      {!isLoading && hasError && (
        <div className="mx-auto mt-8 max-w-xl rounded-[28px] bg-white px-6 py-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold leading-6 text-muted">Statistik publik belum bisa dimuat.</p>
        </div>
      )}

      <SystemDemoVideo />
    </Section>
  );
}

function LandingStatsSkeleton() {
  return (
    <section className="mx-auto mt-10 grid w-full max-w-[680px] grid-cols-2 items-stretch justify-items-center gap-4 lg:mt-12">
      {["nurses", "patients"].map((item) => (
        <div key={item} className="h-36 w-full max-w-[320px] animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="h-full rounded-[28px] bg-surface/70" />
        </div>
      ))}
    </section>
  );
}
