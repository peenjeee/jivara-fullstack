import { Eye, PauseCircle, Pencil, PlayCircle } from "lucide-react";
import type { ReactNode } from "react";
import IconActionButton, { type IconActionTone } from "@/components/ui/IconActionButton";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

export type ScheduleAction = "view" | "edit" | "toggle";

interface ScheduleActionsProps {
  readonly schedule: MedicationScheduleRecord;
  readonly actions?: readonly ScheduleAction[];
  readonly processingAction?: string | null;
  readonly onAction: (action: ScheduleAction, schedule: MedicationScheduleRecord) => void;
}

export default function ScheduleActions({ schedule, actions = ["view", "edit", "toggle"], processingAction = null, onAction }: ScheduleActionsProps) {
  const isInactive = schedule.status === "Nonaktif";
  const isCompleted = schedule.status === "Selesai";
  const isProcessing = Boolean(processingAction);

  return (
    <div className="flex justify-end gap-1.5">
      {actions.includes("view") && !isCompleted && (
        <ActionButton label="Lihat detail" variant="primary" disabled={isProcessing} onClick={() => onAction("view", schedule)}>
          <Eye size={16} />
        </ActionButton>
      )}
      {actions.includes("edit") && !isCompleted && (
        <ActionButton label="Edit jadwal" variant="warning" disabled={isProcessing} onClick={() => onAction("edit", schedule)}>
          <Pencil size={16} />
        </ActionButton>
      )}
      {actions.includes("toggle") && !isCompleted && (
        <ActionButton label={isInactive ? "Aktifkan jadwal" : "Nonaktifkan jadwal"} variant="blue" loading={processingAction === `toggle-${schedule.id}`} disabled={isProcessing} onClick={() => onAction("toggle", schedule)}>
          {isInactive ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        </ActionButton>
      )}
    </div>
  );
}

function ActionButton({ children, label, variant = "primary", loading = false, disabled = false, onClick }: {
  readonly children: ReactNode;
  readonly label: string;
  readonly variant?: IconActionTone;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <IconActionButton label={label} tone={variant} loading={loading} disabled={disabled} onClick={onClick}>
      {children}
    </IconActionButton>
  );
}
