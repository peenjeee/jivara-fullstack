import type { ActivityCategory } from "@/lib/mocks/activityLogs";
import { activityCategoryIcons, activityCategoryTextStyles } from "./activityBadgeStyles";

export default function ActivityCategoryIcon({ category }: { readonly category: ActivityCategory }) {
  const Icon = activityCategoryIcons[category];
  return (
    <span className={`inline-flex h-11 w-8 shrink-0 items-start justify-center pt-0.5 ${activityCategoryTextStyles[category]}`}>
      <Icon size={20} strokeWidth={2.4} />
    </span>
  );
}
