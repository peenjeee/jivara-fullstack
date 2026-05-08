import { AlertTriangle, BellRing, CheckCircle2, ClipboardList, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityCategory, ActivitySeverity } from "@/lib/mocks/activityLogs";

export const activitySeverityTextStyles: Record<ActivitySeverity, string> = {
  Info: "text-warning",
  Sukses: "text-[var(--blue)]",
  Peringatan: "text-warning",
  Kritis: "text-danger",
};

export const activityCategoryTextStyles: Record<ActivityCategory, string> = {
  Reminder: "text-primary",
  Kepatuhan: "text-leaf",
  "Scan Makanan": "text-leaf",
  Administrasi: "text-warning",
};

export const activityCategoryIcons: Record<ActivityCategory, LucideIcon> = {
  Reminder: BellRing,
  Kepatuhan: CheckCircle2,
  "Scan Makanan": ScanLine,
  Administrasi: ClipboardList,
};

export const activitySeverityIcons: Record<ActivitySeverity, LucideIcon> = {
  Info: ClipboardList,
  Sukses: CheckCircle2,
  Peringatan: AlertTriangle,
  Kritis: AlertTriangle,
};

export function ActivitySeverityBadge({ severity }: { readonly severity: ActivitySeverity }) {
  return <span className={`text-xs font-extrabold ${activitySeverityTextStyles[severity]}`}>{severity}</span>;
}

export function ActivityCategoryBadge({ category }: { readonly category: ActivityCategory }) {
  return <span className={`text-xs font-extrabold ${activityCategoryTextStyles[category]}`}>{category}</span>;
}

export function ActivityCategoryIcon({ category }: { readonly category: ActivityCategory }) {
  const Icon = activityCategoryIcons[category];
  return (
    <span className={`inline-flex h-11 w-8 shrink-0 items-start justify-center pt-0.5 ${activityCategoryTextStyles[category]}`}>
      <Icon size={20} strokeWidth={2.4} />
    </span>
  );
}
