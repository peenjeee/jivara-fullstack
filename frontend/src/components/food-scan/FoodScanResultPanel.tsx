"use client";

import { AnimatePresence, m } from "motion/react";
import { ScanLine } from "lucide-react";
import { ActivityDataSkeleton } from "@/components/ui/PageSkeletons";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";
import FoodScanAnalysisView from "./FoodScanAnalysisView";

interface FoodScanResultPanelProps {
  readonly analysis: FoodScanAnalysis | null;
  readonly isScanning: boolean;
  readonly result: FoodScanRecord | null;
}

export default function FoodScanResultPanel({ analysis, isScanning, result }: FoodScanResultPanelProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.section className="min-h-[460px] min-w-0 rounded-[32px] bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8" {...getDashboardEntranceMotion(shouldAnimate, 0.16, 22)}>
      <AnimatePresence mode="wait">
        {isScanning ? (
          <m.div key="loading" className="min-h-[420px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-5 space-y-3">
              <div className="h-8 w-72 max-w-full animate-pulse rounded-xl bg-line/70" />
              <div className="h-4 w-96 max-w-full animate-pulse rounded-xl bg-line/60" />
            </div>
            <ActivityDataSkeleton rows={4} />
          </m.div>
        ) : result ? (
          <m.div key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}><FoodScanAnalysisView scanId={result.id} analysisData={analysis ?? undefined} /></m.div>
        ) : (
          <m.div key="empty" className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanLine className="size-14 text-primary" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Belum ada hasil scan</h2>
            <p className="mt-6 max-w-md text-sm font-semibold leading-6 text-muted">Arahkan kamera ke makanan lalu klik “Scan Sekarang” atau upload gambar untuk melihat hasil deteksi, analisis AI, dan rekomendasi.</p>
          </m.div>
        )}
      </AnimatePresence>
    </m.section>
  );
}
