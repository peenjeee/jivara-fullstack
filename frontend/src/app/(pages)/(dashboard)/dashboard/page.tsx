"use client";

import dynamic from "next/dynamic";
import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";
import { useAuthStore } from "@/store/auth";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";
import { getDashboardRole } from "@/components/dashboard/navigation";

const NurseDashboardPage = dynamic(() => import("@/components/dashboard/NurseDashboardPage"), { ssr: false, loading: () => <DashboardRouteFallback /> });
const AdminDashboardPage = dynamic(() => import("@/components/admin/AdminDashboardPage"), { ssr: false, loading: () => <DashboardRouteFallback /> });
const PatientDashboardPage = dynamic(() => import("@/components/patient-dashboard/PatientDashboardPage"), { ssr: false, loading: () => <DashboardRouteFallback /> });

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);
  const { isSplashFinished } = useSplashScreen();

  if (!hasAuthHydrated || !isSplashFinished) return null;

  if (dashboardRole === "admin") return <AdminDashboardPage />;
  return dashboardRole === "nurse" ? <NurseDashboardPage /> : <PatientDashboardPage />;
}
