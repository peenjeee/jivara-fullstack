"use client";

import Image from "next/image";
import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { Apple, BrainCircuit, Pill, ShieldAlert, Utensils } from "lucide-react";
import DetailItem from "@/components/ui/DetailItem";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { FoodScanRisk } from "@/lib/mocks/foodScans";

interface FoodScanAnalysisViewProps {
  readonly scanId: string;
  readonly imageSizes?: string;
  readonly analysisData?: FoodScanAnalysis;
}

const riskTextClass: Record<FoodScanRisk, string> = {
  "Low Risk": "text-leaf",
  "High Risk": "text-danger",
};

const defaultMedicalDisclaimer = "Ini bukan nasihat medis. Selalu konsultasikan dengan dokter atau apoteker Anda.";

export default function FoodScanAnalysisView({ scanId, imageSizes = "(max-width: 1280px) 100vw, 620px", analysisData }: FoodScanAnalysisViewProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const analysis = analysisData?.scan.id === scanId ? analysisData : null;

  if (!analysis) return null;

  const analyzedMedicationCount = analysis.analyzedMedicationCount ?? analysis.analyzedMedications?.length ?? analysis.interactions.length;

  return (
    <div className="space-y-5">
      <FoodScanHero scan={analysis.scan} risk={analysis.overallRisk} imageSizes={imageSizes} shouldAnimate={shouldAnimate} />

      <m.div className="grid gap-3 sm:grid-cols-3" {...getDashboardEntranceMotion(shouldAnimate, 0.06, 16)}>
        <DetailItem label="Pasien" value={analysis.patientName ?? "Tidak diketahui"} />
        <DetailItem label="Waktu Scan" value={formatScanTime(analysis.scan.scannedAt)} />
        <DetailItem label="Obat Dianalisis" value={`${analyzedMedicationCount} obat`} />
      </m.div>

      <FoodInsightCard icon={<BrainCircuit size={20} />} title="AI Detection & Reasoning" text={analysis.scan.aiReasoning} risk={analysis.overallRisk} delay={0.12} shouldAnimate={shouldAnimate} />

      <InteractionAnalysisCard interactions={analysis.interactions} analyzedMedications={analysis.analyzedMedications ?? []} safeFoods={analysis.safeFoods ?? []} disclaimer={analysis.disclaimer} shouldAnimate={shouldAnimate} />

      <NutritionCard items={analysis.nutritionItems ?? []} total={analysis.nutritionTotal} shouldAnimate={shouldAnimate} />

      <RecommendationCard recommendedFoods={analysis.recommendedFoods ?? []} foodsToAvoid={analysis.foodsToAvoid ?? []} safeFoods={analysis.safeFoods ?? []} shouldAnimate={shouldAnimate} />
    </div>
  );
}

function FoodScanHero({ scan, risk, imageSizes, shouldAnimate }: { readonly scan: FoodScanAnalysis["scan"]; readonly risk: FoodScanRisk; readonly imageSizes: string; readonly shouldAnimate: boolean }) {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageWidth = imageDimensions?.width ?? 1280;
  const imageHeight = imageDimensions?.height ?? 1280;

  return (
    <m.section className="overflow-hidden rounded-3xl bg-surface" {...getDashboardEntranceMotion(shouldAnimate, 0, 16)}>
      <div data-food-scan-result-image-frame className="mx-auto w-full max-w-[520px] overflow-hidden rounded-3xl bg-black/5">
        <Image
          src={scan.image}
          alt={scan.foodName}
          width={imageWidth}
          height={imageHeight}
          sizes={imageSizes}
          className="h-auto max-h-[70vh] w-full object-contain"
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
            }
          }}
        />
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
    </m.section>
  );
}

function NutritionCard({ items, total, shouldAnimate }: { readonly items: NonNullable<FoodScanAnalysis["nutritionItems"]>; readonly total?: FoodScanAnalysis["nutritionTotal"]; readonly shouldAnimate: boolean }) {
  if (items.length === 0 && !total) return null;

  const metrics = total ? [
    { label: "Kalori", value: `${Math.round(total.calories)} kkal` },
    { label: "Protein", value: `${total.proteinG.toFixed(1)} g` },
    { label: "Lemak", value: `${total.fatG.toFixed(1)} g` },
    { label: "Karbo", value: `${total.carbsG.toFixed(1)} g` },
  ] : [];

  return (
    <m.section className="space-y-5" {...getDashboardEntranceMotion(shouldAnimate, 0.22, 18)}>
      <div className="mb-5 flex items-center gap-3">
        <Utensils size={20} className="text-primary" />
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">Estimasi Nutrisi</h3>
      </div>

      {metrics.length > 0 && <div className="grid gap-3 sm:grid-cols-4">{metrics.map((metric) => <DetailItem key={metric.label} label={metric.label} value={metric.value} />)}</div>}

      {items.length > 0 && (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <article key={`${item.foodItem}-${item.portion}`} className="rounded-3xl bg-surface p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h4 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{item.foodDisplay}</h4>
                  <p className="mt-1 text-sm font-bold text-muted">{item.portion} • {item.source}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-primary">{Math.round(item.nutrition.calories)} kkal</span>
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-muted">Protein {item.nutrition.proteinG.toFixed(1)}g, lemak {item.nutrition.fatG.toFixed(1)}g, karbohidrat {item.nutrition.carbsG.toFixed(1)}g.</p>
            </article>
          ))}
        </div>
      )}
    </m.section>
  );
}

