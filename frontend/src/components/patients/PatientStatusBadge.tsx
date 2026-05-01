import type { PatientStatus } from "@/lib/mocks/patients";

const statusStyles: Record<PatientStatus, string> = {
  "On Ideal Schedule": "bg-safe/10 text-safe",
  "Lagging Behind": "bg-warning/15 text-warning",
  "Need Special Attention": "bg-danger/10 text-danger",
};

interface PatientStatusBadgeProps {
  readonly status: PatientStatus;
}

export default function PatientStatusBadge({ status }: PatientStatusBadgeProps) {
  return (
    <span className={`inline-flex min-w-[140px] justify-center rounded-full px-3 py-1.5 text-center text-xs font-extrabold leading-tight ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
