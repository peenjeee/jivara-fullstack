"use client";

import { motion } from "motion/react";
import { Bell, Box, Clock3 } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface PatientAllMedicineListProps {
  readonly schedules: readonly MedicationScheduleRecord[];
}

export default function PatientAllMedicineList({ schedules }: PatientAllMedicineListProps) {
  return (
    <motion.section
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Semua Obat Saya</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">Ringkasan obat aktif yang sedang dijadwalkan.</p>
        </div>
        <p className="text-sm font-extrabold text-muted">{schedules.length} obat</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {schedules.length > 0 ? schedules.map((schedule, index) => <MedicineReadOnlyCard key={`all-medicine-${schedule.id}-${index}`} schedule={schedule} index={index} />) : <EmptyState title="Belum ada obat." description="Obat aktif akan tampil di sini setelah dijadwalkan." className="shadow-none" />}
      </div>
    </motion.section>
  );
}

function MedicineReadOnlyCard({ schedule, index }: { readonly schedule: MedicationScheduleRecord; readonly index: number }) {
  return (
    <motion.article
      className="flex h-full flex-col rounded-3xl bg-surface p-4"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
    >
      <div className="flex flex-wrap items-center gap-3">
        <ScheduleStatusBadge status={schedule.status} />
        <span className="text-sm font-extrabold text-muted">{schedule.medicineForm}</span>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h3 className="truncate font-display text-lg font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-muted">{schedule.dose} - {schedule.frequency} - {schedule.mealRule}</p>
        {schedule.instructions && <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-muted">{schedule.instructions}</p>}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-extrabold text-muted">
        <span className="inline-flex items-center gap-2"><Clock3 size={14} /> {schedule.times.join(", ")}</span>
        <span className="inline-flex items-center gap-2"><Box size={14} /> Stok {schedule.stock}</span>
        <span className="inline-flex items-center gap-2"><Bell size={14} /> {schedule.reminderEnabled ? "Reminder aktif" : "Reminder nonaktif"}</span>
      </div>
    </motion.article>
  );
}
