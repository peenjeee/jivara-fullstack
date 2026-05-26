import type { ActivityCategory } from "@/lib/mocks/activityLogs";
import { activityCategoryTextStyles } from "./activityBadgeStyles";

export default function ActivityCategoryBadge({ category }: { readonly category: ActivityCategory }) {
  return <span className={`text-xs font-extrabold ${activityCategoryTextStyles[category]}`}>{category}</span>;
}
