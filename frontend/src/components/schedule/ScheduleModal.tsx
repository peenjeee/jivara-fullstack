"use client";

import Modal from "@/components/ui/Modal";
import type { PatientRecord } from "@/lib/mocks/patients";
import ScheduleForm, { type ScheduleFormValues } from "./ScheduleForm";

interface ScheduleModalProps {
  readonly isOpen: boolean;
  readonly patients: readonly PatientRecord[];
  readonly initialValues?: ScheduleFormValues;
  readonly mode?: "add" | "edit";
  readonly patientLocked?: boolean;
  readonly medicineIndexOffset?: number;
  readonly medicineIndexOffsetByPatient?: Readonly<Record<string, number>>;
  readonly onClose: () => void;
  readonly onSubmit: (values: ScheduleFormValues) => void;
}

export default function ScheduleModal({ isOpen, patients, initialValues, mode = "add", patientLocked = false, medicineIndexOffset = 0, medicineIndexOffsetByPatient = {}, onClose, onSubmit }: ScheduleModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={mode === "edit" ? "Edit Jadwal Obat" : "Tambah Jadwal Obat"}
      onClose={onClose}
    >
      <ScheduleForm
        patients={patients}
        initialValues={initialValues}
        mode={mode}
        patientLocked={patientLocked}
        medicineIndexOffset={medicineIndexOffset}
        medicineIndexOffsetByPatient={medicineIndexOffsetByPatient}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
}
