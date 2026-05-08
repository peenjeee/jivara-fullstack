"use client";

import dynamic from "next/dynamic";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const ActivityLogPage = dynamic(() => import("./ActivityLogPage"), { ssr: false, loading: () => <DashboardRouteFallback /> });
const PatientActivityLogPage = dynamic(() => import("./PatientActivityLogPage"), { ssr: false, loading: () => <DashboardRouteFallback /> });

interface ActivityLogRouteClientProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
}

export default function ActivityLogRouteClient({ initialPatientName, initialCategory }: ActivityLogRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;

  return dashboardRole === "nurse" || dashboardRole === "admin" ? (
    <ActivityLogPage initialPatientName={initialPatientName} initialCategory={initialCategory} readOnly={dashboardRole === "admin"} />
  ) : (
    <PatientActivityLogPage initialCategory={initialCategory} />
  );
}
