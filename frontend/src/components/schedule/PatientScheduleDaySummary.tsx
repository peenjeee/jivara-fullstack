"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CalendarCheck2, CalendarClock, CheckCircle2, Eye } from "lucide-react";
import { getConfirmedCount, getDayStatus, getReadableDate } from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import PatientMedicineDetailModal from "./PatientMedicineDetailModal";

interface PatientScheduleDaySummaryProps {
  readonly selectedDate: Date;
  readonly schedulesForDate: readonly MedicationScheduleRecord[];
  readonly allSchedules: readonly MedicationScheduleRecord[];
  readonly confirmedScheduleDates: Readonly<Record<string, readonly string[]>>;
}

const statusContent = {
  empty: { title: "Tidak ada jadwal", description: "Tidak ada obat aktif untuk tanggal ini.", icon: CalendarClock, className: "text-muted" },
  done: { title: "Selesai", description: "Semua obat pada tanggal ini sudah dikonfirmasi.", icon: CheckCircle2, className: "text-primary" },
  active: { title: "Belum selesai", description: "Konfirmasi obat setelah scan makanan hari ini.", icon: CalendarCheck2, className: "text-warning" },
  missed: { title: "Terlewat", description: "Ada jadwal obat lampau yang belum dikonfirmasi.", icon: AlertTriangle, className: "text-danger" },
  upcoming: { title: "Akan datang", description: "Jadwal ini belum bisa dikonfirmasi.", icon: CalendarClock, className: "text-[var(--blue)]" },
} as const;

export default function PatientScheduleDaySummary({ selectedDate, schedulesForDate, allSchedules, confirmedScheduleDates }: PatientScheduleDaySummaryProps) {
  const [selectedSchedule, setSelectedSchedule] = useState<MedicationScheduleRecord | null>(null);
  const status = getDayStatus(allSchedules, selectedDate, confirmedScheduleDates, new Date());
  const content = statusContent[status];
  const Icon = content.icon;
  const confirmedCount = getConfirmedCount(schedulesForDate, selectedDate, confirmedScheduleDates);
  const totalSchedules = schedulesForDate.length;
  const safeTotal = Math.max(totalSchedules, 1);
  const missedCount = status === "missed" ? Math.max(totalSchedules - confirmedCount, 0) : 0;
  const upcomingCount = status === "missed" ? 0 : Math.max(totalSchedules - confirmedCount, 0);
  const completedWidth = `${(confirmedCount / safeTotal) * 100}%`;
  const upcomingWidth = `${(upcomingCount / safeTotal) * 100}%`;
  const missedWidth = `${(missedCount / safeTotal) * 100}%`;

  return (
    <motion.section
      className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
    >
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${content.className}`}>
          <Icon size={28} strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">{getReadableDate(selectedDate)}</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.05em] text-text-main">{content.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">{content.description}</p>
        </div>
      </div>

      <div className="mt-6 rounded-[28px] bg-primary/5 px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-extrabold text-text-main">Progress Obat</p>
          <p className="text-sm font-bold text-muted">{confirmedCount}/{totalSchedules} Selesai</p>
        </div>

        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line">
          <div className="bg-primary" style={{ width: completedWidth }} />
          <div className="bg-[var(--blue)]/25" style={{ width: upcomingWidth }} />
          <div className="bg-danger" style={{ width: missedWidth }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Selesai</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[var(--blue)]" />Akan datang</span>
          <span className="inline-flex items-center gap-1.5 text-danger"><span className="h-2.5 w-2.5 rounded-full bg-danger" />Terlewat</span>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-text-main">Semua Obat Saya</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-muted">Daftar obat aktif yang sedang dijadwalkan.</p>
          </div>
          <p className="text-xs font-extrabold text-muted">{allSchedules.length} obat</p>
        </div>

        <div className="mt-4 space-y-2">
          {allSchedules.length > 0 ? allSchedules.map((schedule, index) => (
            <div key={`day-summary-schedule-${schedule.id}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3">
              <p className="min-w-0 truncate text-sm font-extrabold text-text-main">{schedule.medicineName}</p>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-line/60 hover:text-text-main"
                onClick={() => setSelectedSchedule(schedule)}
                aria-label={`Lihat detail ${schedule.medicineName}`}
              >
                <Eye size={17} />
              </button>
            </div>
          )) : (
            <div className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-muted">Belum ada obat aktif.</div>
          )}
        </div>
      </div>

      <PatientMedicineDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
    </motion.section>
  );
}
