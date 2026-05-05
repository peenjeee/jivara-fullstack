"use client";

import { motion } from "motion/react";
import DetailItem from "@/components/ui/DetailItem";
import Modal from "@/components/ui/Modal";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface PatientMedicineDetailModalProps {
  readonly schedule: MedicationScheduleRecord | null;
  readonly onClose: () => void;
}

export default function PatientMedicineDetailModal({ schedule, onClose }: PatientMedicineDetailModalProps) {
  return (
    <Modal isOpen={Boolean(schedule)} title="Detail Jadwal Obat" onClose={onClose}>
      {schedule && (
        <motion.article
          className="rounded-3xl bg-surface p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
                <ScheduleStatusBadge status={schedule.status} />
              </div>
              <p className="mt-1 text-sm font-bold text-muted">{schedule.dose} - {schedule.medicineForm}</p>
            </div>
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
      )}
    </Modal>
  );
}
