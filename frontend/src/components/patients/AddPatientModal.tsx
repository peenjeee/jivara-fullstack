"use client";

import Modal from "@/components/ui/Modal";
import AddPatientForm from "./AddPatientForm";
import type { AddPatientValues } from "./addPatientFormUtils";

interface AddPatientModalProps {
  readonly isOpen: boolean;
  readonly initialValues?: Partial<AddPatientValues>;
  readonly mode?: "add" | "edit";
  readonly onClose: () => void;
  readonly onSubmit: (values: AddPatientValues) => void | Promise<void>;
}

export default function AddPatientModal({ isOpen, initialValues, mode = "add", onClose, onSubmit }: AddPatientModalProps) {
  const isEdit = mode === "edit";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Pasien" : "Tambah Pasien"}>
      <AddPatientForm initialValues={initialValues} mode={mode} onSubmit={onSubmit} onCancel={onClose} />
    </Modal>
  );
}
