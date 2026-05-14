"use client";

import { useEffect, useState } from "react";
import { BellRing, Pill, ShieldCheck } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { SummaryCardsSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientDashboardData } from "@/lib/patientDashboardApi";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";
import PatientAdherenceHeatmap from "./PatientAdherenceHeatmap";

const initialPatient: PatientRecord = {
  id: "",
  name: "-",
  age: 0,
  gender: "Pria",
  status: "On Ideal Schedule",
  lastVisit: "-",
  adherence: 100,
  avatar: "PX",
};

export default function PatientDashboardPage() {
  const lastScan = usePatientDashboardStore((state) => state.lastScan);
  const setPatientId = usePatientDashboardStore((state) => state.setPatientId);
  const { isSplashFinished } = useSplashScreen();
  const [patient, setPatient] = useState<PatientRecord>(initialPatient);
  const [patientSchedules, setPatientSchedules] = useState<MedicationScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getPatientDashboardData()
      .then((data) => {
        if (!isMounted) return;
        setPatient(data.patient);
        setPatientId(data.patient.id);
        setPatientSchedules(data.schedules);
      })
      .catch(() => {
        if (!isMounted) return;
        setPatient(initialPatient);
        setPatientId(null);
        setPatientSchedules([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setPatientId]);

  if (!isSplashFinished) return null;

  const greeting = getGreeting();
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
      value: `${patient.adherence}%`,
      helper: patient.status,
      tone: patient.adherence >= 80 ? "safe" : patient.adherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: ShieldCheck,
      progress: patient.adherence,
    }
  ];

  return (
    <DashboardPageShell>
      <DashboardPageHeader title={`${greeting}, ${patient.name}`} />
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={stats} />}

      <div className="mt-6 space-y-6">
        <PatientAdherenceHeatmap adherence={patient.adherence} />
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
