"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const PatientSchedulePage = dynamic(() => import("./PatientSchedulePage"), { ssr: false, loading: () => null });
const SchedulePage = dynamic(() => import("./SchedulePage"), { ssr: false, loading: () => null });

interface ScheduleRouteClientProps {
  readonly initialPatientId?: string;
  readonly initialPatientName?: string;
}

export default function ScheduleRouteClient({ initialPatientId, initialPatientName }: ScheduleRouteClientProps) {
  const { replace } = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole !== "super_admin") return;
      replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, replace]);

  if (!hasAuthHydrated) return null;
  if (dashboardRole === "super_admin") return <DashboardRouteFallback title="Jadwal Obat" />;

  if (isOperationalAdminRole(dashboardRole)) return <SchedulePage initialPatientId={initialPatientId} initialPatientName={initialPatientName} readOnly />;
  return dashboardRole === "nurse" ? <SchedulePage initialPatientId={initialPatientId} initialPatientName={initialPatientName} /> : <PatientSchedulePage />;
}
