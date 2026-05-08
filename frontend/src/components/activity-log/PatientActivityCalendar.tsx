"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, getDateKey, getMonthLabel } from "@/helpers/patientSchedule";
import { formatActivityTime } from "@/helpers/activityLogs";
import type { ActivityCategory, ActivityLogRecord, ActivitySeverity } from "@/lib/mocks/activityLogs";

interface PatientActivityCalendarProps {
  readonly month: Date;
  readonly activities: readonly ActivityLogRecord[];
  readonly onMonthChange: (month: Date) => void;
  readonly onViewDetail: (activity: ActivityLogRecord) => void;
}

interface CalendarDay {
  readonly date: Date;
  readonly dateKey: string;
  readonly isCurrentMonth: boolean;
  readonly isToday: boolean;
  readonly activities: readonly ActivityLogRecord[];
}

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const categoryChipClasses: Record<ActivityCategory, string> = {
  Reminder: "bg-warning/18 text-[#7a5a14]",
  Kepatuhan: "bg-primary/14 text-primary",
  "Scan Makanan": "bg-[var(--blue)]/14 text-[var(--blue)]",
  Administrasi: "bg-surface text-muted",
};

const severityDotClasses: Record<ActivitySeverity, string> = {
  Info: "bg-warning",
  Sukses: "bg-[var(--blue)]",
  Peringatan: "bg-warning",
  Kritis: "bg-danger",
};

export default function PatientActivityCalendar({ month, activities, onMonthChange, onViewDetail }: PatientActivityCalendarProps) {
  const [openOverflowDateKey, setOpenOverflowDateKey] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => getActivityCalendarDays(month, activities, today), [activities, month, today]);

  const goToToday = () => {
    setOpenOverflowDateKey(null);
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const goToMonth = (nextMonth: Date) => {
    setOpenOverflowDateKey(null);
    onMonthChange(nextMonth);
  };

  const openDetail = (activity: ActivityLogRecord) => {
    setOpenOverflowDateKey(null);
    onViewDetail(activity);
  };

  return (
    <motion.section
      className="overflow-hidden rounded-[28px] border border-line/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
    >
      <div className="flex flex-col gap-4 border-b border-line/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="grid w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 lg:w-[360px]">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => goToMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-center font-display text-2xl font-extrabold tracking-[-0.05em] text-text-main sm:text-3xl">
            {getMonthLabel(month)}
          </h2>
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Bulan berikutnya">
            <ChevronRight size={20} />
          </button>
        </div>

        <button type="button" className="w-full rounded-full bg-surface px-5 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-text-main transition-colors hover:bg-line/70 lg:w-auto" onClick={goToToday}>
          Hari Ini
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-line/70 text-center text-xs font-semibold text-muted sm:text-sm">
        {weekDays.map((day) => (
          <span key={day} className="py-3 sm:py-4">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => (
          <CalendarDayCell
            key={day.dateKey}
            day={day}
            index={index}
            isOverflowOpen={openOverflowDateKey === day.dateKey}
            onToggleOverflow={() => setOpenOverflowDateKey((currentKey) => currentKey === day.dateKey ? null : day.dateKey)}
            onViewDetail={openDetail}
          />
        ))}
      </div>
    </motion.section>
  );
}

function CalendarDayCell({ day, index, isOverflowOpen, onToggleOverflow, onViewDetail }: { readonly day: CalendarDay; readonly index: number; readonly isOverflowOpen: boolean; readonly onToggleOverflow: () => void; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  const visibleActivities = day.activities.slice(0, 2);
  const overflowActivities = day.activities.slice(2);

  return (
    <motion.div
      className={`relative min-h-[112px] border-b border-r border-line/70 p-1.5 sm:min-h-[140px] sm:p-2 lg:min-h-[172px] lg:p-3 ${day.isCurrentMonth ? "bg-white" : "bg-surface/40"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: Math.min(index * 0.008, 0.18) }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-extrabold ${day.isToday ? "bg-text-main text-white" : day.isCurrentMonth ? "text-text-main" : "text-muted/70"}`}>
          {day.date.getDate()}
        </span>
        {day.activities.some((activity) => !activity.read) && <span className="h-2 w-2 rounded-full bg-primary" aria-label={`${day.date.toLocaleDateString("id-ID")}: ada aktivitas belum dibaca`} />}
      </div>

      <div className="space-y-1">
        {visibleActivities.map((activity) => <ActivityCalendarChip key={activity.id} activity={activity} onViewDetail={onViewDetail} />)}

        {overflowActivities.length > 0 && (
          <div className="relative">
            <button type="button" className="text-xs font-extrabold text-muted transition-colors hover:text-primary" onClick={onToggleOverflow}>
              + {overflowActivities.length} lainnya
            </button>

            <AnimatePresence>
              {isOverflowOpen && (
              <motion.div
                className="absolute left-0 top-7 z-50 w-[min(240px,80vw)] rounded-2xl border border-line bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="space-y-1">
                  {overflowActivities.map((activity) => <ActivityOverflowItem key={activity.id} activity={activity} onViewDetail={onViewDetail} />)}
                </div>
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActivityCalendarChip({ activity, onViewDetail }: { readonly activity: ActivityLogRecord; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  return (
    <motion.button
      type="button"
      className={`block w-full truncate rounded-md px-2 py-1 text-left text-[11px] font-extrabold leading-4 transition-transform hover:-translate-y-0.5 sm:text-xs ${categoryChipClasses[activity.category]}`}
      onClick={() => onViewDetail(activity)}
      aria-label={`Lihat detail ${activity.title}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      {formatActivityTime(activity.timestamp)} {activity.title}
    </motion.button>
  );
}

function ActivityOverflowItem({ activity, onViewDetail }: { readonly activity: ActivityLogRecord; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  return (
    <motion.button type="button" className="w-full rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface" onClick={() => onViewDetail(activity)} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
      <span className="flex items-center gap-2 text-xs font-extrabold text-text-main">
        <span className={`h-2 w-2 shrink-0 rounded-full ${severityDotClasses[activity.severity]}`} />
        <span className="truncate">{activity.title}</span>
      </span>
      <span className="mt-1 block text-[11px] font-semibold text-muted">{formatActivityTime(activity.timestamp)} - {activity.category}</span>
    </motion.button>
  );
}

function getActivityCalendarDays(month: Date, activities: readonly ActivityLogRecord[], today: Date): CalendarDay[] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());
  const activitiesByDate = activities.reduce<Record<string, ActivityLogRecord[]>>((accumulator, activity) => {
    const key = getDateKey(new Date(activity.timestamp));
    accumulator[key] = [...(accumulator[key] ?? []), activity];
    return accumulator;
  }, {});
  const todayKey = getDateKey(today);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = getDateKey(date);

    return {
      date,
      dateKey,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: dateKey === todayKey,
      activities: [...(activitiesByDate[dateKey] ?? [])].sort((first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()),
    };
  });
}
