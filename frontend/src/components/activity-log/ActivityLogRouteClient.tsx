"use client";

import dynamic from "next/dynamic";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const ActivityLogPage = dynamic(() => import("./ActivityLogPage"), { ssr: false, loading: () => null });
const PatientActivityLogPage = dynamic(() => import("./PatientActivityLogPage"), { ssr: false, loading: () => null });
const SuperAdminActivityLogPage = dynamic(() => import("./SuperAdminActivityLogPage"), { ssr: false, loading: () => null });

interface ActivityLogRouteClientProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
}

export default function ActivityLogRouteClient({ initialPatientName, initialCategory }: ActivityLogRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;
  if (dashboardRole === "super_admin") return <SuperAdminActivityLogPage />;

  return dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole) ? (
    <ActivityLogPage initialPatientName={initialPatientName} initialCategory={initialCategory} auditUserRole={dashboardRole} readOnly={isOperationalAdminRole(dashboardRole)} showNurseFilter={dashboardRole !== "nurse"} />
  ) : (
    <PatientActivityLogPage initialCategory={initialCategory} />
  );
}
