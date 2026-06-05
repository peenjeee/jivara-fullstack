"use client";

import Image from "next/image";
import { m } from "motion/react";
import { useState, type ReactNode } from "react";
import { Apple, BrainCircuit, Pill, ShieldAlert, Utensils } from "lucide-react";
import DetailItem from "@/components/ui/DetailItem";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { FoodScanBoundingBox, FoodScanDetectedItem, FoodScanRisk } from "@/lib/mocks/foodScans";

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

const detectionBoxColors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

const formatMedicineInfo = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "[]") return "Tidak ada";

  try {
    const parsed = JSON.parse(trimmed.replaceAll("'", '"')) as unknown;
    if (Array.isArray(parsed)) {
      const items = parsed.flatMap((item) => {
        const text = String(item).trim();
        return text ? [text] : [];
      });
      return items.length > 0 ? items.join(", ") : "Tidak ada";
    }
  } catch {
    // keep raw value when it is not JSON-like.
  }

  return trimmed;
};

const cleanAiText = (value: string) => value
  .replace(/\s*(?:AI service tidak memberikan|Tidak ada) rekomendasi makanan(?: pengganti)?(?: dari AI service)?[^.?!]*(?:[.?!]|$)/gi, " ")
  .replace(/^\s*(?:hai|halo|hello|hi)\b(?:\s+(?:semua|dok|pasien|anda))?\s*[!,.:;-]?\s*/i, "")
  .replace(/\bAI service\b/gi, "Jivara Interaction Check")
  .replace(/\*/g, "")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/[ \t]+\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .replace(/[ \t]{2,}/g, " ")
  .trim();


export default function FoodScanAnalysisView({ scanId, imageSizes = "(max-width: 1280px) 100vw, 620px", analysisData }: FoodScanAnalysisViewProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const analysis = analysisData?.scan.id === scanId ? analysisData : null;

  if (!analysis) return null;

  const analyzedMedicationCount = analysis.analyzedMedicationCount ?? analysis.analyzedMedications?.length ?? analysis.interactions.length;
  const hasDetectedFood = analysis.scan.hasDetectedFood !== false;
  const hasHighRiskInteraction = analysis.overallRisk === "High Risk" || analysis.interactions.some((interaction) => interaction.risk === "High Risk");

  return (
    <div className="space-y-5">
      <FoodScanHero scan={analysis.scan} risk={analysis.overallRisk} imageSizes={imageSizes} shouldAnimate={shouldAnimate} />

      <m.div className="grid gap-3 sm:grid-cols-3" {...getDashboardEntranceMotion(shouldAnimate, 0.06, 16)}>
        <DetailItem label="Pasien" value={analysis.patientName ?? "Tidak diketahui"} />
        <DetailItem label="Waktu Scan" value={formatScanTime(analysis.scan.scannedAt)} />
        <DetailItem label="Obat Dianalisis" value={`${analyzedMedicationCount} obat`} />
      </m.div>

      <FoodInsightCard icon={<BrainCircuit size={20} />} title="Deteksi Makanan" text={analysis.scan.aiReasoning} risk={analysis.overallRisk} hasDetectedFood={hasDetectedFood} delay={0.12} shouldAnimate={shouldAnimate} />

      {hasDetectedFood && <InteractionAnalysisCard interactions={analysis.interactions} analyzedMedications={analysis.analyzedMedications ?? []} analyzedMedicationDetails={analysis.analyzedMedicationDetails ?? []} safeFoods={analysis.safeFoods ?? []} overallRecommendation={analysis.scan.recommendation} disclaimer={analysis.disclaimer} shouldAnimate={shouldAnimate} />}

      <NutritionCard items={analysis.nutritionItems ?? []} total={analysis.nutritionTotal} shouldAnimate={shouldAnimate} />

      <RecommendationCard recommendedFoods={analysis.recommendedFoods ?? []} foodsToAvoid={analysis.foodsToAvoid ?? []} shouldShow={hasHighRiskInteraction} shouldAnimate={shouldAnimate} />
    </div>
  );
}

