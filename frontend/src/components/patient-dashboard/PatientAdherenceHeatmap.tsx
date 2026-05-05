"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";

interface PatientAdherenceHeatmapProps {
  readonly adherence: number;
}

interface HeatmapDay {
  readonly date: Date;
  readonly dateKey: string;
  readonly level: number;
  readonly isFuture: boolean;
}

interface HeatmapTooltipState {
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly placement: "top" | "bottom";
}

const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "long", year: "numeric" });
const levelClasses = ["bg-surface", "bg-primary/15", "bg-primary/30", "bg-primary/55", "bg-primary"];

export default function PatientAdherenceHeatmap({ adherence }: PatientAdherenceHeatmapProps) {
  const today = useMemo(() => new Date(), []);
  const weeks = useMemo(() => getHeatmapWeeks(today, adherence), [today, adherence]);
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks]);
  const cellSize = 20;
  const cellGap = 4;
  const gridWidth = weeks.length * cellSize + (weeks.length - 1) * cellGap;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<HeatmapTooltipState | null>(null);
  const [tooltipLeft, setTooltipLeft] = useState<number | null>(null);
  const [tooltipAlign, setTooltipAlign] = useState<"center" | "left" | "right">("center");
  const todayColumnIndex = useMemo(() => {
    const todayKey = getDateKey(today);
    return weeks.findIndex((week) => week.some((day) => day.dateKey === todayKey));
  }, [today, weeks]);

  useEffect(() => {
    if (todayColumnIndex < 0) return;
    const container = scrollRef.current;
    if (!container) return;
    const targetLeft = todayColumnIndex * (cellSize + cellGap);
    const centeredLeft = Math.max(0, targetLeft - container.clientWidth / 2 + cellSize / 2);
    container.scrollLeft = centeredLeft;
  }, [cellGap, cellSize, todayColumnIndex]);

  const showTooltip = (label: string, rect: DOMRect) => {
    const viewportPadding = 12;
    const centerX = rect.left + rect.width / 2;
    const topY = rect.top - 8;
    const shouldFlip = topY < viewportPadding + 24;

    setTooltip({
      label,
      x: centerX,
      y: shouldFlip ? rect.bottom + 8 : rect.top - 8,
      placement: shouldFlip ? "bottom" : "top",
    });
  };

  const hideTooltip = () => {
    setTooltip(null);
  };

  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) {
      setTooltipLeft(null);
      setTooltipAlign("center");
      return;
    }

    const viewportPadding = 6;
    const tooltipWidth = tooltipRef.current.getBoundingClientRect().width;
    const minLeft = viewportPadding + tooltipWidth / 2;
    const maxLeft = window.innerWidth - viewportPadding - tooltipWidth / 2;
    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, tooltip.x));

    if (tooltip.x <= minLeft) {
      setTooltipAlign("left");
      setTooltipLeft(viewportPadding);
      return;
    }

    if (tooltip.x >= maxLeft) {
      setTooltipAlign("right");
      setTooltipLeft(window.innerWidth - viewportPadding);
      return;
    }

    setTooltipAlign("center");
    setTooltipLeft(clampedLeft);
  }, [tooltip]);

  return (
    <motion.article
      className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:p-6 xl:p-8"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main sm:text-2xl">Riwayat Kepatuhan</h2>
        </div>
      </div>

      <div
        className="mt-6 -mx-4 w-[calc(100%+2rem)] overflow-x-auto overflow-y-visible pb-3 overscroll-x-contain outline-none focus:outline-none focus-visible:outline-none sm:-mx-6 sm:w-[calc(100%+3rem)] xl:-mx-8 xl:w-[calc(100%+4rem)]"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", scrollbarGutter: "stable both-edges" }}
        tabIndex={0}
        data-lenis-prevent
        ref={scrollRef}
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
            left: tooltipLeft ?? tooltip.x,
            top: tooltip.y,
            transform: tooltip.placement === "top"
              ? tooltipAlign === "left"
                ? "translate(0, -100%)"
                : tooltipAlign === "right"
                  ? "translate(-100%, -100%)"
                  : "translate(-50%, -100%)"
              : tooltipAlign === "left"
                ? "translate(0, 0)"
                : tooltipAlign === "right"
                  ? "translate(-100%, 0)"
                  : "translate(-50%, 0)",
          }}
          ref={tooltipRef}
        >
          {tooltip.label}
        </div>
      )}

    </motion.article>
  );
}

function HeatmapLegend() {
  return (
    <div className="mt-5 flex items-center justify-end gap-2 text-xs font-bold text-muted">
      <span>rendah</span>
      {levelClasses.map((className) => <span key={className} className={`h-4 w-4 rounded-[5px] ${className}`} />)}
      <span>tinggi</span>
    </div>
  );
}

function HeatmapDayCell({ day, sizeClass, onShow, onHide }: { readonly day: HeatmapDay; readonly sizeClass: string; readonly onShow: (label: string, rect: DOMRect) => void; readonly onHide: () => void }) {
  const label = `${dateFormatter.format(day.date)} - ${day.isFuture ? "Belum ada data" : getLevelLabel(day.level)}`;
  const surfaceClass = day.isFuture ? "bg-surface" : levelClasses[day.level];

  return (
    <span
      className="relative inline-block rounded-[5px] outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
      onMouseEnter={(event) => onShow(label, event.currentTarget.getBoundingClientRect())}
      onMouseLeave={onHide}
      onFocus={(event) => onShow(label, event.currentTarget.getBoundingClientRect())}
      onBlur={onHide}
      tabIndex={0}
      aria-label={label}
    >
      <span className={`${sizeClass} block ${surfaceClass}`} />
    </span>
  );
}

function getHeatmapWeeks(today: Date, adherence: number) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - 364 - end.getDay());

  const days: HeatmapDay[] = Array.from({ length: 53 * 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const isFuture = date > end;

    return {
      date,
      dateKey: getDateKey(date),
      level: isFuture ? 0 : getAdherenceLevel(date, adherence),
      isFuture,
    };
  });

  return Array.from({ length: 53 }, (_, weekIndex) => days.slice(weekIndex * 7, weekIndex * 7 + 7));
}

function getMonthLabels(weeks: HeatmapDay[][]) {
  const labels: { label: string; column: number; span: number }[] = [];

  weeks.forEach((week, column) => {
    const firstOfMonth = week.find((day) => day.date.getDate() <= 7);
    if (!firstOfMonth) return;

    const label = monthFormatter.format(firstOfMonth.date);
    if (labels.at(-1)?.label === label) return;
    labels.push({ label, column, span: 4 });
  });

  return labels;
}


function getAdherenceLevel(date: Date, adherence: number) {
  const score = (date.getDate() * 17 + (date.getMonth() + 1) * 11 + date.getFullYear()) % 100;
  const adjusted = Math.min(100, Math.max(0, adherence - 25 + score / 2));

  if (adjusted >= 88) return 4;
  if (adjusted >= 72) return 3;
  if (adjusted >= 55) return 2;
  if (adjusted >= 35) return 1;
  return 0;
}

function getLevelLabel(level: number) {
  if (level >= 4) return "Kepatuhan sangat baik";
  if (level === 3) return "Kepatuhan baik";
  if (level === 2) return "Kepatuhan cukup";
  if (level === 1) return "Kepatuhan rendah";
  return "Tidak ada konfirmasi";
}

function getDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
