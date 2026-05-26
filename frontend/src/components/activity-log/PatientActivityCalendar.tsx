"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { m } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SelectField from "@/components/ui/SelectField";
import { addMonths, getDateKey } from "@/helpers/patientSchedule";
import { formatActivityTime } from "@/helpers/activityLogs";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
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
const monthOptions = Array.from({ length: 12 }, (_, index) => ({
  value: String(index),
  label: new Date(2026, index, 1).toLocaleDateString("id-ID", { month: "short" }),
}));

const getYearOptions = (date: Date) => {
  const currentYear = new Date().getFullYear();
  const selectedYear = date.getFullYear();
  const startYear = Math.min(currentYear - 5, selectedYear - 2);
  const endYear = Math.max(currentYear + 5, selectedYear + 2);
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);
};

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
  const shouldAnimate = useDashboardEntranceMotion();
  const [openOverflowDateKey, setOpenOverflowDateKey] = useState<string | null>(null);
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(() => getActivityCalendarDays(month, activities, today), [activities, month, today]);

  useEffect(() => {
    if (openOverflowDateKey) {
      document.body.style.overflow = "hidden";
      window.__lenisControl__?.stop();
      return () => {
        document.body.style.overflow = "";
        window.__lenisControl__?.start();
      };
    }
  }, [openOverflowDateKey]);

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
    <m.section
      className="rounded-[28px] border border-line/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
      {...getDashboardEntranceMotion(shouldAnimate, 0.4, 24)}
    >
      <div className="flex flex-col gap-4 border-b border-line/70 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="grid w-full grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 lg:w-[360px]">
          <button type="button" className="flex size-11 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => goToMonth(addMonths(month, -1))} aria-label="Bulan sebelumnya">
            <ChevronLeft size={20} />
          </button>
          <MonthYearSelect month={month} onChange={goToMonth} />
          <button type="button" className="flex size-11 items-center justify-center rounded-2xl text-text-main transition-colors hover:bg-surface" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Bulan berikutnya">
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
            shouldAnimate={shouldAnimate}
            isOverflowOpen={openOverflowDateKey === day.dateKey}
            onToggleOverflow={() => setOpenOverflowDateKey((currentKey) => currentKey === day.dateKey ? null : day.dateKey)}
            onViewDetail={openDetail}
          />
        ))}
      </div>
    </m.section>
  );
}

function MonthYearSelect({ month, onChange }: { readonly month: Date; readonly onChange: (month: Date) => void }) {
  const years = getYearOptions(month).map((year) => ({ label: String(year), value: String(year) }));

  return (
    <div className="flex min-w-0 items-center justify-center gap-2">
      <div className="w-24">
        <SelectField
          id="patientActivityCalendarMonth"
          value={String(month.getMonth())}
          options={monthOptions}
          className="justify-center rounded-xl bg-transparent px-2 py-1 font-display text-2xl font-extrabold text-text-main hover:bg-surface sm:text-3xl"
          onChange={(value) => onChange(new Date(month.getFullYear(), Number(value), 1))}
        />
      </div>
      <div className="w-28">
        <SelectField
          id="patientActivityCalendarYear"
          value={String(month.getFullYear())}
          options={years}
          className="justify-center rounded-xl bg-transparent px-2 py-1 font-display text-2xl font-extrabold text-text-main hover:bg-surface sm:text-3xl"
          onChange={(value) => onChange(new Date(Number(value), month.getMonth(), 1))}
        />
      </div>
    </div>
  );
}

