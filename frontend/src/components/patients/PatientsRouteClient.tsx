"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";
import PatientListPage from "./PatientListPage";

export default function PatientsRouteClient() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole === "nurse") return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  if (!hasAuthHydrated || dashboardRole !== "nurse") return null;

  return (
    <DashboardLayout>
      <PatientListPage />
    </DashboardLayout>
  );
}
