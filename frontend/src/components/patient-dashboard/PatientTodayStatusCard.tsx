"use client";

import { m } from "motion/react";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";

interface PatientTodayStatusCardProps {
  readonly completed: number;
  readonly total: number;
  readonly missed: number;
}

export default function PatientTodayStatusCard({ completed, total, missed }: PatientTodayStatusCardProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const safeTotal = Math.max(total, 1);
  const upcoming = Math.max(total - completed - missed, 0);
  const completedWidth = `${(completed / safeTotal) * 100}%`;
  const upcomingWidth = `${(upcoming / safeTotal) * 100}%`;
  const missedWidth = `${(missed / safeTotal) * 100}%`;

  return (
    <m.article
      className="rounded-[28px] bg-primary/5 px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:px-6"
      {...getDashboardEntranceMotion(shouldAnimate, 0.12, 22)}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-extrabold text-text-main">Status Hari Ini</h2>
        <p className="text-sm font-bold text-muted">{completed}/{total} Selesai</p>
      </div>

      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line">
        <div className="bg-primary" style={{ width: completedWidth }} />
        <div className="bg-indigo-100" style={{ width: upcomingWidth }} />
        <div className="bg-danger" style={{ width: missedWidth }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" />Selesai</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-indigo-100" />Akan datang</span>
        <span className="inline-flex items-center gap-1.5 text-danger"><span className="size-2.5 rounded-full bg-danger" />Terlewat</span>
      </div>
    </m.article>
  );
}
