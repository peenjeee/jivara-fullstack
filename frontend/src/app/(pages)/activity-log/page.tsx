import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ActivityLogPage } from "@/components/activity-log";

export default function ActivityLogRoute() {
  return (
    <DashboardLayout>
      <ActivityLogPage />
    </DashboardLayout>
  );
}
