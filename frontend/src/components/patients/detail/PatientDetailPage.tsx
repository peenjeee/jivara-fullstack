"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Bell, ClipboardList, TrendingUp } from "lucide-react";
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

const patientDetailViewCache = new Map<string, PatientDetailData>();

export default function PatientDetailPage({ data, patientId }: PatientDetailPageProps) {
  const cacheKey = patientId ?? data.patient.id;
  const [detail, setDetail] = useState(() => ({
    data: patientDetailViewCache.get(cacheKey) ?? data,
    loaded: !(Boolean(patientId) && !patientDetailViewCache.has(cacheKey)),
  }));
  const { data: detailData, loaded: isLoaded } = detail;
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!patientId) return;

    let isMounted = true;
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;

    getPatientDetailFromApi(patientId)
      .then((nextData) => {
        if (!isMounted || requestSeq !== requestSeqRef.current) return;
        patientDetailViewCache.set(cacheKey, nextData);
        setDetail({ data: nextData, loaded: true });
      })
      .catch(() => {
        if (isMounted && requestSeq === requestSeqRef.current) setDetail((prev) => ({ ...prev, loaded: true }));
      });

    return () => {
      isMounted = false;
    };
  }, [cacheKey, data, patientId]);

  useEffect(() => {
    if (!patientId) return;

    const handleScheduleChanged = (event: Event) => {
      const patientIds = (event as CustomEvent<{ patientIds?: string[] }>).detail?.patientIds;
      if (patientIds && patientIds.length > 0 && !patientIds.includes(patientId)) return;

      const requestSeq = requestSeqRef.current + 1;
      requestSeqRef.current = requestSeq;
      getPatientDetailFromApi(patientId, { forceRefresh: true })
        .then((nextData) => {
          if (requestSeq !== requestSeqRef.current) return;
          patientDetailViewCache.set(cacheKey, nextData);
          setDetail({ data: nextData, loaded: true });
        })
        .catch(() => undefined);
    };

    window.addEventListener("jivara:schedule-changed", handleScheduleChanged);
    return () => window.removeEventListener("jivara:schedule-changed", handleScheduleChanged);
  }, [cacheKey, patientId]);

  const summary = getPatientSummary(detailData);
  const stats = [
    {
      label: "Kepatuhan Pasien",
      value: `${detailData.patient.adherence}%`,
      tone: detailData.patient.adherence >= 80 ? "safe" : detailData.patient.adherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: TrendingUp,
      progress: detailData.patient.adherence,
    },
    {
      label: "Total Obat Pasien",
      value: String(summary.totalMedicineCount),
      tone: "safe",
      color: "leaf",
      icon: ClipboardList,
    },
    {
      label: "Reminder Obat Aktif",
      value: String(summary.activeReminderCount),
      tone: "safe",
      color: "lime",
      icon: Bell,
    },
  ] as const;

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Detail Pasien"
    
      />

      {!isLoaded ? <DetailDataSkeleton summaryCount={3} /> : <>
      <PatientProfileHero patient={detailData.patient} />
      <SummaryCardGrid stats={stats} />

      <div className="mt-6 space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
          <div className="min-w-0">
            <PatientMedicineList schedules={detailData.schedules} />
          </div>
          <div className="min-w-0">
            <PatientActivityDistributionChart distribution={detailData.activityDistribution} />
          </div>
        </div>

        <PatientAdherenceChart patient={detailData.patient} schedules={detailData.schedules} />

        <div className="grid gap-6 xl:grid-cols-2">
          <PatientFoodScanPanel scans={detailData.scans} patientName={detailData.patient.name} />
          <PatientRecentActivity activities={detailData.activities} patientName={detailData.patient.name} />
        </div>
      </div>
      </>}
    </DashboardPageShell>
  );
}
