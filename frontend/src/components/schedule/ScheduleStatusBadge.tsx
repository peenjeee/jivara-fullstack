import type { MedicationScheduleStatus } from "@/lib/mocks/schedules";

const STATUS_STYLES: Record<MedicationScheduleStatus, string> = {
  Aktif: "bg-primary/10 text-primary",
  Selesai: "bg-blue-50 text-blue-700",
  Nonaktif: "bg-danger/10 text-danger",
};

export default function ScheduleStatusBadge({ status }: { readonly status: MedicationScheduleStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}
