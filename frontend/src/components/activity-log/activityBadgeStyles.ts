import { AlertTriangle, BellRing, CheckCircle2, ClipboardList, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActivityCategory, ActivitySeverity } from "@/lib/mocks/activityLogs";

export const activitySeverityTextStyles: Record<ActivitySeverity, string> = {
  Info: "text-warning-dark",
  Sukses: "text-[var(--blue)]",
  Peringatan: "text-warning-dark",
  Kritis: "text-danger",
};

export const activitySeverityBadgeStyles: Record<ActivitySeverity, string> = {
  Info: "bg-warning/15 text-warning-dark",
  Sukses: "bg-[var(--blue)]/10 text-[var(--blue)]",
  Peringatan: "bg-warning/15 text-warning-dark",
  Kritis: "bg-danger/10 text-danger",
};

export const activityCategoryTextStyles: Record<ActivityCategory, string> = {
  Reminder: "text-primary",
  Kepatuhan: "text-leaf",
  "Scan Makanan": "text-leaf",
  Administrasi: "text-warning-dark",
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
