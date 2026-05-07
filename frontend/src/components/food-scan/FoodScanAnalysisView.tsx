"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { BrainCircuit, Clock, Pill, ShieldAlert } from "lucide-react";
import DetailItem from "@/components/ui/DetailItem";
import { getFoodScanAnalysis, type FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanRisk } from "@/lib/mocks/foodScans";
import { patients } from "@/lib/mocks/patients";

interface FoodScanAnalysisViewProps {
  readonly scanId: string;
  readonly imageSizes?: string;
  readonly analysisData?: FoodScanAnalysis;
}

const riskTextClass: Record<FoodScanRisk, string> = {
  "Low Risk": "text-leaf",
  "High Risk": "text-danger",
};

export default function FoodScanAnalysisView({ scanId, imageSizes = "(max-width: 1280px) 100vw, 620px", analysisData }: FoodScanAnalysisViewProps) {
  const analysis = analysisData ?? getFoodScanAnalysis(scanId);
  const patient = analysis ? patients.find((currentPatient) => currentPatient.id === analysis.scan.patientId) : null;

  if (!analysis) return null;

  return (
    <div className="space-y-5">
      <FoodScanHero scan={analysis.scan} risk={analysis.overallRisk} imageSizes={imageSizes} />

      <motion.div className="grid gap-3 sm:grid-cols-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}>
        <DetailItem label="Pasien" value={patient?.name ?? "Tidak diketahui"} />
        <DetailItem label="Waktu Scan" value={formatScanTime(analysis.scan.scannedAt)} />
        <DetailItem label="Obat Dianalisis" value={`${analysis.interactions.length} obat`} />
      </motion.div>

      <FoodInsightCard icon={<BrainCircuit size={20} />} title="AI Reasoning" text={analysis.scan.aiReasoning} risk={analysis.overallRisk} delay={0.12} />

      <InteractionAnalysisCard interactions={analysis.interactions} />

      <FoodInsightCard icon={<Clock size={20} />} title="Rekomendasi Umum" text={analysis.scan.recommendation} risk={analysis.overallRisk} delay={0.24} />
    </div>
  );
}

function FoodScanHero({ scan, risk, imageSizes }: { readonly scan: NonNullable<ReturnType<typeof getFoodScanAnalysis>>["scan"]; readonly risk: FoodScanRisk; readonly imageSizes: string }) {
  return (
    <motion.section className="overflow-hidden rounded-3xl bg-surface" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
      <div className="relative aspect-video overflow-hidden rounded-3xl bg-line">
        <Image src={scan.image} alt={scan.foodName} fill sizes={imageSizes} className="object-cover" unoptimized={scan.image.startsWith("http")} />
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-11 w-8 shrink-0 items-start justify-center pt-0.5 ${riskTextClass[risk]}`}>
            <ShieldAlert size={20} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-leaf">Scan Makanan</span>
              <span className="text-xs font-extrabold text-line">-</span>
              <span className={`text-xs font-extrabold ${riskTextClass[risk]}`}>{risk}</span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">{scan.foodName}</h3>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function InteractionAnalysisCard({ interactions }: { readonly interactions: NonNullable<ReturnType<typeof getFoodScanAnalysis>>["interactions"] }) {
  return (
    <motion.section className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>
      <div className="mb-5 flex items-center gap-3">
        <Pill size={20} className="text-primary" />
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">Analisis Interaksi Obat</h3>
      </div>

      <div className="space-y-3">
        {interactions.map((interaction) => (
          <article key={interaction.schedule.id} className="rounded-3xl bg-surface p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-extrabold ${riskTextClass[interaction.risk]}`}>{interaction.risk}</span>
                  <span className="text-xs font-extrabold text-line">-</span>
                  <span className="text-xs font-extrabold text-muted">{interaction.schedule.mealRule}</span>
                </div>
                <h4 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{interaction.schedule.medicineName}</h4>
                <p className="mt-1 text-sm font-bold text-muted">{interaction.schedule.dose} • {interaction.schedule.frequency}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-muted">{interaction.reasoning}</p>
            <p className={`mt-3 border-l-4 pl-4 text-sm font-bold leading-6 text-text-main ${interaction.risk === "High Risk" ? "border-danger" : "border-leaf"}`}>{interaction.recommendation}</p>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

function FoodInsightCard({ icon, title, text, risk, delay }: { readonly icon: ReactNode; readonly title: string; readonly text: string; readonly risk: FoodScanRisk; readonly delay: number }) {
  return (
    <motion.section className={`rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${risk === "High Risk" ? "border-l-4 border-danger" : "border-l-4 border-leaf"}`} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay }}>
      <div className="mb-3 flex items-center gap-3">
        <span className={riskTextClass[risk]}>{icon}</span>
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h3>
      </div>
      <p className="text-sm font-semibold leading-6 text-muted">{text}</p>
    </motion.section>
  );
}

function formatScanTime(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
