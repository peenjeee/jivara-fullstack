"use client";

import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { AdminSettingsPage } from "@/components/admin";
import { NurseSettingsPage, PatientSettingsPage } from "@/components/settings";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return <DashboardRouteFallback />;

  if (dashboardRole === "admin") return <AdminSettingsPage />;
  return dashboardRole === "nurse" ? <NurseSettingsPage /> : <PatientSettingsPage />;
}
