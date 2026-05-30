"use client";

import { m } from "motion/react";
import { Bell, Box, CheckCircle2, Clock3 } from "lucide-react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { getDateKey, getScheduleConfirmedDoseCount, getScheduleDoseCount, getScheduleDoseWindow, isSameDate } from "@/helpers/patientSchedule";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "./ScheduleStatusBadge";

interface PatientDailyMedicineListProps {
  readonly selectedDate: Date;
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly canConfirm: boolean;
  readonly hasFoodScan: boolean;
  readonly confirmedScheduleIds: readonly string[];
  readonly confirmedScheduleDates: Readonly<Record<string, readonly string[]>>;
  readonly confirmingScheduleId?: string | null;
  readonly onConfirm: (schedule: MedicationScheduleRecord) => void;
}

type DailyMedicineCardState = {
  readonly canConfirm: boolean;
  readonly hasFoodScan: boolean;
  readonly isToday: boolean;
  readonly confirmed: boolean;
  readonly isConfirming: boolean;
  readonly isAnyConfirming: boolean;
};

export default function PatientDailyMedicineList({ selectedDate, schedules, canConfirm, hasFoodScan, confirmedScheduleIds, confirmedScheduleDates, confirmingScheduleId = null, onConfirm }: PatientDailyMedicineListProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const isToday = isSameDate(selectedDate, new Date());

  return (
    <m.section
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      {...getDashboardEntranceMotion(shouldAnimate, 0.24, 22)}
    >
      <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Jadwal Hari Ini</h2>

      <div className="mt-5 space-y-4">
        {schedules.length > 0 ? schedules.map((schedule, index) => (
          <DailyMedicineCard
            key={`${getDateKey(selectedDate)}-${schedule.id}`}
            schedule={schedule}
            index={index}
            state={{
              canConfirm: isToday && canConfirm,
              hasFoodScan,
              isToday,
              confirmed: confirmedScheduleIds.filter((scheduleId) => scheduleId === schedule.id).length >= getScheduleDoseCount(schedule),
              isConfirming: confirmingScheduleId === schedule.id,
              isAnyConfirming: Boolean(confirmingScheduleId),
            }}
            confirmedDoseCount={getScheduleConfirmedDoseCount(schedule, selectedDate, { [getDateKey(selectedDate)]: confirmedScheduleIds })}
            doseWindow={getScheduleDoseWindow(schedule, selectedDate, confirmedScheduleDates)}
            onConfirm={() => onConfirm(schedule)}
          />
        )) : (
          <EmptyState title="Tidak ada jadwal obat." description="Tidak ada obat aktif untuk tanggal yang dipilih." className="shadow-none" />
        )}
      </div>
    </m.section>
  );
}

function DailyMedicineCard({ schedule, index, state, confirmedDoseCount, doseWindow, onConfirm }: { readonly schedule: MedicationScheduleRecord; readonly index: number; readonly state: DailyMedicineCardState; readonly confirmedDoseCount: number; readonly doseWindow: ReturnType<typeof getScheduleDoseWindow>; readonly onConfirm: () => void }) {
  const shouldAnimate = useDashboardEntranceMotion();
  const { canConfirm, hasFoodScan, isToday, confirmed, isConfirming, isAnyConfirming } = state;
  const doseCount = getScheduleDoseCount(schedule);
  const isInactive = schedule.status === "Nonaktif";
  const isCompleted = schedule.status === "Selesai" || schedule.stock <= 0;
  const canConfirmCurrentDose = canConfirm && doseWindow.canConfirm && !isInactive && !isCompleted && !isAnyConfirming;

  return (
    <m.article
      className="rounded-3xl bg-surface p-5 sm:p-6"
      {...getDashboardEntranceMotion(shouldAnimate, index * 0.05, 14)}
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
            <p className="text-center text-xs font-extrabold leading-5 text-muted">{confirmedDoseCount}/{doseCount} dosis selesai</p>
            {confirmed ? (
              <p className="rounded-full bg-leaf/10 px-4 py-3 text-center text-xs font-extrabold leading-5 text-leaf">Anda telah konfirmasi obat ini.</p>
            ) : isCompleted ? (
              <p className="rounded-full bg-danger/10 px-4 py-3 text-center text-xs font-extrabold leading-5 text-danger">Obat sudah selesai, jadi tidak bisa dikonfirmasi.</p>
            ) : isInactive ? (
              <p className="rounded-full bg-muted/10 px-4 py-3 text-center text-xs font-extrabold leading-5 text-muted">Obat sedang nonaktif, jadi tidak bisa dikonfirmasi.</p>
            ) : (
              <Button size="sm" className="rounded-full bg-primary text-[12px]" loading={isConfirming} disabled={!canConfirmCurrentDose} onClick={onConfirm} icon={<CheckCircle2 size={16} />}>
                Konfirmasi Minum
              </Button>
            )}
            {!isToday && <p className="text-center text-xs font-extrabold leading-5 text-muted">Konfirmasi hanya tersedia untuk hari ini.</p>}
            {isToday && !hasFoodScan && !confirmed && !isInactive && !isCompleted && <p className="text-center text-xs font-extrabold leading-5 text-danger">Scan makanan dulu sebelum konfirmasi minum obat.</p>}
            {isToday && hasFoodScan && !canConfirm && !confirmed && !isInactive && !isCompleted && <p className="text-center text-xs font-extrabold leading-5 text-danger">Hasil scan belum mendeteksi makanan. Konfirmasi tersedia setelah makanan terdeteksi.</p>}
            {isToday && doseWindow.isBeforeFirstDose && !confirmed && !isInactive && !isCompleted && <p className="text-center text-xs font-extrabold leading-5 text-muted">Konfirmasi tersedia mulai jam {schedule.times[0] ?? "jadwal pertama"}.</p>}
            {isToday && doseWindow.isCurrentDoseConfirmed && !confirmed && !isInactive && !isCompleted && <p className="text-center text-xs font-extrabold leading-5 text-leaf">Dosis jam ini sudah dikonfirmasi. Tunggu jadwal berikutnya{doseWindow.nextDoseTime ? ` pukul ${doseWindow.nextDoseTime}` : ""}.</p>}
          </div>
        </div>
      </div>
    </m.article>
  );
}
