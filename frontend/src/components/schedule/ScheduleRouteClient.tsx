"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuthStore } from "@/store/auth";
import PatientSchedulePage from "./PatientSchedulePage";
import SchedulePage from "./SchedulePage";

interface ScheduleRouteClientProps {
  readonly initialPatientName?: string;
}

export default function ScheduleRouteClient({ initialPatientName }: ScheduleRouteClientProps) {
  const user = useAuthStore((state) => state.user);
  const shouldShowNurseSchedule = user?.role === "nurse" || user?.role === "admin";

  return (
    <DashboardLayout>
      {shouldShowNurseSchedule ? <SchedulePage initialPatientName={initialPatientName} /> : <PatientSchedulePage />}
    </DashboardLayout>
  );
}
