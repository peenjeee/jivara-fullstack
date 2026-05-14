"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Bell, ClipboardList, Siren, TrendingUp } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { DetailDataSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { PatientDetailData } from "@/helpers/patientDetails";
import { getPatientSummary } from "@/helpers/patientDetails";
import { getPatientDetailFromApi } from "@/lib/patientApi";
import PatientFoodScanPanel from "./PatientFoodScanPanel";
import PatientMedicineList from "./PatientMedicineList";
import PatientProfileHero from "./PatientProfileHero";
import PatientRecentActivity from "./PatientRecentActivity";

const chartFallback = () => <div className="h-80 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />;
const PatientAdherenceChart = dynamic(() => import("./PatientAdherenceChart"), { ssr: false, loading: chartFallback });
const PatientActivityDistributionChart = dynamic(() => import("./PatientActivityDistributionChart"), { ssr: false, loading: chartFallback });

interface PatientDetailPageProps {
  readonly data: PatientDetailData;
  readonly patientId?: string;
}

export default function PatientDetailPage({ data, patientId }: PatientDetailPageProps) {
  const [detailData, setDetailData] = useState(data);
  const [isLoading, setIsLoading] = useState(Boolean(patientId));

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;

    getPatientDetailFromApi(patientId)
      .then((nextData) => {
        if (isMounted) setDetailData(nextData);
      })
      .catch(() => {
        if (isMounted) setDetailData(data);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [data, patientId]);

  const summary = getPatientSummary(detailData);
  const stats = [
    {
      label: "Kepatuhan",
      value: `${detailData.patient.adherence}%`,
      tone: detailData.patient.adherence >= 80 ? "safe" : detailData.patient.adherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: TrendingUp,
      progress: detailData.patient.adherence,
    },
    {
      label: "Obat Aktif",
      value: String(summary.activeMedicineCount),
      tone: "safe",
      color: "leaf",
      icon: ClipboardList,
    },
    {
      label: "Reminder Aktif",
      value: String(summary.activeReminderCount),
      tone: "safe",
      color: "lime",
      icon: Bell,
    },
    {
      label: "Aktivitas Kritis",
      value: String(summary.criticalActivityCount),
      tone: summary.criticalActivityCount > 0 ? "critical" : "safe",
      color: summary.criticalActivityCount > 0 ? "danger" : "primary",
      icon: Siren,
    },
  ] as const;

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Detail Pasien"
    
      />

      {isLoading ? <DetailDataSkeleton /> : <>
      <PatientProfileHero patient={detailData.patient} />
      <SummaryCardGrid stats={stats} className="xl:!grid-cols-4" />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <PatientMedicineList schedules={detailData.schedules} />
          <PatientAdherenceChart patient={detailData.patient} />
        </div>

        <div className="min-w-0 space-y-6">
          <PatientActivityDistributionChart activities={detailData.activities} />
          <PatientFoodScanPanel scans={detailData.scans} patientName={detailData.patient.name} />
          <PatientRecentActivity activities={detailData.activities} patientName={detailData.patient.name} />
        </div>
      </div>
      </>}
    </DashboardPageShell>
  );
}
