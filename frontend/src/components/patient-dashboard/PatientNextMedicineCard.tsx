"use client";

import { m } from "motion/react";
import { Bell, Box, CheckCircle2, Clock3 } from "lucide-react";
import ScheduleStatusBadge from "@/components/schedule/ScheduleStatusBadge";
import Button from "@/components/ui/Button";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

interface PatientNextMedicineCardProps {
  readonly schedule: MedicationScheduleRecord;
  readonly canConfirm: boolean;
  readonly confirmed: boolean;
  readonly onConfirm: () => void;
}

export default function PatientNextMedicineCard({ schedule, canConfirm, confirmed, onConfirm }: PatientNextMedicineCardProps) {
  const shouldAnimate = useDashboardEntranceMotion();

  return (
    <m.article
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      {...getDashboardEntranceMotion(shouldAnimate, 0.18, 22)}
    >
      <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Obat Berikutnya</h2>
      <div className="mt-5 rounded-3xl bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <ScheduleStatusBadge status={schedule.status} />
              <span className="text-sm font-extrabold text-muted">{schedule.medicineForm}</span>
            </div>
            <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-muted">
              {schedule.dose} - {schedule.frequency} - {schedule.mealRule}
            </p>
            {schedule.instructions && <p className="mt-2 text-sm font-semibold leading-6 text-muted">{schedule.instructions}</p>}
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-extrabold text-muted">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> {schedule.times.join(", ")}</span>
            <span className="inline-flex items-center gap-1.5"><Box size={14} /> Stok {schedule.stock}</span>
            <span className="inline-flex items-center gap-1.5"><Bell size={14} /> {schedule.reminderEnabled ? "Reminder aktif" : "Reminder nonaktif"}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-stretch gap-3 sm:ml-auto sm:max-w-[280px]">
          <Button size="sm" className="rounded-full bg-primary text-[12px]" disabled={!canConfirm || confirmed} onClick={onConfirm} icon={<CheckCircle2 size={16} />}>
            {confirmed ? "Sudah Dikonfirmasi" : "Konfirmasi Minum"}
          </Button>
          {!canConfirm && <p className="text-center text-xs font-extrabold leading-5 text-danger">Scan makanan dulu sebelum konfirmasi minum obat.</p>}
        </div>
      </div>
    </m.article>
  );
}
