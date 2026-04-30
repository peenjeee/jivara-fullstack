import type { SummaryCardTone } from "@/components/ui/SummaryCard";
import type { RecentPatient } from "@/lib/mocks/dashboard";

export const toneStyles: Record<SummaryCardTone, string> = {
  safe: "border-safe/20 bg-safe/10 text-safe",
  warning: "border-warning/25 bg-warning/10 text-warning",
  critical: "border-danger/25 bg-danger/10 text-danger",
  neutral: "border-line bg-surface text-muted",
};

export function patientStatusStyle(status: RecentPatient["status"]) {
  if (status === "Need Special Attention") return "bg-danger/10 text-danger";
  if (status === "Lagging Behind") return "bg-warning/15 text-warning";
  return "bg-safe/10 text-safe";
}
