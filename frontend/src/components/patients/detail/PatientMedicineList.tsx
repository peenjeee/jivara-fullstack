"use client";

import { Bell, Clock, Package } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import ScheduleStatusBadge from "@/components/schedule/ScheduleStatusBadge";
import PatientDetailSection from "./PatientDetailSection";

interface PatientMedicineListProps {
  readonly schedules: readonly MedicationScheduleRecord[];
}

export default function PatientMedicineList({ schedules }: PatientMedicineListProps) {
  return (
    <PatientDetailSection title="Jadwal Obat" delay={0.24}>
      {schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <article key={`patient-medicine-${schedule.id}-${index}`} className="rounded-3xl bg-surface p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <ScheduleStatusBadge status={schedule.status} />
                    <span className="text-sm font-extrabold text-muted">{schedule.medicineForm}</span>
                  </div>
                  <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{schedule.medicineName}</h3>
                  <p className="mt-3 text-sm font-bold leading-6 text-muted">{schedule.dose} - {schedule.frequency} - {schedule.mealRule}</p>
                  {schedule.instructions && <p className="mt-2 text-sm font-semibold leading-6 text-muted">{schedule.instructions}</p>}
                </div>
                <div className="flex flex-wrap gap-4 text-xs font-extrabold text-muted">
                  <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {schedule.times.join(", ")}</span>
                  <span className="inline-flex items-center gap-1.5"><Package size={14} /> Stok {schedule.stock}</span>
                  <span className="inline-flex items-center gap-1.5"><Bell size={14} /> {schedule.reminderEnabled ? "Reminder aktif" : "Reminder nonaktif"}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada jadwal obat untuk pasien ini." />
      )}
    </PatientDetailSection>
  );
}
