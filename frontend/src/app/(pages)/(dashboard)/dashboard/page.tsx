"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useAuthStore } from "@/store/auth";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";
import { getDashboardRole } from "@/components/dashboard/navigation";

const NurseDashboardPage = dynamic(() => import("@/components/dashboard/NurseDashboardPage"), { ssr: false, loading: () => null });
const AdminDashboardPage = dynamic(() => import("@/components/admin/AdminDashboardPage"), { ssr: false, loading: () => null });
const PatientDashboardPage = dynamic(() => import("@/components/patient-dashboard/PatientDashboardPage"), { ssr: false, loading: () => null });

export default function DashboardPage() {
  const { replace } = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);
  const { isSplashFinished } = useSplashScreen();

  useEffect(() => {
    if (!hasAuthHydrated || !isSplashFinished || dashboardRole !== "super_admin") return;
    replace("/admin-approvals");
  }, [dashboardRole, hasAuthHydrated, isSplashFinished, replace]);

  if (!hasAuthHydrated || !isSplashFinished) return null;

  if (dashboardRole === "super_admin") return <DashboardRouteFallback title="Persetujuan Admin" summaryCount={4} />;
  if (dashboardRole === "admin") return <AdminDashboardPage />;
  return dashboardRole === "nurse" ? <NurseDashboardPage /> : <PatientDashboardPage />;
}
