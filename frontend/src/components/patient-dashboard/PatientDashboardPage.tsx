"use client";

import { useEffect, useReducer } from "react";
import { BellRing, Pill, ShieldCheck } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { PatientDashboardContentSkeleton, SummaryCardsSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientDashboardOverviewData, type PatientAdherenceStatsResponse } from "@/lib/patientDashboardApi";
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

const emptyAdherenceStats: PatientAdherenceStatsResponse = {
  adherenceRate: 0,
  totalScheduled: 0,
  dailyBreakdown: [],
};

let patientDashboardCache: {
  patient: PatientRecord;
  schedules: MedicationScheduleRecord[];
  adherenceStats: PatientAdherenceStatsResponse;
} | null = null;

interface PatientDashboardState {
  readonly patient: PatientRecord;
  readonly patientSchedules: MedicationScheduleRecord[];
  readonly adherenceStats: PatientAdherenceStatsResponse;
  readonly isLoading: boolean;
  readonly hasLoadedDashboard: boolean;
  readonly hasLoadError: boolean;
}

type PatientDashboardAction =
  | { readonly type: "loadSuccess"; readonly payload: { readonly patient: PatientRecord; readonly schedules: MedicationScheduleRecord[]; readonly adherenceStats: PatientAdherenceStatsResponse } }
  | { readonly type: "loadFailure" }
  | { readonly type: "finishLoading" };

function buildInitialPatientDashboardState(): PatientDashboardState {
  return {
    patient: patientDashboardCache?.patient ?? initialPatient,
    patientSchedules: patientDashboardCache?.schedules ?? [],
    adherenceStats: patientDashboardCache?.adherenceStats ?? emptyAdherenceStats,
    isLoading: !patientDashboardCache,
    hasLoadedDashboard: Boolean(patientDashboardCache),
    hasLoadError: false,
  };
}

function patientDashboardReducer(state: PatientDashboardState, action: PatientDashboardAction): PatientDashboardState {
  switch (action.type) {
    case "loadSuccess":
      return {
        ...state,
        patient: action.payload.patient,
        patientSchedules: action.payload.schedules,
        adherenceStats: action.payload.adherenceStats,
        hasLoadError: false,
      };
    case "loadFailure":
      return {
        ...state,
        hasLoadError: true,
      };
    case "finishLoading":
      return {
        ...state,
        isLoading: false,
        hasLoadedDashboard: true,
      };
    default:
      return state;
  }
}

export default function PatientDashboardPage() {
  const setPatientId = usePatientDashboardStore((state) => state.setPatientId);
  const { isSplashFinished } = useSplashScreen();
  const [state, dispatch] = useReducer(patientDashboardReducer, undefined, buildInitialPatientDashboardState);
  const { patient, patientSchedules, adherenceStats, isLoading, hasLoadedDashboard, hasLoadError } = state;

  useEffect(() => {
    let isMounted = true;

    getPatientDashboardOverviewData()
      .then((data) => {
        if (!isMounted) return;
        patientDashboardCache = { patient: data.patient, schedules: data.schedules, adherenceStats: data.adherenceStats };
        dispatch({ type: "loadSuccess", payload: { patient: data.patient, schedules: data.schedules, adherenceStats: data.adherenceStats } });
        setPatientId(data.patient.id);
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({ type: "loadFailure" });
        setPatientId(null);
      })
      .finally(() => {
        if (!isMounted) return;
        dispatch({ type: "finishLoading" });
      });

    return () => {
      isMounted = false;
    };
  }, [setPatientId]);

  if (!isSplashFinished) return null;
  if (!isLoading && hasLoadError) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader title="Dashboard Pasien" />
        <section className="mt-6 rounded-[32px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold text-muted">Data dashboard pasien belum bisa dimuat dari API.</p>
        </section>
      </DashboardPageShell>
    );
  }

  const greeting = getGreeting();
  const activeSchedules = patientSchedules.filter((schedule) => schedule.status === "Aktif");
  const heatmapAdherence = getAdherenceFromStats(adherenceStats);

  const stats: SummaryCardItem[] = [
    {
      label: "Obat Aktif Saya",
      value: `${activeSchedules.length}`,
      tone: "safe",
      color: "leaf",
      icon: Pill,
    },
    {
      label: "Reminder Obat Aktif",
      value: `${activeSchedules.filter((schedule) => schedule.reminderEnabled).length}`,
      tone: "safe",
      color: "lime",
      icon: BellRing,
    },
    {
      label: "Kepatuhan Keseluruhan Saya",
      value: `${heatmapAdherence}%`,
      helper: patient.status,
      tone: heatmapAdherence >= 80 ? "safe" : heatmapAdherence >= 60 ? "warning" : "critical",
      color: "pine",
      icon: ShieldCheck,
      progress: heatmapAdherence,
    }
  ];

  return (
    <DashboardPageShell>
      <DashboardPageHeader title={`${greeting}, ${patient.name}`} />
      {isLoading && !hasLoadedDashboard ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={stats} />}

      <div className="mt-6 space-y-6">
        {isLoading && !hasLoadedDashboard ? <PatientDashboardContentSkeleton /> : <PatientAdherenceHeatmap dailyBreakdown={adherenceStats.dailyBreakdown} />}
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

function getAdherenceFromStats(stats: PatientAdherenceStatsResponse) {
  const totalScheduled = stats.dailyBreakdown.reduce((sum, day) => sum + day.scheduled, 0);
  const totalConfirmed = stats.dailyBreakdown.reduce((sum, day) => sum + day.confirmed, 0);
  if (totalScheduled === 0) return 100;
  return Math.round((totalConfirmed / totalScheduled) * 100);
}
