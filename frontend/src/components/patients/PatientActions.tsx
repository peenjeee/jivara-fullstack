import { Edit3, Eye, Trash2 } from "lucide-react";
import IconActionButton from "@/components/ui/IconActionButton";
import type { PatientRecord } from "@/lib/mocks/patients";

export type PatientAction = "view" | "edit" | "delete";

interface PatientActionsProps {
  readonly patient: PatientRecord;
  readonly actions?: readonly PatientAction[];
  readonly onAction?: (action: PatientAction, patient: PatientRecord) => void;
}

const actionConfig = {
  view: { label: "Lihat detail", icon: Eye, tone: "primary" },
  edit: { label: "Edit", icon: Edit3, tone: "warning" },
  delete: { label: "Hapus", icon: Trash2, tone: "delete" },
} as const;

export default function PatientActions({ patient, actions = ["view"], onAction }: PatientActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {actions.map((action) => {
        const config = actionConfig[action];
        const Icon = config.icon;

        return (
          <IconActionButton
            key={action}
            label={`${config.label} ${patient.name}`}
            tone={config.tone}
            size="sm"
            onClick={() => onAction?.(action, patient)}
          >
            <Icon size={16} />
          </IconActionButton>
        );
      })}
    </div>
  );
}
