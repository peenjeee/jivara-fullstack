"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import PatientDetailSection from "./PatientDetailSection";

interface PatientFoodScanPanelProps {
  readonly scans: readonly FoodScanRecord[];
  readonly patientName: string;
}

const riskClass: Record<FoodScanRisk, string> = {
  "Low Risk": "text-leaf",
  "High Risk": "text-danger",
};

export default function PatientFoodScanPanel({ scans, patientName }: PatientFoodScanPanelProps) {
  const latestScans = scans.slice(0, 5);
  const scanLogHref = `/activity-log?patientName=${encodeURIComponent(patientName)}&category=${encodeURIComponent("Scan Makanan")}`;

  return (
    <PatientDetailSection
      title="Scan Makanan"
      action={(
        <Link href={scanLogHref} prefetch={false} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-text-main transition-colors hover:bg-surface">
          Lihat Semua <ArrowRight size={15} />
        </Link>
      )}
      delay={0.28}
    >
      {latestScans.length > 0 ? (
        <div className="space-y-3">
          {latestScans.map((scan, index) => (
            <article key={`patient-food-scan-${scan.id}-${index}`} className="rounded-3xl bg-surface p-4">
              <div className="flex items-start gap-3">
                <div className={`inline-flex h-11 w-8 shrink-0 items-start justify-center pt-0.5 ${riskClass[scan.risk]}`}>
                  <ShieldAlert size={20} strokeWidth={2.4} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-leaf">Scan Makanan</span>
                    <span className="text-xs font-extrabold text-line">-</span>
                    <span className={`text-xs font-extrabold ${riskClass[scan.risk]}`}>{scan.risk}</span>
                    <span className="text-xs font-extrabold text-line">-</span>
                    <span className="text-xs font-extrabold text-muted">{formatScanTime(scan.scannedAt)}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-extrabold tracking-[-0.04em] text-text-main">{scan.foodName}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-muted">{scan.result}</p>
                  <p className="mt-3 text-sm font-bold leading-6 text-text-main">{scan.recommendation}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada data scan makanan." />
      )}
    </PatientDetailSection>
  );
}

function formatScanTime(value: string) {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
