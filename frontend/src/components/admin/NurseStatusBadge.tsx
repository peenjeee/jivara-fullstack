import type { NurseStatus } from "@/lib/mocks/nurses";

const statusClasses: Record<NurseStatus, string> = {
  Aktif: "bg-primary/10 text-primary",
  Nonaktif: "bg-danger/10 text-danger",
};

export default function NurseStatusBadge({ status }: { readonly status: NurseStatus }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${statusClasses[status]}`}>{status}</span>;
}
