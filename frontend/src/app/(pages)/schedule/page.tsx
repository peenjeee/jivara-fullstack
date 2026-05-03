import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { SchedulePage } from "@/components/schedule";

interface ScheduleRouteProps {
  readonly searchParams?: Promise<{
    readonly patientName?: string;
  }>;
}

export default async function ScheduleRoute({ searchParams }: ScheduleRouteProps) {
  const params = await searchParams;

  return (
    <DashboardLayout>
      <SchedulePage initialPatientName={params?.patientName} />
    </DashboardLayout>
  );
}
