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

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole === "nurse" || isOperationalAdminRole(dashboardRole)) return;
      replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, replace]);

  if (!hasAuthHydrated || (dashboardRole !== "nurse" && !isOperationalAdminRole(dashboardRole))) return <DashboardRouteFallback title="Daftar Pasien" />;

  return <PatientListPage mode={isOperationalAdminRole(dashboardRole) ? "readonly" : "manage"} />;
}
