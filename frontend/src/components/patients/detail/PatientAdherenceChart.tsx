"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdherenceRange } from "@/helpers/patientDetails";
import { getDateKey, getScheduleDoseCount, getSchedulesForDate, getTotalDoseCount } from "@/helpers/patientSchedule";
import api from "@/lib/axios";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import PatientDetailSection from "./PatientDetailSection";

type ChartLineComponent = typeof import("react-chartjs-2").Line;
type ChartTypeModule = typeof import("chart.js");
const chartFontFamily = "Inter, system-ui, sans-serif";

const patientAdherenceChartFontFamily = "Inter, system-ui, sans-serif";

const ranges: readonly { label: string; value: AdherenceRange }[] = [
  { label: "7 Hari", value: 7 },
  { label: "14 Hari", value: 14 },
  { label: "30 Hari", value: 30 },
  { label: "1 Tahun", value: "1y" },
  { label: "Semua", value: "all" },
];

interface PatientAdherenceChartProps {
  readonly patient: PatientRecord;
  readonly schedules: readonly MedicationScheduleRecord[];
}

interface ChartTrendPoint {
  readonly label: string;
  readonly value: number | null;
}

interface MedicationLogResponse {
  readonly scheduleId: string;
  readonly status: string;
  readonly scheduledTime: string;
  readonly confirmedAt?: string | null;
  readonly createdAt?: string | null;
}

interface PaginatedResponse<T> {
  readonly data: T[];
  readonly meta?: {
    readonly total?: number;
  };
}

const adherenceTrendCacheTtl = 15_000;
const adherenceTrendCache = new Map<string, { data: ChartTrendPoint[]; expiresAt: number }>();
const adherenceTrendRequests = new Map<string, Promise<ChartTrendPoint[]>>();
const medicationLogPageSize = 100;

const fetchAdherenceTrend = (patientId: string, schedules: readonly MedicationScheduleRecord[], range: AdherenceRange) => {
  const cacheKey = `${patientId}:${range}:${schedules.map((schedule) => `${schedule.id}:${schedule.endDate ?? ""}:${schedule.status}`).join("|")}`;
  const now = Date.now();
  const cached = adherenceTrendCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.data);
  const activeRequest = adherenceTrendRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = getMedicationLogsForRange(patientId, range)
    .then((logs) => {
      const trend = buildTrendFromScheduleHistory(schedules, logs, range);
      adherenceTrendCache.set(cacheKey, { data: trend, expiresAt: Date.now() + adherenceTrendCacheTtl });
      return trend;
    })
    .finally(() => {
      adherenceTrendRequests.delete(cacheKey);
    });

  adherenceTrendRequests.set(cacheKey, request);
  return request;
};

export default function PatientAdherenceChart({ patient, schedules }: PatientAdherenceChartProps) {
  const [range, setRange] = useState<AdherenceRange>(30);
  const [trend, setTrend] = useState<ChartTrendPoint[]>([]);
  const [ChartLine, setChartLine] = useState<ChartLineComponent | null>(null);
  const chartInitializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const [chartjs, reactChartjs2] = await Promise.all([
        import("chart.js") as Promise<ChartTypeModule>,
        import("react-chartjs-2") as Promise<typeof import("react-chartjs-2")>,
      ]);
      if (cancelled) return;
      chartjs.Chart.register(chartjs.CategoryScale, chartjs.LinearScale, chartjs.PointElement, chartjs.LineElement, chartjs.Filler, chartjs.Tooltip, chartjs.Legend);
      chartjs.Chart.defaults.font.family = patientAdherenceChartFontFamily;
      setChartLine(() => reactChartjs2.Line);
      chartInitializedRef.current = true;
    }
    void init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchAdherenceTrend(patient.id, schedules, range)
      .then((nextTrend) => {
        if (!isMounted) return;
        setTrend(nextTrend);
      })
      .catch(() => {
        if (isMounted) setTrend([]);
      });

    return () => {
      isMounted = false;
    };
  }, [patient.id, range, schedules]);

  const data = useMemo(() => ({
    labels: trend.map((point) => point.label),
    datasets: [
      {
        label: "Kepatuhan",
        data: trend.map((point) => point.value),
        borderColor: "#147245",
        backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D; chartArea?: { top: number; bottom: number } } }) => {
          const { ctx, chartArea } = context.chart;
          if (!chartArea) return "rgba(20,114,69,0.08)";
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, "rgba(20,114,69,0.12)");
          gradient.addColorStop(1, "rgba(20,114,69,0)");
          return gradient;
        },
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#147245",
        pointBorderWidth: 3,
        pointHoverRadius: 6,
        pointRadius: range === 30 || range === "1y" || range === "all" ? 2 : 4,
        borderWidth: 3,
        fill: true,
        spanGaps: false,
        tension: 0.42,
      },
    ],
  }), [range, trend]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        displayColors: false,
        padding: 12,
        titleFont: { family: chartFontFamily, size: 13, weight: 700 },
        bodyFont: { family: chartFontFamily, size: 13, weight: 700 },
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => context.parsed.y == null ? "Tidak ada dosis terjadwal" : `${context.parsed.y}% Kepatuhan`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#64748b", font: { family: chartFontFamily, size: 12, weight: 600 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "rgba(15,23,42,0.08)" },
        ticks: { color: "#64748b", font: { family: chartFontFamily, size: 12, weight: 600 }, callback: (value: number) => `${value}%` },
        border: { display: false },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), []);

  return (
    <PatientDetailSection
      title="Tren Kepatuhan"
      action={(
        <div className="flex rounded-full bg-surface p-1">
          {ranges.map((currentRange) => {
            const isActive = currentRange.value === range;

            return (
              <button
                key={currentRange.value}
                type="button"
                onClick={() => setRange(currentRange.value)}
                className={`rounded-full px-3 py-2 text-xs font-extrabold transition-colors ${isActive ? "bg-primary text-white" : "text-muted hover:text-text-main"}`}
              >
                {currentRange.label}
              </button>
            );
          })}
        </div>
      )}
      className="min-h-[420px]"
      delay={0.18}
    >
      <div className="h-[300px] sm:h-[340px]">
        {ChartLine && <ChartLine data={data} options={options} />}
      </div>
    </PatientDetailSection>
  );
}

