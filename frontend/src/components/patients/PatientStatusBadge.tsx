import Badge from "@/components/ui/Badge";
import type { PatientStatus } from "@/lib/mocks/patients";

const statusStyles: Record<PatientStatus, string> = {
  "On Ideal Schedule": "bg-safe/10 text-safe",
  "Lagging Behind": "bg-warning/15 text-warning-dark",
  "Need Special Attention": "bg-danger/10 text-danger",
  "Complete": "bg-blue/10 text-blue",
  "Nonaktif": "bg-danger/10 text-danger",
};

interface PatientStatusBadgeProps {
  readonly status: PatientStatus;
}

export default function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  return <Badge toneClass={statusStyles[status]} size="md" centered minWidth>{status}</Badge>;
}
