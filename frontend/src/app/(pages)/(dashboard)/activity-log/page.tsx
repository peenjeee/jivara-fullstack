import { Suspense } from "react";
import { ActivityLogRouteClient } from "@/components/activity-log";

export default function ActivityLogRoute() {
  return (
    <Suspense fallback={null}>
      <ActivityLogRouteClient />
    </Suspense>
  );
}
