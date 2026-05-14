"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import SelectField from "@/components/ui/SelectField";
import { FORM_INPUT_CLASS } from "@/components/ui/formStyles";
import type { NurseRecord } from "@/lib/mocks/nurses";

interface BulkReassignModalProps {
  readonly isOpen: boolean;
  readonly selectedCount: number;
  readonly sourceNurseId: string;
  readonly nurses: readonly NurseRecord[];
  readonly onClose: () => void;
  readonly onSubmit: (targetNurseId: string) => void | Promise<void>;
}

export default function BulkReassignModal({ isOpen, selectedCount, sourceNurseId, nurses, onClose, onSubmit }: BulkReassignModalProps) {
  const targetOptions = nurses
    .filter((nurse) => nurse.status === "Aktif" && nurse.id !== sourceNurseId)
    .map((nurse) => ({ label: nurse.fullName, value: nurse.id }));
  const [targetNurseId, setTargetNurseId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeModal = () => {
    setTargetNurseId("");
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!targetNurseId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(targetNurseId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Reassign Pasien" description={`${selectedCount} pasien akan dipindahkan ke perawat aktif lain.`} onClose={closeModal}>
      {targetOptions.length ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <FormField label="Perawat Tujuan" required>
            <SelectField id="targetNurseId" value={targetNurseId} placeholder="Pilih" className={FORM_INPUT_CLASS} options={targetOptions} inlineOptions onChange={setTargetNurseId} />
          </FormField>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="submit" loading={isSubmitting}>Reassign Pasien</Button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl bg-surface p-5 text-sm font-bold leading-6 text-muted">
          Tidak ada perawat aktif lain untuk menerima pasien. Aktifkan atau tambahkan perawat terlebih dahulu.
        </div>
      )}
    </Modal>
  );
}
