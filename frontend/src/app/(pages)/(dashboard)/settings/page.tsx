"use client";

import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useDashboardInitialUser } from "@/components/dashboard/DashboardInitialUserContext";
import { getDashboardRole, isAdminDashboardRole } from "@/components/dashboard/navigation";
import { AdminSettingsPage } from "@/components/admin";
import { NurseSettingsPage, PatientSettingsPage } from "@/components/settings";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const initialUser = useDashboardInitialUser();
  const isAuthReady = hasAuthHydrated || Boolean(initialUser);
  const dashboardRole = getDashboardRole(user?.role ?? initialUser?.role);

  if (!isAuthReady) return <DashboardRouteFallback title="Pengaturan" />;

  if (isAdminDashboardRole(dashboardRole)) return <AdminSettingsPage />;
  return dashboardRole === "nurse" ? <NurseSettingsPage /> : <PatientSettingsPage />;
}
