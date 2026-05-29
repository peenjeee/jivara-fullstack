"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";
import PatientListPage from "./PatientListPage";

export default function PatientsRouteClient() {
  const { replace } = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const canManagePatients = dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole);
  const canDeletePatients = dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole);
  const canAssignNurses = isOperationalAdminRole(dashboardRole);

  useEffect(() => {
    if (!hasAuthHydrated || canManagePatients) return;
      replace("/dashboard");
  }, [canManagePatients, hasAuthHydrated, replace]);

  if (!hasAuthHydrated || !canManagePatients) return <DashboardRouteFallback title="Daftar Pasien" />;

  return <PatientListPage mode="manage" canDeletePatients={canDeletePatients} canAssignNurses={canAssignNurses} />;
}
