"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { m } from "motion/react";
import SelectField from "@/components/ui/SelectField";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { getSchedulesForDate } from "@/helpers/patientSchedule";
import type { PatientAdherenceDayResponse } from "@/lib/patientDashboardApi";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

interface PatientAdherenceHeatmapProps {
  readonly dailyBreakdown: readonly PatientAdherenceDayResponse[];
  readonly schedules?: readonly MedicationScheduleRecord[];
}

interface HeatmapDay {
  readonly date: Date;
  readonly dateKey: string;
  readonly level: number;
  readonly total: number;
  readonly confirmed: number;
  readonly isOutsideYear: boolean;
  readonly isFuture: boolean;
}

interface HeatmapTooltipState {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly placement: "top" | "bottom";
  readonly left: number;
  readonly align: "center" | "left" | "right";
}

const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const levelClasses = ["bg-surface", "bg-primary/15", "bg-primary/30", "bg-primary/55", "bg-primary"];
const emptySchedules: readonly MedicationScheduleRecord[] = [];

export default function PatientAdherenceHeatmap({ dailyBreakdown, schedules = emptySchedules }: PatientAdherenceHeatmapProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const today = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState(() => today.getFullYear());
  const dailyStats = useMemo(() => getDailyAdherenceStats(dailyBreakdown, schedules), [dailyBreakdown, schedules]);
  const yearOptions = useMemo(() => getYearOptions(dailyBreakdown, today.getFullYear()), [dailyBreakdown, today]);
  const weeks = useMemo(() => getHeatmapWeeks(selectedYear, today, dailyStats), [selectedYear, today, dailyStats]);
  const monthLabels = useMemo(() => getMonthLabels(weeks, selectedYear), [weeks, selectedYear]);
  const cellSize = 20;
  const cellGap = 4;
  const gridWidth = weeks.length * cellSize + (weeks.length - 1) * cellGap;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<HeatmapTooltipState | null>(null);
  const todayKey = useMemo(() => getDateKey(today), [today]);
  const todayColumnIndex = useMemo(() => {
    return weeks.findIndex((week) => week.some((day) => day.dateKey === todayKey));
  }, [todayKey, weeks]);

  const setScrollContainer = useCallback((node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (!node) return;
    requestAnimationFrame(() => {
      scrollHeatmapToColumn(node, todayColumnIndex, cellSize, cellGap);
    });
  }, [cellGap, cellSize, todayColumnIndex]);

  const showTooltip = (label: string, rect: DOMRect) => {
    const viewportPadding = 12;
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 8;
    const shouldFlip = topY < viewportPadding + 24;
    const tooltipWidth = estimateTooltipWidth(label);
    const { left, align } = getTooltipPosition(centerX, tooltipWidth);

    setTooltip({
      label,
      x: centerX,
      y: shouldFlip ? rect.bottom + 8 : rect.top - 8,
      placement: shouldFlip ? "bottom" : "top",
      left,
      align,
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  const handleYearChange = (value: string) => {
    const nextYear = Number(value);
    setSelectedYear(nextYear);
    const container = scrollRef.current;
    if (!container) return;
    const nextWeeks = getHeatmapWeeks(nextYear, today, dailyStats);
    requestAnimationFrame(() => {
      scrollHeatmapToColumn(container, getTodayColumnIndex(nextWeeks, todayKey), cellSize, cellGap);
    });
  };

  return (
    <m.article
      className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8"
      {...getDashboardEntranceMotion(shouldAnimate, 0.18, 22)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Riwayat Kepatuhan Saya</h2>
        </div>
        <div className="w-full sm:w-32">
          <SelectField
            id="patientAdherenceHeatmapYear"
            value={String(selectedYear)}
            options={yearOptions}
            className="rounded-full bg-surface px-4 py-3 text-sm font-extrabold text-text-main transition-colors hover:bg-line/70"
            optionsPlacement="bottom"
            onChange={handleYearChange}
          />
        </div>
      </div>

        <div
          className="mt-6 -mx-4 w-[calc(100%+2rem)] overflow-x-auto overflow-y-visible pb-3 overscroll-x-contain outline-none focus:outline-none focus-visible:outline-none sm:-mx-6 sm:w-[calc(100%+3rem)] xl:-mx-8 xl:w-[calc(100%+4rem)]"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", scrollbarGutter: "stable both-edges" }}
          data-lenis-prevent
          ref={setScrollContainer}
      >
        <div className="min-w-full inline-flex justify-center px-4 sm:px-6 xl:px-8">
          <div className="text-left">
            <div
              className="ml-1 grid gap-1"
              style={{ width: gridWidth, gridTemplateColumns: `repeat(${weeks.length}, ${cellSize}px)` }}
            >
              {monthLabels.map((label) => (
                <span key={`${label.label}-${label.column}`} className="text-[10px] font-bold text-muted sm:text-xs" style={{ gridColumn: `${label.column + 1} / span ${label.span}` }}>
                  {label.label}
                </span>
              ))}
            </div>

            <div
              className="mt-3 grid grid-flow-col grid-rows-7 gap-1"
              style={{ width: gridWidth, gridAutoColumns: `${cellSize}px` }}
            >
              {weeks.flat().map((day) => (
                <HeatmapDayCell
                  key={day.dateKey}
                  day={day}
                  sizeClass="h-4 w-4 rounded-[5px]"
                  onShow={showTooltip}
                  onHide={hideTooltip}
                />
              ))}
            </div>

            <HeatmapLegend />
          </div>
        </div>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-[60000] whitespace-nowrap rounded-2xl bg-text-main px-3 py-2 text-center text-xs font-semibold leading-tight text-white shadow-[0_8px_20px_rgba(15,23,42,0.25)]"
          style={{
            left: tooltip.left,
            top: tooltip.y,
            transform: tooltip.placement === "top"
              ? tooltip.align === "left"
                ? "translate(0, -100%)"
                : tooltip.align === "right"
                  ? "translate(-100%, -100%)"
                  : "translate(-50%, -100%)"
              : tooltip.align === "left"
                ? "translate(0, 0)"
                : tooltip.align === "right"
                  ? "translate(-100%, 0)"
                  : "translate(-50%, 0)",
          }}
        >
          {tooltip.label}
        </div>
      )}

    </m.article>
  );
}

function HeatmapLegend() {
  return (
    <div className="mt-5 flex items-center justify-end gap-2 text-xs font-bold text-muted">
      <span>rendah</span>
      {levelClasses.map((className) => <span key={className} className={`size-4 rounded-[5px] ${className}`} />)}
      <span>tinggi</span>
    </div>
  );
}

function HeatmapDayCell({ day, sizeClass, onShow, onHide }: { readonly day: HeatmapDay; readonly sizeClass: string; readonly onShow: (label: string, rect: DOMRect) => void; readonly onHide: () => void }) {
  if (day.isOutsideYear) {
    return <span className={`${sizeClass} invisible block`} aria-hidden="true" />;
  }

  const label = getTooltipLabel(day);
  const surfaceClass = day.isFuture ? "bg-surface" : levelClasses[day.level];

  return (
    <button
      type="button"
      className="relative inline-block rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      onMouseEnter={(event) => onShow(label, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onHide}
      onFocus={(event) => onShow(label, event.currentTarget.getBoundingClientRect())}
      onBlur={onHide}
      aria-label={label}
    >
      <span className={`${sizeClass} block ${surfaceClass}`} />
    </button>
  );
}

function getHeatmapWeeks(selectedYear: number, today: Date, dailyStats: ReadonlyMap<string, { readonly total: number; readonly confirmed: number }>) {
  const startOfYear = new Date(selectedYear, 0, 1);
  const endOfYear = new Date(selectedYear, 11, 31);
  const start = new Date(startOfYear);
  start.setDate(startOfYear.getDate() - startOfYear.getDay());
  const end = new Date(endOfYear);
  end.setDate(endOfYear.getDate() + (6 - endOfYear.getDay()));
  const dayCount = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const weekCount = Math.ceil(dayCount / 7);

  const days: HeatmapDay[] = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dateKey = getDateKey(date);
    const isOutsideYear = date.getFullYear() !== selectedYear;
    const isFuture = date > today;
    const stats = dailyStats.get(dateKey);

    return {
      date,
      dateKey,
      level: isOutsideYear || isFuture ? 0 : getAdherenceLevel(stats),
      total: isOutsideYear ? 0 : stats?.total ?? 0,
      confirmed: isOutsideYear ? 0 : stats?.confirmed ?? 0,
      isOutsideYear,
      isFuture,
    };
  });

  return Array.from({ length: weekCount }, (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7));
}

