"use client";

import dynamic from "next/dynamic";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const PatientSchedulePage = dynamic(() => import("./PatientSchedulePage"), { ssr: false });
const SchedulePage = dynamic(() => import("./SchedulePage"), { ssr: false });

interface ScheduleRouteClientProps {
  readonly initialPatientName?: string;
}

export default function ScheduleRouteClient({ initialPatientName }: ScheduleRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;

  return (
    <DashboardLayout>
      {dashboardRole === "nurse" ? <SchedulePage initialPatientName={initialPatientName} /> : <PatientSchedulePage />}
    </DashboardLayout>
  );
}
