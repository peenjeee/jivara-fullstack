import ScheduleRouteClient from "@/components/schedule/ScheduleRouteClient";

interface ScheduleRouteProps {
  readonly searchParams?: Promise<{
    readonly patientName?: string;
  }>;
}

export default async function ScheduleRoute({ searchParams }: ScheduleRouteProps) {
  const params = await searchParams;

  return <ScheduleRouteClient initialPatientName={params?.patientName} />;
}
