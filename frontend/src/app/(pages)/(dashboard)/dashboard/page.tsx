"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useAuthStore } from "@/store/auth";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useDashboardInitialUser } from "@/components/dashboard/DashboardInitialUserContext";

const dashboardLoadingFallback = () => <DashboardRouteFallback title="Dashboard" />;

const NurseDashboardPage = dynamic(() => import("@/components/dashboard/NurseDashboardPage"), { loading: dashboardLoadingFallback });
const AdminDashboardPage = dynamic(() => import("@/components/admin/AdminDashboardPage"), { loading: dashboardLoadingFallback });
const PatientDashboardPage = dynamic(() => import("@/components/patient-dashboard/PatientDashboardPage"), { loading: dashboardLoadingFallback });

export default function DashboardPage() {
  const { replace } = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const initialUser = useDashboardInitialUser();
  const effectiveUser = user ?? initialUser;
  const isAuthReady = hasAuthHydrated || Boolean(initialUser);
  const dashboardRole = getDashboardRole(effectiveUser?.role);
  const { isSplashFinished } = useSplashScreen();

  useEffect(() => {
    if (!isAuthReady || !isSplashFinished || dashboardRole !== "super_admin") return;
    replace("/admin-approvals");
  }, [dashboardRole, isAuthReady, isSplashFinished, replace]);

  if (!isAuthReady || !isSplashFinished) return <DashboardRouteFallback title="Dashboard" />;

  if (dashboardRole === "super_admin") return <DashboardRouteFallback title="Persetujuan Admin" summaryCount={4} />;
  if (dashboardRole === "admin") return <AdminDashboardPage />;
  return dashboardRole === "nurse" ? <NurseDashboardPage /> : <PatientDashboardPage />;
}
