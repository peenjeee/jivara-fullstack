import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { SchedulePage } from "@/components/schedule";

export default function ScheduleRoute() {
  return (
    <DashboardLayout>
      <SchedulePage />
    </DashboardLayout>
  );
}
