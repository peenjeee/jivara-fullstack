"use client";

import { DashboardLayout } from "@/components/dashboard";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { NurseSettingsPage, PatientSettingsPage } from "@/components/settings";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;

  return (
    <DashboardLayout>
      {dashboardRole === "nurse" ? <NurseSettingsPage /> : <PatientSettingsPage />}
    </DashboardLayout>
  );
}