function getMonthLabels(weeks: HeatmapDay[][], selectedYear: number) {
  const labels: { label: string; column: number; span: number }[] = [];

  weeks.forEach((week, column) => {
    const firstOfMonth = week.find((day) => day.date.getFullYear() === selectedYear && day.date.getDate() <= 7);
    if (!firstOfMonth) return;

    const label = monthFormatter.format(firstOfMonth.date);
    if (labels.at(-1)?.label === label) return;
    labels.push({ label, column, span: 4 });
  });

  return labels;
}

function getYearOptions(days: readonly PatientAdherenceDayResponse[], fallbackYear: number) {
  const years = new Set<number>([fallbackYear]);
  days.forEach((day) => {
    const year = Number(day.date.slice(0, 4));
    if (Number.isFinite(year)) years.add(year);
  });

  return Array.from(years)
    .toSorted((first, second) => second - first)
    .map((year) => ({ label: String(year), value: String(year) }));
}

function getTodayColumnIndex(weeks: HeatmapDay[][], todayKey: string) {
  return weeks.findIndex((week) => week.some((day) => day.dateKey === todayKey));
}

function scrollHeatmapToColumn(container: HTMLDivElement, columnIndex: number, cellSize: number, cellGap: number) {
  if (columnIndex < 0) {
    container.scrollLeft = 0;
    return;
  }

  const targetLeft = columnIndex * (cellSize + cellGap);
  const centeredLeft = Math.max(0, targetLeft - container.clientWidth / 2 + cellSize / 2);
  container.scrollLeft = centeredLeft;
}

