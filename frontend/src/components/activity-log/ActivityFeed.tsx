"use client";

import LoadMoreButton from "@/components/ui/LoadMoreButton";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { groupActivityLogsByDate } from "@/helpers/activityLogs";
import ActivityFeedItem from "./ActivityFeedItem";

interface ActivityFeedProps {
  readonly activities: readonly ActivityLogRecord[];
  readonly visibleCount: number;
  readonly onLoadMore: () => void;
  readonly onMarkRead: (activityId: string) => void;
  readonly onViewDetail: (activity: ActivityLogRecord) => void;
  readonly readOnly?: boolean;
}

export default function ActivityFeed({ activities, visibleCount, onLoadMore, onMarkRead, onViewDetail, readOnly = false }: ActivityFeedProps) {
  const visibleActivities = activities.slice(0, visibleCount);
  const groups = groupActivityLogsByDate(visibleActivities);
  const hasMore = visibleCount < activities.length;

  if (activities.length === 0) {
    return (
      <section className="rounded-3xl bg-white px-5 py-16 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-sm font-bold text-muted">Tidak ada data aktivitas.</p>
      </section>
    );
  }

  return (
    <section className="space-y-7">
      {groups.map((group) => (
        <div key={group.dateKey} className="relative">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-primary" />
            <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{group.label}</h2>
          </div>
          <div className="space-y-4 border-l-2 border-line pl-4 sm:pl-6">
            {group.items.map((activity, index) => (
              <ActivityFeedItem key={activity.id} activity={activity} index={index} readOnly={readOnly} onMarkRead={onMarkRead} onViewDetail={onViewDetail} />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <LoadMoreButton onClick={onLoadMore} />
      )}
    </section>
  );
}