async function getMedicationLogsForRange(patientId: string, range: AdherenceRange) {
  const window = getRangeWindow(range);
  const params = {
    patient_id: patientId,
    limit: medicationLogPageSize,
    page: 1,
    ...(range !== "all" && window.startDate && { start_date: window.startDate }),
    ...(range !== "all" && window.endDate && { end_date: window.endDate }),
  };

  const firstResponse = await api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", { params });
  const firstPage = firstResponse.data.data;
  const total = firstResponse.data.meta?.total ?? firstPage.length;
  const totalPages = Math.ceil(total / medicationLogPageSize);

  if (totalPages <= 1) return firstPage;

  const additionalResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => api.get<PaginatedResponse<MedicationLogResponse>>("/medication-logs", {
      params: { ...params, page: index + 2 },
    })),
  );

  return [
    ...firstPage,
    ...additionalResponses.flatMap((response) => response.data.data),
  ];
}

function buildTrendFromScheduleHistory(schedules: readonly MedicationScheduleRecord[], logs: readonly MedicationLogResponse[], range: AdherenceRange): ChartTrendPoint[] {
  const schedulesWithEndDates = applyCompletedScheduleEndDates(schedules, logs);
  const window = getRangeWindow(range, schedulesWithEndDates, logs);
  const points: ChartTrendPoint[] = [];

  const startDate = parseDateKey(window.startDate);
  const endDate = parseDateKey(window.endDate);

  for (const date = startDate; date <= endDate; date.setDate(date.getDate() + 1)) {
    const currentDate = new Date(date);
    const dateKey = getDateKey(currentDate);
    const schedulesForDate = getSchedulesForDate(schedulesWithEndDates, currentDate);
    const scheduled = getTotalDoseCount(schedulesForDate);
    const confirmed = schedulesForDate.reduce((total, schedule) => {
      const confirmedDoseCount = logs.filter((log) => (
        log.status === "confirmed"
        && log.scheduleId === schedule.id
        && getMedicationLogDateKey(log) === dateKey
      )).length;
      return total + Math.min(confirmedDoseCount, getScheduleDoseCount(schedule));
    }, 0);

    points.push({
      label: currentDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      value: scheduled > 0 ? Math.round((confirmed / scheduled) * 100) : null,
    });
  }

  return points;
}

function applyCompletedScheduleEndDates(schedules: readonly MedicationScheduleRecord[], logs: readonly MedicationLogResponse[]) {
  const latestLogDateBySchedule = logs.reduce<Record<string, string>>((latestDates, log) => {
    const dateKey = getMedicationLogDateKey(log);
    if (!dateKey) return latestDates;

    const currentDate = latestDates[log.scheduleId];
    if (currentDate && currentDate >= dateKey) return latestDates;

    return {
      ...latestDates,
      [log.scheduleId]: dateKey,
    };
  }, {});

  return schedules.map((schedule) => {
    if (schedule.status !== "Selesai" || schedule.endDate) return schedule;

    return {
      ...schedule,
      endDate: latestLogDateBySchedule[schedule.id] ?? schedule.startDate,
    };
  });
}

function getRangeWindow(range: AdherenceRange, schedules: readonly MedicationScheduleRecord[] = [], logs: readonly MedicationLogResponse[] = []) {
  const today = new Date();
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);

  if (range === "all") {
    const dateKeys = [
      ...schedules.map((schedule) => schedule.startDate),
      ...schedules.map((schedule) => schedule.endDate),
      ...logs.map(getMedicationLogDateKey),
    ].filter((dateKey): dateKey is string => Boolean(dateKey));
    const startDate = dateKeys.length > 0 ? dateKeys.toSorted()[0] : getDateKey(end);
    const hasActiveSchedule = schedules.some((schedule) => schedule.status === "Aktif");
    const endDate = hasActiveSchedule ? getDateKey(end) : dateKeys.toSorted().at(-1) ?? getDateKey(end);
    return { startDate, endDate };
  }

  const days = range === "1y" ? 365 : range;
  const start = new Date(end);
  start.setDate(end.getDate() - days + 1);
  return { startDate: getDateKey(start), endDate: getDateKey(end) };
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMedicationLogDateKey(log: MedicationLogResponse) {
  return (log.scheduledTime || log.confirmedAt || log.createdAt || "").slice(0, 10);
}