function FoodScanHero({ scan, risk, imageSizes, shouldAnimate }: { readonly scan: FoodScanAnalysis["scan"]; readonly risk: FoodScanRisk; readonly imageSizes: string; readonly shouldAnimate: boolean }) {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const imageWidth = imageDimensions?.width ?? 1280;
  const imageHeight = imageDimensions?.height ?? 1280;
  const hasDetectedFood = scan.hasDetectedFood !== false;
  const statusLabel = hasDetectedFood ? risk : "Tidak Terdeteksi";
  const statusClass = hasDetectedFood ? riskTextClass[risk] : "text-muted";

  return (
    <m.section className="overflow-hidden rounded-3xl bg-surface" {...getDashboardEntranceMotion(shouldAnimate, 0, 16)}>
      <div data-food-scan-result-image-frame className="relative mx-auto w-full max-w-[520px] overflow-hidden rounded-3xl bg-black/5">
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
        {imageDimensions && <DetectionOverlay items={scan.detectedItems ?? []} imageWidth={imageWidth} imageHeight={imageHeight} />}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`inline-flex h-11 w-8 shrink-0 items-start justify-center pt-0.5 ${statusClass}`}>
            <ShieldAlert size={20} strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-leaf">Scan Makanan</span>
              <span className="text-xs font-extrabold text-line">-</span>
              <span className={`text-xs font-extrabold ${statusClass}`}>{statusLabel}</span>
            </div>
            <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">{scan.foodName}</h3>
          </div>
        </div>
      </div>
    </m.section>
  );
}

type FlexibleFoodScanBoundingBox = FoodScanBoundingBox & {
  readonly cx?: number;
  readonly cy?: number;
  readonly centerX?: number;
  readonly centerY?: number;
  readonly xCenter?: number;
  readonly yCenter?: number;
  readonly x_center?: number;
  readonly y_center?: number;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly image_width?: number;
  readonly image_height?: number;
  readonly coordinateWidth?: number;
  readonly coordinateHeight?: number;
  readonly coordinate_width?: number;
  readonly coordinate_height?: number;
};

const toBoxNumber = (value: unknown) => {
  const numberValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));
const formatPercent = (value: number) => `${Number(clampPercent(value).toFixed(4))}%`;
const parsePercent = (value: string) => Number.parseFloat(value.replace("%", ""));
const getDetectionFoodLabel = (item: FoodScanDetectedItem) => item.labelDisplay?.trim() || formatFoodName(item.label);

