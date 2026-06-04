import { NurseDetailPage } from "@/components/admin";
import DashboardRoleGate from "@/components/dashboard/DashboardRoleGate";

interface NurseDetailRouteProps {
  readonly params: Promise<{
    readonly id: string;
  }>;
}

export default async function NurseDetailRoute({ params }: NurseDetailRouteProps) {
  const { id } = await params;
  return <DashboardRoleGate allowedRoles={["admin", "nurse"]} fallbackTitle="Detail Perawat"><NurseDetailPage nurseId={decodeURIComponent(id)} /></DashboardRoleGate>;
}