type FoodRecommendationItem = NonNullable<FoodScanAnalysis["recommendedFoods"]>[number];

function RecommendationCard({ recommendedFoods, foodsToAvoid, safeFoods, shouldAnimate }: { readonly recommendedFoods: NonNullable<FoodScanAnalysis["recommendedFoods"]>; readonly foodsToAvoid: NonNullable<FoodScanAnalysis["foodsToAvoid"]>; readonly safeFoods: NonNullable<FoodScanAnalysis["safeFoods"]>; readonly shouldAnimate: boolean }) {
  const { safeRecommendations, avoidRecommendations } = splitRecommendationsByRisk(recommendedFoods, foodsToAvoid);
  const showsSafeFallback = safeRecommendations.length === 0 && safeFoods.length > 0;
  const showsAvoidSection = avoidRecommendations.length > 0 || safeRecommendations.length > 0 || showsSafeFallback;
  const visibleSectionCount = Number(safeRecommendations.length > 0) + Number(showsSafeFallback) + Number(showsAvoidSection);

  if (safeRecommendations.length === 0 && avoidRecommendations.length === 0 && safeFoods.length === 0) return null;

  return (
    <m.section className="space-y-5" {...getDashboardEntranceMotion(shouldAnimate, 0.26, 18)}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
        <Apple size={20} className="text-primary" />
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">Rekomendasi AI</h3>
        </div>
      </div>

      <div className={`grid gap-4 ${visibleSectionCount > 1 ? "lg:grid-cols-2" : ""}`}>
        {safeRecommendations.length > 0 && <FoodScoreList title="Makanan Aman" items={safeRecommendations} tone="safe" />}
        {showsSafeFallback && <SafeFoodList items={safeFoods} />}
        {showsAvoidSection && <FoodScoreList title="Perlu Dibatasi" items={avoidRecommendations} tone="avoid" emptyMessage="Tidak ada makanan yang perlu dihindari. Namun selalu konsultasikan dengan dokter atau apoteker Anda." />}
      </div>
    </m.section>
  );
}

function FoodScoreList({ title, items, tone, emptyMessage }: { readonly title: string; readonly items: readonly FoodRecommendationItem[]; readonly tone: "safe" | "avoid"; readonly emptyMessage?: string }) {
  const countClass = tone === "safe" ? "bg-leaf/10 text-leaf" : "bg-danger/10 text-danger";
  const rowClass = tone === "safe" ? "bg-leaf/10 text-leaf" : "bg-danger/10 text-danger";

  return (
    <div className="min-h-0 rounded-3xl bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h4>
        <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] ${countClass}`}>{items.length}</span>
      </div>
      <div
        className="mt-3 h-72 min-h-0 space-y-2 overflow-y-scroll overscroll-contain pr-1 sm:h-80"
        data-lenis-prevent
        data-lenis-prevent-wheel
        data-lenis-prevent-touch
      >
        {items.length === 0 && emptyMessage && (
          <div className="flex h-full items-center rounded-2xl bg-white/70 px-4 py-5 text-sm font-bold leading-6 text-muted">
            {emptyMessage}
          </div>
        )}
        {items.map((item) => (
          <div key={`${title}-${item.foodName}`} className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${rowClass}`}>
            <span className="min-w-0 break-words text-sm font-extrabold leading-5">{formatFoodName(item.foodName)}</span>
            <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-center text-[10px] font-extrabold uppercase tracking-[0.06em]">{formatRiskLabel(item.riskLevel)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function splitRecommendationsByRisk(recommendedFoods: readonly FoodRecommendationItem[], foodsToAvoid: readonly FoodRecommendationItem[]) {
  const byName = new Map<string, FoodRecommendationItem>();

  [...recommendedFoods, ...foodsToAvoid].forEach((item) => {
    const key = getRecommendationKey(item);
    const existing = byName.get(key);
    if (!existing || item.severityScore > existing.severityScore) byName.set(key, item);
  });

  const safeRecommendations: FoodRecommendationItem[] = [];
  const avoidRecommendations: FoodRecommendationItem[] = [];

  byName.forEach((item) => {
    if (isSafeRecommendation(item)) {
      safeRecommendations.push(item);
    } else {
      avoidRecommendations.push(item);
    }
  });

  return { safeRecommendations, avoidRecommendations };
}

