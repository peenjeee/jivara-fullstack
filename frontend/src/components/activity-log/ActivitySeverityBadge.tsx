import type { ActivitySeverity } from "@/lib/mocks/activityLogs";
import { activitySeverityBadgeStyles } from "./activityBadgeStyles";

export default function ActivitySeverityBadge({ severity }: { readonly severity: ActivitySeverity }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${activitySeverityBadgeStyles[severity]}`}>{severity}</span>;
}