function getBoxRect(box: FoodScanBoundingBox, imageWidth: number, imageHeight: number) {
  const flexibleBox = box as FlexibleFoodScanBoundingBox;
  const rawWidth = toBoxNumber(flexibleBox.width);
  const rawHeight = toBoxNumber(flexibleBox.height);
  const rawCenterX = toBoxNumber(flexibleBox.cx ?? flexibleBox.centerX ?? flexibleBox.xCenter ?? flexibleBox.x_center);
  const rawCenterY = toBoxNumber(flexibleBox.cy ?? flexibleBox.centerY ?? flexibleBox.yCenter ?? flexibleBox.y_center);
  const usesCenterPoint = rawCenterX !== undefined && rawCenterY !== undefined && rawWidth !== undefined && rawHeight !== undefined;

  const left = usesCenterPoint
    ? rawCenterX - rawWidth / 2
    : toBoxNumber(flexibleBox.x1 ?? flexibleBox.x) ?? 0;
  const top = usesCenterPoint
    ? rawCenterY - rawHeight / 2
    : toBoxNumber(flexibleBox.y1 ?? flexibleBox.y) ?? 0;
  const right = toBoxNumber(flexibleBox.x2) ?? (rawWidth !== undefined ? left + rawWidth : undefined);
  const bottom = toBoxNumber(flexibleBox.y2) ?? (rawHeight !== undefined ? top + rawHeight : undefined);
  const width = right !== undefined ? right - left : rawWidth ?? 0;
  const height = bottom !== undefined ? bottom - top : rawHeight ?? 0;

  if (width <= 0 || height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null;

  const boxImageWidth = toBoxNumber(flexibleBox.imageWidth ?? flexibleBox.image_width ?? flexibleBox.coordinateWidth ?? flexibleBox.coordinate_width) ?? imageWidth;
  const boxImageHeight = toBoxNumber(flexibleBox.imageHeight ?? flexibleBox.image_height ?? flexibleBox.coordinateHeight ?? flexibleBox.coordinate_height) ?? imageHeight;
  const values = [left, top, right ?? left + width, bottom ?? top + height];
  const usesNormalizedCoordinates = values.every((value) => value >= 0 && value <= 1);
  const toXPercent = (value: number) => usesNormalizedCoordinates ? value * 100 : (value / boxImageWidth) * 100;
  const toYPercent = (value: number) => usesNormalizedCoordinates ? value * 100 : (value / boxImageHeight) * 100;
  const leftPercent = clampPercent(toXPercent(left));
  const topPercent = clampPercent(toYPercent(top));
  const rightPercent = clampPercent(toXPercent(left + width));
  const bottomPercent = clampPercent(toYPercent(top + height));
  const widthPercent = rightPercent - leftPercent;
  const heightPercent = bottomPercent - topPercent;

  if (widthPercent <= 0 || heightPercent <= 0) return null;

  return {
    left: formatPercent(leftPercent),
    top: formatPercent(topPercent),
    width: formatPercent(widthPercent),
    height: formatPercent(heightPercent),
  };
}

function DetectionOverlay({ items, imageWidth, imageHeight }: { readonly items: readonly FoodScanDetectedItem[]; readonly imageWidth: number; readonly imageHeight: number }) {
  const boxes = items.flatMap((item, index) => {
    if (!item.boundingBox) return [];
    const rect = getBoxRect(item.boundingBox, imageWidth, imageHeight);
    if (!rect) return [];
    return [{ item, index, rect }];
  });

  if (boxes.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map(({ item, index, rect }) => {
        const color = detectionBoxColors[index % detectionBoxColors.length];
        const leftPercent = parsePercent(rect.left);
        const topPercent = parsePercent(rect.top);
        const rightPercent = leftPercent + parsePercent(rect.width);
        const alignLabelLeft = !Number.isFinite(leftPercent) || leftPercent < 2;
        const keepLabelInsideTop = Number.isFinite(topPercent) && topPercent < 6;
        const alignLabelRight = Number.isFinite(rightPercent) && rightPercent > 88;
        const horizontalLabelClass = alignLabelRight ? "right-0" : alignLabelLeft ? "left-0" : "-left-0.5";
        const labelClassName = keepLabelInsideTop
          ? `absolute top-0 z-20 max-w-[180px] truncate px-2 py-1 text-[10px] font-black leading-none text-white shadow-sm ${alignLabelRight ? "right-0 rounded-bl-md" : "left-0 rounded-br-md"}`
          : `absolute -top-6 z-20 max-w-[180px] truncate rounded-t-md px-2 py-1 text-[10px] font-black leading-none text-white shadow-sm ${horizontalLabelClass}`;
        const label = getDetectionFoodLabel(item);
        return (
          <div key={`${item.label}-${item.confidence}-${rect.left}-${rect.top}-${rect.width}-${rect.height}`} data-food-detection-box className="absolute border-2" style={{ ...rect, borderColor: color }}>
            <div data-food-detection-label className={labelClassName} title={`${label} ${Math.round(item.confidence * 100)}%`} style={{ backgroundColor: color }}>
              {label} {Math.round(item.confidence * 100)}%
            </div>
          </div>
        );
      })}
    </div>
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
                  <p className="mt-1 text-sm font-bold text-muted">{formatNutritionPortion(item.portion)} • {item.source}</p>
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

function formatNutritionPortion(portion: string) {
  const trimmed = portion.trim();
  return /^100\s*gram$/i.test(trimmed) ? "Estimasi per 100 gram" : `Estimasi per ${trimmed || "porsi"}`;
}

type FoodRecommendationItem = NonNullable<FoodScanAnalysis["recommendedFoods"]>[number];

function RecommendationCard({ recommendedFoods, foodsToAvoid, shouldShow, shouldAnimate }: { readonly recommendedFoods: NonNullable<FoodScanAnalysis["recommendedFoods"]>; readonly foodsToAvoid: NonNullable<FoodScanAnalysis["foodsToAvoid"]>; readonly shouldShow: boolean; readonly shouldAnimate: boolean }) {
  const { safeRecommendations, avoidRecommendations } = splitRecommendationsByRisk(recommendedFoods, foodsToAvoid);
  const showsAvoidSection = avoidRecommendations.length > 0 || safeRecommendations.length > 0;
  const visibleSectionCount = Number(safeRecommendations.length > 0) + Number(showsAvoidSection);

  if (!shouldShow || (safeRecommendations.length === 0 && avoidRecommendations.length === 0)) return null;

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

function InteractionAnalysisCard({ interactions, analyzedMedications, analyzedMedicationDetails, safeFoods, overallRecommendation, disclaimer, shouldAnimate }: { readonly interactions: FoodScanAnalysis["interactions"]; readonly analyzedMedications: NonNullable<FoodScanAnalysis["analyzedMedications"]>; readonly analyzedMedicationDetails: NonNullable<FoodScanAnalysis["analyzedMedicationDetails"]>; readonly safeFoods: NonNullable<FoodScanAnalysis["safeFoods"]>; readonly overallRecommendation?: string; readonly disclaimer?: string; readonly shouldAnimate: boolean }) {
  const overallRecommendationText = overallRecommendation?.trim();
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
          {analyzedMedicationDetails.length > 0 && (
            <div className="mt-4 space-y-2 rounded-2xl bg-white p-3">
              {analyzedMedicationDetails.map((medicine) => (
                <div key={`analyzed-medicine-${medicine.drugName}`} className="rounded-2xl bg-white/70 p-3 text-sm font-semibold leading-6 text-muted">
                  <p className="font-extrabold text-text-main">{medicine.drugName}</p>
                  <p>Komposisi: {formatMedicineInfo(medicine.compositionNormalized)}</p>
                  <p>Zat Aktif: {formatMedicineInfo(medicine.activeSubstances)}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      ) : (
        <div className="space-y-3">
          {interactions.map((interaction, index) => (
            <article key={`food-interaction-${interaction.schedule.id}-${(interaction.foodItem ?? getInteractionFoodDisplay(interaction)) || index}`} className="rounded-3xl bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-extrabold ${riskTextClass[interaction.risk]}`}>{interaction.risk}</span>
                    {getInteractionFoodDisplay(interaction) && (
                      <>
                        <span className="text-xs font-extrabold text-line">-</span>
                        <span className="text-xs font-extrabold text-muted">Dengan {getInteractionFoodDisplay(interaction)}</span>
                      </>
                    )}
                  </div>
                  <h4 className="mt-2 font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{interaction.schedule.medicineName}</h4>
                  <p className="mt-1 text-sm font-bold text-muted">{formatScheduleSummary(interaction.schedule.dose, interaction.schedule.frequency)}</p>
                  <div className="mt-3 rounded-2xl bg-white/70 p-3 text-sm font-semibold leading-6 text-muted">
                    <p>Komposisi: {formatMedicineInfo(interaction.schedule.compositionNormalized)}</p>
                    <p>Zat Aktif: {formatMedicineInfo(interaction.schedule.activeSubstances)}</p>
                  </div>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-line text-justify text-sm font-semibold leading-6 text-muted">{cleanAiText(interaction.reasoning)}</p>
              {interaction.recommendation.trim() && <p className="mt-3 text-justify text-sm font-bold leading-6 text-text-main">{cleanAiText(interaction.recommendation)}</p>}
            </article>
          ))}
        </div>
      )}

      {overallRecommendationText && (
        <article className="rounded-3xl bg-surface p-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-primary">Rekomendasi keseluruhan</p>
          <p className="mt-2 text-justify text-sm font-bold leading-6 text-text-main">{cleanAiText(overallRecommendationText)}</p>
        </article>
      )}

      {disclaimerText && (
        <p className="mt-4 rounded-3xl bg-surface px-4 py-3 text-sm font-semibold leading-6 text-muted">
          {disclaimerText}
        </p>
      )}
    </m.section>
  );
}

function FoodInsightCard({ icon, title, text, risk, hasDetectedFood, delay, shouldAnimate }: { readonly icon: ReactNode; readonly title: string; readonly text: string; readonly risk: FoodScanRisk; readonly hasDetectedFood: boolean; readonly delay: number; readonly shouldAnimate: boolean }) {
  const iconClassName = hasDetectedFood ? riskTextClass[risk] : "text-muted";

  return (
    <m.section className="rounded-3xl border-0 bg-surface p-5 shadow-none !border-l-0" {...getDashboardEntranceMotion(shouldAnimate, delay, 18)}>
      <div className="mb-3 flex items-center gap-3">
        <span className={iconClassName}>{icon}</span>
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h3>
      </div>
      <p className="text-justify text-sm font-semibold leading-6 text-muted">{cleanAiText(text)}</p>
    </m.section>
  );
}

function getInteractionFoodDisplay(interaction: FoodScanAnalysis["interactions"][number]) {
  return interaction.foodDisplay?.trim() || (interaction.foodItem ? formatFoodName(interaction.foodItem) : "");
}

function formatScanTime(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatScheduleSummary(dose: string, frequency: string) {
  const parts = [dose, frequency].map((part) => part.trim()).filter((part) => part && part !== "-");
  return parts.length > 0 ? parts.join(" • ") : "Sesuai jadwal aktif";
}
