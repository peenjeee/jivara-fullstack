"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);
  const patientName = initialPatientName ?? searchParams.get("patientName") ?? undefined;
  const category = initialCategory ?? searchParams.get("category") ?? undefined;

  if (!hasAuthHydrated) return null;
  if (dashboardRole === "super_admin") return <SuperAdminActivityLogPage />;

  return dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole) ? (
    <ActivityLogPage initialPatientName={patientName} initialCategory={category} auditUserRole={dashboardRole} readOnly={isOperationalAdminRole(dashboardRole)} showNurseFilter={dashboardRole !== "nurse"} />
  ) : (
    <PatientActivityLogPage initialCategory={category} />
  );
}
