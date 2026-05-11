"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, ScanLine } from "lucide-react";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";
import FoodScanAnalysisView from "./FoodScanAnalysisView";

interface FoodScanResultPanelProps {
  readonly analysis: FoodScanAnalysis | null;
  readonly isScanning: boolean;
  readonly result: FoodScanRecord | null;
}

export default function FoodScanResultPanel({ analysis, isScanning, result }: FoodScanResultPanelProps) {
  return (
    <motion.section className="min-h-[460px] rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.16 }}>
      <AnimatePresence mode="wait">
        {isScanning ? (
          <motion.div key="loading" className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">AI sedang menganalisis</h2>
            <p className="mt-3 max-w-md text-sm font-semibold leading-6 text-muted">Menganalisis makanan, mencocokkan jadwal obat aktif, dan menyusun rekomendasi.</p>
          </motion.div>
        ) : result ? (
          <motion.div key="result" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}><FoodScanAnalysisView scanId={result.id} analysisData={analysis ?? undefined} /></motion.div>
        ) : (
          <motion.div key="empty" className="flex h-full min-h-[420px] flex-col items-center justify-center gap-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ScanLine className="h-14 w-14 text-primary" />
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Belum ada hasil scan</h2>
            <p className="mt-6 max-w-md text-sm font-semibold leading-6 text-muted">Arahkan kamera ke makanan lalu klik “Scan Sekarang” untuk melihat hasil deteksi, analisis AI, dan rekomendasi.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
