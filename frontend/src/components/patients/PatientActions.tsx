import { Edit3, Eye, Power, Trash2, UserRoundPlus } from "lucide-react";
import IconActionButton from "@/components/ui/IconActionButton";
import type { PatientRecord } from "@/lib/mocks/patients";

export type PatientAction = "view" | "edit" | "delete" | "activate" | "assign";

interface PatientActionsProps {
  readonly patient: PatientRecord;
  readonly actions?: readonly PatientAction[];
  readonly processingAction?: string | null;
  readonly onAction?: (action: PatientAction, patient: PatientRecord) => void;
}

const actionConfig = {
  view: { label: "Lihat detail", icon: Eye, tone: "primary" },
  edit: { label: "Edit", icon: Edit3, tone: "warning" },
  delete: { label: "Hapus", icon: Trash2, tone: "delete" },
  activate: { label: "Aktifkan", icon: Power, tone: "blue" },
  assign: { label: "Atur perawat", icon: UserRoundPlus, tone: "primary" },
} as const;

export default function PatientActions({ patient, actions = ["view"], processingAction = null, onAction }: PatientActionsProps) {
  const isProcessing = Boolean(processingAction);
  const visibleActions = patient.status === "Nonaktif"
    ? actions.filter((action) => action !== "delete")
    : actions.filter((action) => action !== "activate");

  return (
    <div className="flex items-center justify-end gap-0.5">
      {visibleActions.map((action) => {
        const config = actionConfig[action];
        const Icon = config.icon;

        return (
          <IconActionButton
            key={action}
            label={`${config.label} ${patient.name}`}
            tone={config.tone}
            size="sm"
            loading={processingAction === `${action}-${patient.id}`}
            disabled={isProcessing}
            onClick={() => onAction?.(action, patient)}
          >
            <Icon size={16} />
          </IconActionButton>
        );
      })}
    </div>
  );
}
