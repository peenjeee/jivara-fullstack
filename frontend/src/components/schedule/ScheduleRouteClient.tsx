"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useDashboardInitialUser } from "@/components/dashboard/DashboardInitialUserContext";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const PatientSchedulePage = dynamic(() => import("./PatientSchedulePage"), { loading: () => <DashboardRouteFallback title="Jadwal Obat" /> });
const SchedulePage = dynamic(() => import("./SchedulePage"), { loading: () => <DashboardRouteFallback title="Jadwal Obat" /> });

interface ScheduleRouteClientProps {
  readonly initialPatientId?: string;
  readonly initialPatientName?: string;
}

export default function ScheduleRouteClient({ initialPatientId, initialPatientName }: ScheduleRouteClientProps) {
  const { replace } = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const initialUser = useDashboardInitialUser();
  const isAuthReady = hasAuthHydrated || Boolean(initialUser);
  const dashboardRole = getDashboardRole(user?.role ?? initialUser?.role);

  useEffect(() => {
    if (!isAuthReady || dashboardRole !== "super_admin") return;
      replace("/dashboard");
  }, [dashboardRole, isAuthReady, replace]);

  if (!isAuthReady) return <DashboardRouteFallback title="Jadwal Obat" />;
  if (dashboardRole === "super_admin") return <DashboardRouteFallback title="Jadwal Obat" />;

  if (isOperationalAdminRole(dashboardRole)) return <SchedulePage initialPatientId={initialPatientId} initialPatientName={initialPatientName} />;
  return dashboardRole === "nurse" ? <SchedulePage initialPatientId={initialPatientId} initialPatientName={initialPatientName} /> : <PatientSchedulePage />;
}
