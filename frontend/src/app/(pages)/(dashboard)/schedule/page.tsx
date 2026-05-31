import { Suspense } from "react";
import ScheduleRouteClient from "@/components/schedule/ScheduleRouteClient";

export default function ScheduleRoute() {
  return (
    <Suspense fallback={null}>
      <ScheduleRouteClient />
    </Suspense>
  );
}
