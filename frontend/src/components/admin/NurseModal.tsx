"use client";

import Modal from "@/components/ui/Modal";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { NurseFormValues } from "@/store/nurses";
import NurseForm from "./NurseForm";

interface NurseModalProps {
  readonly isOpen: boolean;
  readonly mode?: "add" | "edit";
  readonly nurse?: NurseRecord | null;
  readonly onClose: () => void;
  readonly onSubmit: (values: NurseFormValues) => void | Promise<void>;
}

export default function NurseModal({ isOpen, mode = "add", nurse, onClose, onSubmit }: NurseModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      title={mode === "add" ? "Tambah Perawat" : "Edit Perawat"}
      onClose={onClose}
    >
      <NurseForm mode={mode} initialValues={nurse ?? undefined} onCancel={onClose} onSubmit={onSubmit} />
    </Modal>
  );
}
