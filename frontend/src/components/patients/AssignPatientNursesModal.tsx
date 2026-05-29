"use client";

import { useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

interface AssignPatientNursesModalProps {
  readonly isOpen: boolean;
  readonly patient: PatientRecord | null;
  readonly nurses: readonly NurseRecord[];
  readonly isLoadingNurses?: boolean;
  readonly onClose: () => void;
  readonly onSubmit: (nurseIds: readonly string[]) => void | Promise<void>;
}

export default function AssignPatientNursesModal({ isOpen, patient, nurses, isLoadingNurses = false, onClose, onSubmit }: AssignPatientNursesModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const activeNurses = nurses.filter((nurse) => nurse.status === "Aktif");

  if (!patient) {
    return <Modal isOpen={isOpen} title="Atur Perawat Pasien" onClose={onClose}><div /></Modal>;
  }

  return <AssignPatientNursesForm key={patient.id} patient={patient} activeNurses={activeNurses} isLoadingNurses={isLoadingNurses} isOpen={isOpen} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} onClose={onClose} onSubmit={onSubmit} />;
}

function AssignPatientNursesForm({ isOpen, patient, activeNurses, isLoadingNurses, isSubmitting, setIsSubmitting, onClose, onSubmit }: { readonly isOpen: boolean; readonly patient: PatientRecord; readonly activeNurses: readonly NurseRecord[]; readonly isLoadingNurses: boolean; readonly isSubmitting: boolean; readonly setIsSubmitting: (value: boolean) => void; readonly onClose: () => void; readonly onSubmit: (nurseIds: readonly string[]) => void | Promise<void> }) {
  const [selectedNurseIds, setSelectedNurseIds] = useState<string[]>(() => patient.assignedNurses?.map((nurse) => nurse.id) ?? (patient.assignedNurseId ? [patient.assignedNurseId] : []));

  const toggleNurse = (nurseId: string) => {
    setSelectedNurseIds((current) => current.includes(nurseId) ? current.filter((id) => id !== nurseId) : [...current, nurseId]);
  };

  const allSelected = activeNurses.length > 0 && selectedNurseIds.length === activeNurses.length;
  const toggleAllNurses = () => {
    setSelectedNurseIds((current) => current.length === activeNurses.length ? [] : activeNurses.map((nurse) => nurse.id));
  };

  const closeModal = () => {
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedNurseIds.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(selectedNurseIds);
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Atur Perawat Pasien" description={`Pilih satu atau lebih perawat yang menangani ${patient.name}.`} onClose={closeModal}>
      {isLoadingNurses ? (
        <AssignNursesSkeleton />
      ) : activeNurses.length > 0 ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="overflow-hidden rounded-3xl border border-line bg-white">
            <div className="grid grid-cols-[64px_1fr] bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
              <div className="px-5 py-4"><SelectionBox checked={allSelected} ariaLabel="Pilih semua perawat" onChange={toggleAllNurses} /></div>
              <div className="px-5 py-4">Perawat</div>
            </div>
            <div className="divide-y divide-line">
            {activeNurses.map((nurse) => {
              const checked = selectedNurseIds.includes(nurse.id);
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
            <Button type="submit" loading={isSubmitting} disabled={selectedNurseIds.length === 0}>Simpan Perawat</Button>
          </div>
        </form>
      ) : (
        <div className="rounded-3xl bg-surface p-5 text-sm font-bold leading-6 text-muted">
          Tidak ada perawat aktif. Aktifkan atau tambahkan perawat terlebih dahulu.
        </div>
      )}
    </Modal>
  );
}

function AssignNursesSkeleton() {
  return (
    <div className="space-y-5" aria-label="Memuat daftar perawat">
      <div className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="grid grid-cols-[64px_1fr] bg-surface">
          <div className="px-5 py-4"><div className="size-5 animate-pulse rounded-md bg-line" /></div>
          <div className="px-5 py-4"><div className="h-4 w-24 animate-pulse rounded-full bg-line" /></div>
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={`assign-nurse-skeleton-${index}`} className="grid grid-cols-[64px_1fr] items-center">
              <div className="px-5 py-4"><div className="size-5 animate-pulse rounded-md bg-line" /></div>
              <div className="px-5 py-4"><div className="h-4 w-40 animate-pulse rounded-full bg-line" /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <div className="h-11 w-24 animate-pulse rounded-full bg-line" />
        <div className="h-11 w-36 animate-pulse rounded-full bg-line" />
      </div>
    </div>
  );
}

function SelectionBox({ checked, ariaLabel, onChange, disabled = false }: { readonly checked: boolean; readonly ariaLabel: string; readonly onChange?: () => void; readonly disabled?: boolean }) {
  return (
    <button type="button" aria-label={ariaLabel} aria-pressed={checked} disabled={disabled} onClick={onChange} className={`inline-flex items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
      <span className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${checked ? "border-primary bg-primary" : "border-muted/55 bg-white"}`}>
        <Check size={13} strokeWidth={3.2} className={`text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} />
      </span>
    </button>
  );
}
