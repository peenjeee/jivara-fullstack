"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { formatActivityTime, getActivityDateLabel } from "@/helpers/activityLogs";
import { ActivityCategoryBadge, ActivityCategoryIcon, ActivitySeverityBadge } from "@/components/activity-log/ActivityBadges";
import PatientDetailSection from "./PatientDetailSection";

interface PatientRecentActivityProps {
  readonly activities: readonly ActivityLogRecord[];
  readonly patientName: string;
}

export default function PatientRecentActivity({ activities, patientName }: PatientRecentActivityProps) {
  const latestActivities = activities.slice(0, 5);
  const activityHref = `/activity-log?patientName=${encodeURIComponent(patientName)}`;

  return (
    <PatientDetailSection
      title="Aktivitas Terbaru"
      action={(
        <Link href={activityHref} prefetch={false} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-extrabold text-text-main transition-colors hover:bg-surface">
          Lihat Semua <ArrowRight size={15} />
        </Link>
      )}
      delay={0.32}
    >
      {latestActivities.length > 0 ? (
        <div className="space-y-3">
          {latestActivities.map((activity, index) => (
            <article key={`${activity.category}-${activity.id}-${index}`} className="rounded-3xl bg-surface p-4">
              <div className="flex gap-3">
                <ActivityCategoryIcon category={activity.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ActivityCategoryBadge category={activity.category} />
                    <span className="text-xs font-extrabold text-line">-</span>
                    <ActivitySeverityBadge severity={activity.severity} />
                    <span className="text-xs font-extrabold text-line">-</span>
                    <span className="text-xs font-extrabold text-muted">{getActivityDateLabel(activity.timestamp)}, {formatActivityTime(activity.timestamp)}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-extrabold tracking-[-0.04em] text-text-main">{activity.title}</h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-muted">{activity.description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada aktivitas pasien." />
      )}
    </PatientDetailSection>
  );
}
