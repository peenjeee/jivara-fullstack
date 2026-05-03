import { Eye, PauseCircle, Pencil, PlayCircle, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import IconActionButton, { type IconActionTone } from "@/components/ui/IconActionButton";
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
  readonly variant?: IconActionTone;
  readonly onClick: () => void;
}) {
  return (
    <IconActionButton label={label} tone={variant} onClick={onClick}>
      {children}
    </IconActionButton>
  );
}
