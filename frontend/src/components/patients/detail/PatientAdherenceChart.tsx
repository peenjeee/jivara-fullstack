"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AdherenceRange, AdherenceTrendPoint } from "@/helpers/patientDetails";
import api from "@/lib/axios";
import type { PatientRecord } from "@/lib/mocks/patients";
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
}

interface AdherenceDayResponse {
  readonly date: string;
  readonly scheduled: number;
  readonly confirmed: number;
}

interface AdherenceStatsResponse {
  readonly dailyBreakdown?: AdherenceDayResponse[];
}

const adherenceTrendCacheTtl = 15_000;
const adherenceTrendCache = new Map<string, { data: AdherenceTrendPoint[]; expiresAt: number }>();
const adherenceTrendRequests = new Map<string, Promise<AdherenceTrendPoint[]>>();

const fetchAdherenceTrend = (patientId: string, range: AdherenceRange) => {
  const cacheKey = `${patientId}:${range}`;
  const now = Date.now();
  const cached = adherenceTrendCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.data);
  const activeRequest = adherenceTrendRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const period = typeof range === "number" ? `${range}d` : range;
  const request = api.get<{ data: AdherenceStatsResponse }>("/adherence", { params: { patient_id: patientId, period } })
    .then((response) => {
      const trend = mapDailyBreakdown(response.data.data.dailyBreakdown ?? []);
      adherenceTrendCache.set(cacheKey, { data: trend, expiresAt: Date.now() + adherenceTrendCacheTtl });
      return trend;
    })
    .finally(() => {
      adherenceTrendRequests.delete(cacheKey);
    });

  adherenceTrendRequests.set(cacheKey, request);
  return request;
};

export default function PatientAdherenceChart({ patient }: PatientAdherenceChartProps) {
  const [range, setRange] = useState<AdherenceRange>(7);
  const [trend, setTrend] = useState<AdherenceTrendPoint[]>([]);
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

    fetchAdherenceTrend(patient.id, range)
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
  }, [patient.id, range]);

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
          label: (context: { parsed: { y: number } }) => `${context.parsed.y}% Kepatuhan`,
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

function mapDailyBreakdown(days: readonly AdherenceDayResponse[]): AdherenceTrendPoint[] {
  return days.map((day) => ({
    label: new Date(day.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    value: day.scheduled > 0 ? Math.round((day.confirmed / day.scheduled) * 100) : 100,
  }));
}
