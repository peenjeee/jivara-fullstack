"use client";

import dynamic from "next/dynamic";
import { Bell, ClipboardList, Siren, TrendingUp } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { PatientDetailData } from "@/helpers/patientDetails";
import { getPatientSummary } from "@/helpers/patientDetails";
import PatientFoodScanPanel from "./PatientFoodScanPanel";
import PatientMedicineList from "./PatientMedicineList";
import PatientProfileHero from "./PatientProfileHero";
import PatientRecentActivity from "./PatientRecentActivity";

const PatientAdherenceChart = dynamic(() => import("./PatientAdherenceChart"), { ssr: false });
const PatientActivityDistributionChart = dynamic(() => import("./PatientActivityDistributionChart"), { ssr: false });

interface PatientDetailPageProps {
  readonly data: PatientDetailData;
}

export default function PatientDetailPage({ data }: PatientDetailPageProps) {
  const summary = getPatientSummary(data);
  const stats = [
    {
      label: "Kepatuhan",
      value: `${data.patient.adherence}%`,
      tone: data.patient.adherence >= 80 ? "safe" : data.patient.adherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: TrendingUp,
      progress: data.patient.adherence,
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

      <PatientProfileHero patient={data.patient} />
      <SummaryCardGrid stats={stats} className="xl:!grid-cols-4" />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <div className="min-w-0 space-y-6">
          <PatientAdherenceChart patient={data.patient} />
          <PatientMedicineList schedules={data.schedules} />
        </div>

        <div className="min-w-0 space-y-6">
          <PatientActivityDistributionChart activities={data.activities} />
          <PatientFoodScanPanel scans={data.scans} patientName={data.patient.name} />
          <PatientRecentActivity activities={data.activities} patientName={data.patient.name} />
        </div>
      </div>
    </DashboardPageShell>
  );
}
