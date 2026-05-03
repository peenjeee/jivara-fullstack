import Badge from "@/components/ui/Badge";
import type { MedicationScheduleStatus } from "@/lib/mocks/schedules";

const STATUS_STYLES: Record<MedicationScheduleStatus, string> = {
  Aktif: "bg-primary/10 text-primary",
  Selesai: "bg-[color:var(--blue)]/10 text-[var(--blue)]",
  Nonaktif: "bg-danger/10 text-danger",
};

export default function ScheduleStatusBadge({ status }: { readonly status: MedicationScheduleStatus }) {
  return <Badge toneClass={STATUS_STYLES[status]}>{status}</Badge>;
}
