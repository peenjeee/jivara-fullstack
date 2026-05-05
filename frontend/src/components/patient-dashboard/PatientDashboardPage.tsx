"use client";

import { BellRing, Pill, ShieldCheck } from "lucide-react";
import DashboardNotificationAlerts from "@/components/dashboard/DashboardNotificationAlerts";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getNotificationPatientId } from "@/helpers/notifications";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { patients } from "@/lib/mocks/patients";
import { medicationSchedules } from "@/lib/mocks/schedules";
import { useAuthStore } from "@/store/auth";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";
import PatientAdherenceHeatmap from "./PatientAdherenceHeatmap";

const mockPatient = patients[0];

export default function PatientDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const lastScan = usePatientDashboardStore((state) => state.lastScan);
  const { isSplashFinished } = useSplashScreen();

  if (!isSplashFinished) return null;

  const greeting = getGreeting();
  const patientSchedules = medicationSchedules.filter((schedule) => schedule.patientId === mockPatient.id);
  const activeSchedules = patientSchedules.filter((schedule) => schedule.status === "Aktif");

  const stats: SummaryCardItem[] = [
    {
      label: "Obat Aktif",
      value: `${activeSchedules.length}`,
      tone: "safe",
      color: "leaf",
      icon: Pill,
    },
    {
      label: "Reminder Aktif",
      value: `${activeSchedules.filter((schedule) => schedule.reminderEnabled).length}`,
      tone: lastScan ? "safe" : "warning",
      color: "lime",
      icon: BellRing,
    },
    {
      label: "Kepatuhan Saya",
      value: `${mockPatient.adherence}%`,
      helper: mockPatient.status,
      tone: mockPatient.adherence >= 80 ? "safe" : mockPatient.adherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: ShieldCheck,
      progress: mockPatient.adherence,
    }
  ];

  return (
    <DashboardPageShell>
      <DashboardPageHeader title={`${greeting}, ${mockPatient.name}`} />
      <SummaryCardGrid stats={stats} />
      <DashboardNotificationAlerts patientId={getNotificationPatientId(user)} />

      <div className="mt-6 space-y-6">
        <PatientAdherenceHeatmap adherence={mockPatient.adherence} />
      </div>
    </DashboardPageShell>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}
