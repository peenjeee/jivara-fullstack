"use client";

import Modal from "@/components/ui/Modal";
import type { PatientRecord } from "@/lib/mocks/patients";
import ScheduleForm from "./ScheduleForm";
import type { ScheduleFormValues } from "./scheduleFormUtils";

interface ScheduleModalProps {
  readonly isOpen: boolean;
  readonly patients: readonly PatientRecord[];
  readonly initialValues?: ScheduleFormValues;
  readonly mode?: "add" | "edit";
  readonly patientLocked?: boolean;
  readonly medicineIndexOffset?: number;
  readonly medicineIndexOffsetByPatient?: Readonly<Record<string, number>>;
  readonly onClose: () => void;
  readonly onSubmit: (values: ScheduleFormValues) => void | Promise<void>;
}

const EMPTY_MEDICINE_INDEX_OFFSET_BY_PATIENT: Readonly<Record<string, number>> = {};

export default function ScheduleModal({ isOpen, patients, initialValues, mode = "add", patientLocked = false, medicineIndexOffset = 0, medicineIndexOffsetByPatient = EMPTY_MEDICINE_INDEX_OFFSET_BY_PATIENT, onClose, onSubmit }: ScheduleModalProps) {
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
