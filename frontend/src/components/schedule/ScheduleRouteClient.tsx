"use client";

import dynamic from "next/dynamic";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const PatientSchedulePage = dynamic(() => import("./PatientSchedulePage"), { ssr: false, loading: () => <DashboardRouteFallback /> });
const SchedulePage = dynamic(() => import("./SchedulePage"), { ssr: false, loading: () => <DashboardRouteFallback /> });

interface ScheduleRouteClientProps {
  readonly initialPatientName?: string;
}

export default function ScheduleRouteClient({ initialPatientName }: ScheduleRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;

  if (dashboardRole === "admin") return <SchedulePage initialPatientName={initialPatientName} readOnly />;
  return dashboardRole === "nurse" ? <SchedulePage initialPatientName={initialPatientName} /> : <PatientSchedulePage />;
}
