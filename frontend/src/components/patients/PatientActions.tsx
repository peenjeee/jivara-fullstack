import { Edit3, Eye, Trash2 } from "lucide-react";
import type { PatientRecord } from "@/lib/mocks/patients";

export type PatientAction = "view" | "edit" | "delete";

interface PatientActionsProps {
  readonly patient: PatientRecord;
  readonly actions?: readonly PatientAction[];
  readonly onAction?: (action: PatientAction, patient: PatientRecord) => void;
}

const actionConfig = {
  view: { label: "Lihat detail", icon: Eye, className: "hover:bg-primary/10 hover:text-primary" },
  edit: { label: "Edit", icon: Edit3, className: "hover:bg-warning/10 hover:text-warning" },
  delete: { label: "Hapus", icon: Trash2, className: "text-danger hover:bg-danger/10 hover:text-danger" },
} as const;

export default function PatientActions({ patient, actions = ["view"], onAction }: PatientActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {actions.map((action) => {
        const config = actionConfig[action];
        const Icon = config.icon;
        const baseTone = action === "delete" ? "text-danger" : "text-muted";

        return (
          <button
            key={action}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${baseTone} ${config.className}`}
            aria-label={`${config.label} ${patient.name}`}
            onClick={() => onAction?.(action, patient)}
          >
            <Icon size={16} />
          </button>
        );
      })}
    </div>
  );
}
