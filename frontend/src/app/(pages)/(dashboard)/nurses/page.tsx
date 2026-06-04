import { NurseListPage } from "@/components/admin";
import DashboardRoleGate from "@/components/dashboard/DashboardRoleGate";

export default function NursesRoute() {
  return <DashboardRoleGate allowedRoles={["admin", "nurse"]} fallbackTitle="Daftar Perawat"><NurseListPage /></DashboardRoleGate>;
}
