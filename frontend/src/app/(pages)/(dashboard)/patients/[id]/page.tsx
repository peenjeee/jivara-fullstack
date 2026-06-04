import { PatientDetailPage } from "@/components/patients/detail";
import DashboardRoleGate from "@/components/dashboard/DashboardRoleGate";
import { getInitialPatientDetail } from "@/lib/patientApi";

interface PatientDetailRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export default async function PatientDetailRoute({ params }: PatientDetailRouteProps) {
  const { id } = await params;
  const patientId = decodeURIComponent(id);
  const data = getInitialPatientDetail(patientId);

  return <DashboardRoleGate allowedRoles={["admin", "nurse"]} fallbackTitle="Detail Pasien"><PatientDetailPage data={data} patientId={patientId} /></DashboardRoleGate>;
}
