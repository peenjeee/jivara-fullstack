"use client";

import dynamic from "next/dynamic";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { useAuthStore } from "@/store/auth";

const ActivityLogPage = dynamic(() => import("./ActivityLogPage"), { ssr: false });
const PatientActivityLogPage = dynamic(() => import("./PatientActivityLogPage"), { ssr: false });

interface ActivityLogRouteClientProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
}

export default function ActivityLogRouteClient({ initialPatientName, initialCategory }: ActivityLogRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(user?.role);

  if (!hasAuthHydrated) return null;

  return (
    <DashboardLayout>
      {dashboardRole === "nurse" ? (
        <ActivityLogPage initialPatientName={initialPatientName} initialCategory={initialCategory} />
      ) : (
        <PatientActivityLogPage initialCategory={initialCategory} />
      )}
    </DashboardLayout>
  );
}