function getRecommendationKey(item: FoodRecommendationItem) {
  return item.foodName.trim().toLowerCase();
}

function isSafeRecommendation(item: FoodRecommendationItem) {
  const risk = item.riskLevel.trim().toLowerCase();
  if (["aman", "ringan", "rendah", "safe", "low", "low risk"].includes(risk)) return true;
  if (["sedang", "menengah", "moderate", "medium", "tinggi", "high", "high risk", "kritis", "critical"].includes(risk)) return false;
  return item.severityScore <= 1;
}

function formatFoodName(value: string) {
  return value.replace(/-/g, " ");
}

function formatRiskLabel(value: string) {
  return value.replace(/_/g, " ").replace(/-/g, " ");
}

function SafeFoodList({ items }: { readonly items: NonNullable<FoodScanAnalysis["safeFoods"]> }) {
  return (
    <div className="rounded-3xl bg-surface p-4">
      <h4 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Makanan Terdeteksi Aman</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={`safe-${item.foodItem}`} className="rounded-full bg-leaf/10 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-leaf">
            {item.foodDisplay} • {item.status}
          </span>
        ))}
      </div>
    </div>
  );
}

function InteractionAnalysisCard({ interactions, analyzedMedications, safeFoods, disclaimer, shouldAnimate }: { readonly interactions: FoodScanAnalysis["interactions"]; readonly analyzedMedications: NonNullable<FoodScanAnalysis["analyzedMedications"]>; readonly safeFoods: NonNullable<FoodScanAnalysis["safeFoods"]>; readonly disclaimer?: string; readonly shouldAnimate: boolean }) {
  const disclaimerText = disclaimer?.trim() || defaultMedicalDisclaimer;

  return (
    <m.section className="space-y-5" {...getDashboardEntranceMotion(shouldAnimate, 0.18, 18)}>
      <div className="mb-5 flex items-center gap-3">
        <Pill size={20} className="text-primary" />
        <h3 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">Analisis Interaksi Obat</h3>
      </div>

      {interactions.length === 0 ? (
        <article className="rounded-3xl bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-leaf">AMAN</span>
            <span className="text-xs font-extrabold text-line">-</span>
            <span className="text-xs font-extrabold text-muted">Analisis selesai</span>
          </div>
          <h4 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Tidak ada interaksi obat yang signifikan</h4>
          <p className="mt-3 text-sm font-semibold leading-6 text-muted">
            {analyzedMedications.length > 0
              ? `Makanan terdeteksi telah dibandingkan dengan obat aktif pasien: ${analyzedMedications.join(", ")}.`
              : "Makanan terdeteksi telah dianalisis dan tidak menunjukkan interaksi obat yang signifikan."}
          </p>
          {safeFoods.length > 0 && <p className="mt-3 text-sm font-bold leading-6 text-text-main">Makanan aman terdeteksi: {safeFoods.map((item) => item.foodDisplay).join(", ")}.</p>}
        </article>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction) => (
            <article key={`food-interaction-${interaction.schedule.id}`} className="rounded-3xl bg-surface p-4">
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
      )}

      {disclaimerText && (
        <p className="mt-4 rounded-3xl bg-surface px-4 py-3 text-sm font-semibold leading-6 text-muted">
          {disclaimerText}
        </p>
      )}
    </m.section>
  );
}

function FoodInsightCard({ icon, title, text, risk, delay, shouldAnimate }: { readonly icon: ReactNode; readonly title: string; readonly text: string; readonly risk: FoodScanRisk; readonly delay: number; readonly shouldAnimate: boolean }) {
  return (
    <m.section className="rounded-3xl border-0 bg-surface p-5 shadow-none !border-l-0" {...getDashboardEntranceMotion(shouldAnimate, delay, 18)}>
      <div className="mb-3 flex items-center gap-3">
        <span className={riskTextClass[risk]}>{icon}</span>
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h3>
      </div>
      <p className="text-sm font-semibold leading-6 text-muted">{text}</p>
    </m.section>
  );
}

function formatScanTime(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
