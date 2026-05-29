"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { NurseRecord } from "@/lib/mocks/nurses";

interface BulkReassignModalProps {
  readonly isOpen: boolean;
  readonly selectedCount: number;
  readonly sourceNurseId: string;
  readonly nurses: readonly NurseRecord[];
  readonly onClose: () => void;
  readonly onSubmit: (targetNurseIds: readonly string[]) => void | Promise<void>;
}

export default function BulkReassignModal({ isOpen, selectedCount, sourceNurseId, nurses, onClose, onSubmit }: BulkReassignModalProps) {
  const targetNurses = nurses.filter((nurse) => nurse.status === "Aktif" && nurse.id !== sourceNurseId);
  const [targetNurseIds, setTargetNurseIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const allSelected = targetNurses.length > 0 && targetNurseIds.length === targetNurses.length;

  const toggleNurse = (nurseId: string) => {
    setTargetNurseIds((current) => current.includes(nurseId) ? current.filter((id) => id !== nurseId) : [...current, nurseId]);
  };

  const toggleAllNurses = () => {
    setTargetNurseIds((current) => current.length === targetNurses.length ? [] : targetNurses.map((nurse) => nurse.id));
  };

  const closeModal = () => {
    setTargetNurseIds([]);
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (targetNurseIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(targetNurseIds);
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Reassign Pasien" description={`${selectedCount} pasien akan dipindahkan ke perawat aktif lain.`} onClose={closeModal}>
      {targetNurses.length ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="grid grid-cols-[64px_1fr] bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
              <div className="px-5 py-4"><SelectionBox checked={allSelected} ariaLabel="Pilih semua perawat tujuan" onChange={toggleAllNurses} /></div>
              <div className="px-5 py-4">Perawat Tujuan</div>
            </div>
            <div className="divide-y divide-line">
              {targetNurses.map((nurse) => {
                const checked = targetNurseIds.includes(nurse.id);
                return (
                  <div key={nurse.id} className="grid grid-cols-[64px_1fr] items-center transition-colors hover:bg-surface/60">
                    <div className="px-5 py-4"><SelectionBox checked={checked} ariaLabel={`Pilih ${nurse.fullName}`} onChange={() => toggleNurse(nurse.id)} /></div>
                    <button type="button" className="min-w-0 px-5 py-4 text-left" onClick={() => toggleNurse(nurse.id)}>
                      <span className="block truncate font-extrabold text-text-main">{nurse.fullName}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>Batal</Button>
            <Button type="submit" loading={isSubmitting} disabled={targetNurseIds.length === 0}>Reassign Pasien</Button>
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

function SelectionBox({ checked, ariaLabel, onChange }: { readonly checked: boolean; readonly ariaLabel: string; readonly onChange: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} aria-pressed={checked} onClick={onChange} className="inline-flex cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20">
      <span className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${checked ? "border-primary bg-primary" : "border-muted/55 bg-white"}`}>
        <Check size={13} strokeWidth={3.2} className={`text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} />
      </span>
    </button>
  );
}
