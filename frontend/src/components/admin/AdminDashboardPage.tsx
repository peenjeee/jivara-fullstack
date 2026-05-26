"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";
import type { ReactNode } from "react";
import { m } from "motion/react";
import { AlertTriangle } from "lucide-react";
import { ActivityCategoryBadge, ActivitySeverityBadge } from "@/components/activity-log/ActivityBadges";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import { ActivityDataSkeleton, SummaryCardsSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { getAdminDashboardData, type AdminDashboardData, type AdminDashboardRiskyPatient } from "@/lib/dashboardApi";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import NurseStatusBadge from "./NurseStatusBadge";

let adminDashboardCache: AdminDashboardData | null = null;

interface AdminDashboardState {
  readonly stats: SummaryCardItem[];
  readonly nurseFollowUps: AdminDashboardData["nurseFollowUps"];
  readonly riskyPatients: AdminDashboardRiskyPatient[];
  readonly priorityActivities: ActivityLogRecord[];
  readonly isLoading: boolean;
  readonly hasLoadedDashboard: boolean;
  readonly hasLoadError: boolean;
}

type AdminDashboardAction =
  | { readonly type: "loadSuccess"; readonly payload: AdminDashboardData }
  | { readonly type: "loadFailure" }
  | { readonly type: "finishLoading" };

function createInitialAdminDashboardState(): AdminDashboardState {
  const cachedDashboard = adminDashboardCache;

  return {
    stats: cachedDashboard?.stats ?? [],
    nurseFollowUps: cachedDashboard?.nurseFollowUps ?? [],
    riskyPatients: cachedDashboard?.riskyPatients ?? [],
    priorityActivities: cachedDashboard?.priorityActivities ?? [],
    isLoading: !cachedDashboard,
    hasLoadedDashboard: Boolean(cachedDashboard),
    hasLoadError: false,
  };
}

function adminDashboardReducer(state: AdminDashboardState, action: AdminDashboardAction): AdminDashboardState {
  switch (action.type) {
    case "loadSuccess":
      return {
        ...state,
        stats: action.payload.stats,
        nurseFollowUps: action.payload.nurseFollowUps,
        riskyPatients: action.payload.riskyPatients,
        priorityActivities: action.payload.priorityActivities,
        hasLoadError: false,
      };
    case "loadFailure":
      return {
        ...state,
        stats: [],
        nurseFollowUps: [],
        riskyPatients: [],
        priorityActivities: [],
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

export default function AdminDashboardPage() {
  const [state, dispatch] = useReducer(adminDashboardReducer, undefined, createInitialAdminDashboardState);
  const { stats, nurseFollowUps, riskyPatients, priorityActivities, isLoading, hasLoadedDashboard, hasLoadError } = state;

  useEffect(() => {
    let isMounted = true;

    getAdminDashboardData()
      .then((data) => {
        if (!isMounted) return;
        adminDashboardCache = data;
        dispatch({ type: "loadSuccess", payload: data });
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({ type: "loadFailure" });
      })
      .finally(() => {
        if (!isMounted) return;
        dispatch({ type: "finishLoading" });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Dashboard Admin" />
      {isLoading && !hasLoadedDashboard ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={stats} />}

      {!isLoading && hasLoadError && (
        <section className="mt-6 rounded-[32px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning-dark"><AlertTriangle size={22} /></div>
          <p className="text-sm font-bold text-muted">Data dashboard admin belum bisa dimuat dari API.</p>
        </section>
      )}

      {!hasLoadError && <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
        <AdminPanel title="Perawat Perlu Tindak Lanjut" href="/nurses">
          {isLoading && !hasLoadedDashboard ? <ActivityDataSkeleton rows={5} /> : nurseFollowUps.map(({ nurse, assignedPatientCount, riskyPatientCount }) => (
            <Link key={`dashboard-nurse-${nurse.id}`} href={`/nurses/${encodeURIComponent(nurse.id)}`} className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 transition-colors hover:bg-primary/5">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-text-main">{nurse.fullName}</p>
                <p className="text-xs font-bold text-muted">{assignedPatientCount} pasien - {riskyPatientCount} perlu perhatian</p>
              </div>
              <NurseStatusBadge status={nurse.status} />
            </Link>
          ))}
          {!isLoading && nurseFollowUps.length === 0 && <EmptyInsight message="Semua perawat tidak memiliki pasien perlu tindak lanjut." />}
        </AdminPanel>

        <AdminPanel title="Pasien Berisiko" href="/patients">
          {isLoading && !hasLoadedDashboard ? <ActivityDataSkeleton rows={5} /> : riskyPatients.map((patient, index) => (
            <Link key={`dashboard-patient-${patient.id}-${index}`} href={`/patients/${encodeURIComponent(patient.id)}`} className="block rounded-2xl bg-surface px-4 py-3 transition-colors hover:bg-primary/5">
              <p className="truncate text-sm font-extrabold text-text-main">{patient.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PatientStatusBadge status={patient.status} />
                <span className="text-xs font-bold text-muted">{patient.assignedNurseName ?? "Belum ditugaskan"}</span>
              </div>
            </Link>
          ))}
          {!isLoading && riskyPatients.length === 0 && <EmptyInsight message="Tidak ada pasien yang berisiko." />}
        </AdminPanel>

        <AdminPanel title="Aktivitas Prioritas" href="/activity-log">
          {isLoading && !hasLoadedDashboard ? <ActivityDataSkeleton rows={5} /> : priorityActivities.map((activity, index) => (
            <div key={`${activity.category}-${activity.id}-${index}`} className="rounded-2xl bg-surface px-4 py-3">
              <p className="truncate text-sm font-extrabold text-text-main">{activity.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ActivityCategoryBadge category={activity.category} />
                <ActivitySeverityBadge severity={activity.severity} />
              </div>
            </div>
          ))}
          {!isLoading && priorityActivities.length === 0 && <EmptyInsight message="Tidak ada aktivitas prioritas." />}
        </AdminPanel>
      </div>}
    </DashboardPageShell>
  );
}

function AdminPanel({ title, href, children }: { readonly title: string; readonly href: string; readonly children: ReactNode }) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.section className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]" {...getDashboardEntranceMotion(shouldAnimate, 0.28, 22)}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
        <Link href={href} className="text-xs font-extrabold uppercase tracking-[0.1em] text-text-main transition-colors hover:!text-primary focus-visible:!text-primary">Lihat</Link>
      </div>
      <div className="space-y-3">{children}</div>
    </m.section>
  );
}

function EmptyInsight({ message }: { readonly message: string }) {
  return <div className="rounded-2xl bg-surface px-4 py-5 text-sm font-bold leading-6 text-muted">{message}</div>;
}