function CalendarDayCell({ day, index, shouldAnimate, isOverflowOpen, onToggleOverflow, onViewDetail }: { readonly day: CalendarDay; readonly index: number; readonly shouldAnimate: boolean; readonly isOverflowOpen: boolean; readonly onToggleOverflow: () => void; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  const visibleActivities = day.activities.slice(0, 2);
  const overflowActivities = day.activities.slice(2);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPosition, setPopupPosition] = useState<{ top: number; left: number; placement: "below" | "above" } | null>(null);

  const popupMaxHeight = Math.min(5, overflowActivities.length) * 64 + 16;

  const handleToggleOverflow = () => {
    if (!isOverflowOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement = spaceBelow < popupMaxHeight && rect.top > popupMaxHeight ? "above" : "below";
      setPopupPosition({
        top: placement === "below" ? rect.bottom + 8 : rect.top - popupMaxHeight - 8,
        left: Math.min(rect.left, window.innerWidth - 260),
        placement,
      });
    } else {
      setPopupPosition(null);
    }
    onToggleOverflow();
  };

  return (
    <m.div
      className={`relative min-h-[112px] border-b border-r border-line/70 p-1.5 sm:min-h-[140px] sm:p-2 lg:min-h-[172px] lg:p-3 ${day.isCurrentMonth ? "bg-white" : "bg-surface/40"}`}
      {...getDashboardEntranceMotion(shouldAnimate, Math.min(index * 0.008, 0.18), 10)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full text-sm font-extrabold ${day.isToday ? "bg-text-main text-white" : day.isCurrentMonth ? "text-text-main" : "text-muted/70"}`}>
          {day.date.getDate()}
        </span>
        {day.activities.some((activity) => !activity.read) && <span className="size-2 rounded-full bg-primary" aria-label={`${day.date.toLocaleDateString("id-ID")}: ada aktivitas belum dibaca`} />}
      </div>

      <div className="space-y-1">
        {visibleActivities.map((activity, activityIndex) => <ActivityCalendarChip key={`${day.dateKey}-${activity.category}-${activity.id}-${activityIndex}`} activity={activity} onViewDetail={onViewDetail} />)}

        {overflowActivities.length > 0 && (
          <div>
            <button ref={buttonRef} type="button" className="text-xs font-extrabold text-muted transition-colors hover:text-primary" onClick={handleToggleOverflow}>
              + {overflowActivities.length} lainnya
            </button>

            {isOverflowOpen && popupPosition && typeof window !== "undefined" && createPortal(
              <button
                type="button"
                aria-label="Tutup daftar aktivitas lainnya"
                className="fixed inset-0 z-[100]"
                onClick={() => { setPopupPosition(null); onToggleOverflow(); }}
              >
                <m.div
                  data-lenis-prevent
                  data-lenis-prevent-wheel
                  data-lenis-prevent-touch
                  className="absolute w-[min(240px,80vw)] overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
                  style={{ top: popupPosition.top, left: popupPosition.left, height: `${popupMaxHeight}px`, overscrollBehavior: "contain", touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
                  initial={{ opacity: 0, y: popupPosition.placement === "above" ? 8 : -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: popupPosition.placement === "above" ? 6 : -6, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    {overflowActivities.map((activity, activityIndex) => <ActivityOverflowItem key={`${day.dateKey}-overflow-${activity.category}-${activity.id}-${activityIndex}`} activity={activity} onViewDetail={onViewDetail} />)}
                  </div>
                </m.div>
              </button>,
              document.body,
            )}
          </div>
        )}
      </div>
    </m.div>
  );
}

function ActivityCalendarChip({ activity, onViewDetail }: { readonly activity: ActivityLogRecord; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  return (
    <m.button
      type="button"
      className={`block w-full truncate rounded-md px-2 py-1 text-left text-[11px] font-extrabold leading-4 transition-transform hover:-translate-y-0.5 sm:text-xs ${categoryChipClasses[activity.category]}`}
      onClick={() => onViewDetail(activity)}
      aria-label={`Lihat detail ${activity.title}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.18 }}
    >
      {formatActivityTime(activity.timestamp)} {activity.title}
    </m.button>
  );
}

function ActivityOverflowItem({ activity, onViewDetail }: { readonly activity: ActivityLogRecord; readonly onViewDetail: (activity: ActivityLogRecord) => void }) {
  return (
    <m.button type="button" className="w-full rounded-xl p-2 text-left transition-colors hover:bg-surface" onClick={() => onViewDetail(activity)} whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
      <span className="flex items-center gap-2 text-xs font-extrabold text-text-main">
        <span className={`size-2 shrink-0 rounded-full ${severityDotClasses[activity.severity]}`} />
        <span className="truncate">{activity.title}</span>
      </span>
      <span className="mt-1 block text-[11px] font-semibold text-muted">{formatActivityTime(activity.timestamp)} - {activity.category}</span>
    </m.button>
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
      activities: (activitiesByDate[dateKey] ?? []).toSorted((first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime()),
    };
  });
}