function estimateTooltipWidth(label: string) {
  return Math.max(120, Math.min(320, label.length * 7 + 28));
}

function getTooltipPosition(x: number, tooltipWidth: number) {
  const viewportPadding = 6;
  const minLeft = viewportPadding + tooltipWidth / 2;
  const maxLeft = window.innerWidth - viewportPadding - tooltipWidth / 2;
  const clampedLeft = Math.min(maxLeft, Math.max(minLeft, x));

  if (x <= minLeft) return { left: viewportPadding, align: "left" as const };
  if (x >= maxLeft) return { left: window.innerWidth - viewportPadding, align: "right" as const };
  return { left: clampedLeft, align: "center" as const };
}


function getDailyAdherenceStats(days: readonly PatientAdherenceDayResponse[], schedules: readonly MedicationScheduleRecord[]) {
  return days.reduce<Map<string, { total: number; confirmed: number }>>((statsByDate, day) => {
    const date = getDateFromKey(day.date);
    if (date && schedules.length > 0 && getSchedulesForDate(schedules, date).length === 0) {
      statsByDate.set(day.date, { total: 0, confirmed: 0 });
      return statsByDate;
    }

    statsByDate.set(day.date, {
      total: day.scheduled,
      confirmed: day.confirmed,
    });
    return statsByDate;
  }, new Map());
}

function getAdherenceLevel(stats: { readonly total: number; readonly confirmed: number } | undefined) {
  if (!stats || stats.total === 0) return 0;

  const percentage = Math.round((stats.confirmed / stats.total) * 100);
  if (percentage >= 90) return 4;
  if (percentage >= 75) return 3;
  if (percentage >= 50) return 2;
  if (percentage > 0) return 1;
  return 0;
}

function getTooltipLabel(day: HeatmapDay) {
  if (day.isFuture || day.total === 0) return `${dateFormatter.format(day.date)} - Belum ada data`;

  const percentage = Math.round((day.confirmed / day.total) * 100);
  return `${dateFormatter.format(day.date)} - ${percentage}% (${day.confirmed}/${day.total} dosis dikonfirmasi)`;
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}
