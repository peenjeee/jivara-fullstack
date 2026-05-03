"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CalendarClock } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DetailItem from "@/components/ui/DetailItem";
import FormStickyActions from "@/components/ui/FormStickyActions";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { formatActivityTime, getActivityDateLabel } from "@/helpers/activityLogs";
import { ActivityCategoryBadge, ActivityCategoryIcon, ActivitySeverityBadge } from "./ActivityBadges";

interface ActivityDetailModalProps {
  readonly activity: ActivityLogRecord | null;
  readonly onClose: () => void;
}

export default function ActivityDetailModal({ activity, onClose }: ActivityDetailModalProps) {
  const scheduleHref = activity?.patientName
    ? `/schedule?patientName=${encodeURIComponent(activity.patientName)}${activity.medicineName ? `&medicineName=${encodeURIComponent(activity.medicineName)}` : ""}`
    : "/schedule";

  return (
    <Modal isOpen={Boolean(activity)} title="Detail Aktivitas" onClose={onClose}>
      {activity && (
        <div className="space-y-5">
          <motion.div
            className="rounded-3xl bg-surface p-5"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex gap-4">
              <ActivityCategoryIcon category={activity.category} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <ActivityCategoryBadge category={activity.category} />
                  <span className="text-xs font-extrabold text-line">•</span>
                  <ActivitySeverityBadge severity={activity.severity} />
                  <span className="text-xs font-extrabold text-line">•</span>
                  <span className={`text-xs font-extrabold ${activity.read ? "text-muted" : "text-primary"}`}>{activity.read ? "Sudah dibaca" : "Belum dibaca"}</span>
                </div>
                <h3 className="mt-3 font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{activity.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-muted">{activity.description}</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Waktu" value={`${getActivityDateLabel(activity.timestamp)}, ${formatActivityTime(activity.timestamp)}`} />
            <DetailItem label="Pasien" value={activity.patientName ?? "Tidak terkait pasien"} />
            <DetailItem label="Obat / Jadwal" value={activity.medicineName ?? activity.scheduleId ?? "Tidak terkait jadwal"} />
          </div>

        </div>
      )}

      {activity?.scheduleId && (
        <FormStickyActions>
          <Link href={scheduleHref} onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] !text-white transition-colors hover:bg-primary-hover [&_svg]:text-white">
            <CalendarClock size={16} /> Lihat Jadwal
          </Link>
        </FormStickyActions>
      )}
    </Modal>
  );
}
