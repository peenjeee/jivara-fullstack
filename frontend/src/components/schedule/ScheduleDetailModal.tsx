"use client";

import { motion } from "motion/react";
import Modal from "@/components/ui/Modal";
import DetailItem from "@/components/ui/DetailItem";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import type { MedicationScheduleRecord, PatientScheduleGroup } from "@/lib/mocks/schedules";
import ScheduleActions, { type ScheduleAction } from "./ScheduleActions";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface ScheduleDetailModalProps {
  readonly group: PatientScheduleGroup | null;
  readonly readOnly?: boolean;
  readonly processingAction?: string | null;
  readonly onClose: () => void;
  readonly onAction: (action: ScheduleAction, schedule: MedicationScheduleRecord) => void;
}

export default function ScheduleDetailModal({ group, readOnly = false, processingAction = null, onClose, onAction }: ScheduleDetailModalProps) {
  return (
    <Modal isOpen={Boolean(group)} title="Detail Jadwal Obat" onClose={onClose}>
      {group && (
        <div className="space-y-5">
          <motion.div
            className="flex items-start justify-between gap-4 rounded-3xl bg-surface p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Pasien</p>
              <p className="mt-1 font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{group.patientName}</p>
            </div>
            <PatientStatusBadge status={group.patientStatus} />
          </motion.div>

          <div className="space-y-4">
            {group.schedules.map((schedule, index) => (
              <MedicineDetail key={`schedule-detail-${schedule.id}-${index}`} schedule={schedule} index={index} readOnly={readOnly} processingAction={processingAction} onAction={onAction} />
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function MedicineDetail({ schedule, index, readOnly, processingAction, onAction }: { readonly schedule: MedicationScheduleRecord; readonly index: number; readonly readOnly: boolean; readonly processingAction: string | null; readonly onAction: (action: ScheduleAction, schedule: MedicationScheduleRecord) => void }) {
  return (
    <motion.article
      className="rounded-3xl bg-surface p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 + index * 0.05 }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
            <ScheduleStatusBadge status={schedule.status} />
          </div>
          <p className="mt-1 text-sm font-bold text-muted">{schedule.dose} - {schedule.medicineForm}</p>
        </div>
        {!readOnly && <ScheduleActions schedule={schedule} actions={["edit", "toggle", "delete"]} processingAction={processingAction} onAction={onAction} />}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <DetailItem surface="white" label="Bentuk & Stok" value={`${schedule.medicineForm} - ${schedule.stock} tersisa`} />
        <DetailItem surface="white" label="Frekuensi" value={schedule.frequency} />
        <DetailItem surface="white" label="Waktu" value={schedule.times.join(", ")} />
        <DetailItem surface="white" label="Aturan Makan" value={schedule.mealRule} />
        <DetailItem surface="white" label="Reminder" value={schedule.reminderEnabled ? "Aktif" : "Nonaktif"} />
        <DetailItem surface="white" label="Tanggal" value={`${schedule.startDate} - ${schedule.endDate || "Berlanjut"}`} />
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary">Instruksi</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-muted">{schedule.instructions || "Tidak ada instruksi khusus."}</p>
      </div>
    </motion.article>
  );
}
