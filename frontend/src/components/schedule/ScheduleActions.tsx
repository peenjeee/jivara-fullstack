import { Eye, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

export type ScheduleAction = "view" | "edit" | "delete" | "toggle";

interface ScheduleActionsProps {
  readonly schedule: MedicationScheduleRecord;
  readonly actions?: readonly ScheduleAction[];
  readonly onAction: (action: ScheduleAction, schedule: MedicationScheduleRecord) => void;
}

export default function ScheduleActions({ schedule, actions = ["view", "edit", "toggle", "delete"], onAction }: ScheduleActionsProps) {
  const isInactive = schedule.status === "Nonaktif";

  return (
    <div className="flex justify-end gap-1.5">
      {actions.includes("view") && (
        <ActionButton label="Lihat detail" variant="primary" onClick={() => onAction("view", schedule)}>
          <Eye size={16} />
        </ActionButton>
      )}
      {actions.includes("edit") && (
        <ActionButton label="Edit jadwal" variant="warning" onClick={() => onAction("edit", schedule)}>
          <Pencil size={16} />
        </ActionButton>
      )}
      {actions.includes("toggle") && (
        <ActionButton label={isInactive ? "Aktifkan jadwal" : "Nonaktifkan jadwal"} variant="blue" onClick={() => onAction("toggle", schedule)}>
          {isInactive ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </ActionButton>
      )}
      {actions.includes("delete") && (
        <ActionButton label="Hapus jadwal" variant="delete" onClick={() => onAction("delete", schedule)}>
          <Trash2 size={16} />
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({ children, label, variant = "primary", onClick }: {
  readonly children: ReactNode;
  readonly label: string;
  readonly variant?: "primary" | "danger" | "warning" | "blue" | "delete";
  readonly onClick: () => void;
}) {
  const toneClass = {
    primary: "text-muted hover:bg-primary/10 hover:text-primary",
    danger: "text-muted hover:bg-danger/10 hover:text-danger",
    warning: "text-muted hover:bg-warning/10 hover:text-warning",
    blue: "text-muted hover:bg-blue-50 hover:text-blue-700",
    delete: "text-danger hover:bg-danger/10 hover:text-danger",
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}
