"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useDashboardInitialUser } from "@/components/dashboard/DashboardInitialUserContext";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const ActivityLogPage = dynamic(() => import("./ActivityLogPage"), { loading: () => <DashboardRouteFallback title="Log Aktivitas" /> });
const PatientActivityLogPage = dynamic(() => import("./PatientActivityLogPage"), { loading: () => <DashboardRouteFallback title="Log Aktivitas" /> });
const SuperAdminActivityLogPage = dynamic(() => import("./SuperAdminActivityLogPage"), { loading: () => <DashboardRouteFallback title="Log Aktivitas" /> });

interface ActivityLogRouteClientProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
}

export default function ActivityLogRouteClient({ initialPatientName, initialCategory }: ActivityLogRouteClientProps) {
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const initialUser = useDashboardInitialUser();
  const isAuthReady = hasAuthHydrated || Boolean(initialUser);
  const dashboardRole = getDashboardRole(user?.role ?? initialUser?.role);
  const patientName = initialPatientName ?? searchParams.get("patientName") ?? undefined;
  const category = initialCategory ?? searchParams.get("category") ?? undefined;

  if (!isAuthReady) return <DashboardRouteFallback title="Log Aktivitas" />;
  if (dashboardRole === "super_admin") return <SuperAdminActivityLogPage />;

  return dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole) ? (
    <ActivityLogPage initialPatientName={patientName} initialCategory={category} auditUserRole={dashboardRole} readOnly={isOperationalAdminRole(dashboardRole)} showNurseFilter={dashboardRole !== "nurse"} />
  ) : (
    <PatientActivityLogPage initialCategory={category} />
  );
}
