"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import ActivityLogPage from "./ActivityLogPage";
import PatientActivityLogPage from "./PatientActivityLogPage";

interface ActivityLogRouteClientProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
}

export default function ActivityLogRouteClient({ initialPatientName, initialCategory }: ActivityLogRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const shouldShowNurseActivityLog = user?.role === "nurse" || user?.role === "admin";

  return (
    <DashboardLayout>
      {shouldShowNurseActivityLog ? (
        <ActivityLogPage initialPatientName={initialPatientName} initialCategory={initialCategory} />
      ) : (
        <PatientActivityLogPage initialCategory={initialCategory} />
      )}
    </DashboardLayout>
  );
}
