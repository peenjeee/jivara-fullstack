"use client";

import { motion } from "motion/react";
import { Bell, Box, CheckCircle2, Clock3 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { getDateKey, isSameDate } from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface PatientDailyMedicineListProps {
  readonly selectedDate: Date;
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly canConfirm: boolean;
  readonly confirmedScheduleIds: readonly string[];
  readonly onConfirm: (schedule: MedicationScheduleRecord) => void;
}

export default function PatientDailyMedicineList({ selectedDate, schedules, canConfirm, confirmedScheduleIds, onConfirm }: PatientDailyMedicineListProps) {
  const isToday = isSameDate(selectedDate, new Date());

  return (
    <motion.section
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.24 }}
    >
      <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Jadwal Tanggal Terpilih</h2>

      <div className="mt-5 space-y-4">
        {schedules.length > 0 ? schedules.map((schedule, index) => (
          <DailyMedicineCard
            key={`${getDateKey(selectedDate)}-${schedule.id}`}
            schedule={schedule}
            index={index}
            canConfirm={isToday && canConfirm}
            isToday={isToday}
            confirmed={confirmedScheduleIds.includes(schedule.id)}
            onConfirm={() => onConfirm(schedule)}
          />
        )) : (
          <EmptyState title="Tidak ada jadwal obat." description="Tidak ada obat aktif untuk tanggal yang dipilih." className="shadow-none" />
        )}
      </div>
    </motion.section>
  );
}

function DailyMedicineCard({ schedule, index, canConfirm, isToday, confirmed, onConfirm }: { readonly schedule: MedicationScheduleRecord; readonly index: number; readonly canConfirm: boolean; readonly isToday: boolean; readonly confirmed: boolean; readonly onConfirm: () => void }) {
  return (
    <motion.article
      className="rounded-3xl bg-surface p-5 sm:p-6"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ScheduleStatusBadge status={schedule.status} />
            <span className="text-sm font-extrabold text-muted">{schedule.medicineForm}</span>
          </div>
          <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
          <p className="mt-3 text-sm font-bold leading-6 text-muted">{schedule.dose} - {schedule.frequency} - {schedule.mealRule}</p>
          {schedule.instructions && <p className="mt-2 text-sm font-semibold leading-6 text-muted">{schedule.instructions}</p>}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-extrabold text-muted xl:justify-end">
            <span className="inline-flex items-center gap-2"><Clock3 size={15} /> {schedule.times.join(", ")}</span>
            <span className="inline-flex items-center gap-2"><Box size={15} /> Stok {schedule.stock}</span>
            <span className="inline-flex items-center gap-2"><Bell size={15} /> {schedule.reminderEnabled ? "Reminder aktif" : "Reminder nonaktif"}</span>
          </div>

          <div className="mt-5 flex flex-col items-stretch gap-3">
            <Button size="sm" className="rounded-full bg-primary text-[12px]" disabled={!canConfirm || confirmed} onClick={onConfirm} icon={<CheckCircle2 size={16} />}>
              {confirmed ? "Sudah Dikonfirmasi" : "Konfirmasi Minum"}
            </Button>
            {!isToday && <p className="text-center text-xs font-extrabold leading-5 text-muted">Konfirmasi hanya tersedia untuk hari ini.</p>}
            {isToday && !canConfirm && !confirmed && <p className="text-center text-xs font-extrabold leading-5 text-danger">Scan makanan dulu sebelum konfirmasi minum obat.</p>}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
