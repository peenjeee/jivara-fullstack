"use client";

import { motion } from "motion/react";
import { CheckCheck, Eye } from "lucide-react";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { formatActivityTime } from "@/helpers/activityLogs";
import { ActivityCategoryBadge, ActivityCategoryIcon, ActivitySeverityBadge } from "./ActivityBadges";

interface ActivityFeedItemProps {
  readonly activity: ActivityLogRecord;
  readonly index: number;
  readonly readOnly?: boolean;
  readonly onMarkRead: (activityId: string) => void;
  readonly onViewDetail: (activity: ActivityLogRecord) => void;
}

export default function ActivityFeedItem({ activity, index, readOnly = false, onMarkRead, onViewDetail }: ActivityFeedItemProps) {
  return (
    <motion.article
      className={`relative rounded-3xl border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-colors sm:p-5 border-transparent`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1], delay: index * 0.035 }}
    >
      {!readOnly && !activity.read && <span className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full bg-primary" aria-label="Belum dibaca" />}

      <div className="flex gap-4">
        <ActivityCategoryIcon category={activity.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <ActivityCategoryBadge category={activity.category} />
            <span className="text-xs font-extrabold text-line">-</span>
            <ActivitySeverityBadge severity={activity.severity} />
            <span className="text-xs font-extrabold text-line">-</span>
            <span className="text-xs font-extrabold text-muted">{formatActivityTime(activity.timestamp)}</span>
          </div>

          <h3 className="mt-3 font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{activity.title}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">{activity.description}</p>

          {activity.patientName && (
            <div className="mt-4 flex items-center gap-2 text-sm font-extrabold text-text-main">
              <span className="text-xs font-extrabold text-emerald">{activity.patientAvatar}</span>
              {activity.patientName}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onViewDetail(activity)} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary transition-colors hover:bg-primary hover:text-white">
              <Eye size={15} /> Detail
            </button>
            {!readOnly && !activity.read && (
              <button type="button" onClick={() => onMarkRead(activity.id)} className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-extrabold text-muted transition-colors hover:bg-line/60 hover:text-text-main">
                <CheckCheck size={15} /> Tandai dibaca
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
