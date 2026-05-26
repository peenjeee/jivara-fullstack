"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActivityDistributionItem } from "@/helpers/patientDetails";
import EmptyState from "@/components/ui/EmptyState";
import PatientDetailSection from "./PatientDetailSection";

type DoughnutComponent = typeof import("react-chartjs-2").Doughnut;

interface PatientActivityDistributionChartProps {
  readonly distribution: readonly ActivityDistributionItem[];
}

export default function PatientActivityDistributionChart({ distribution }: PatientActivityDistributionChartProps) {
  const [DoughnutComponent, setDoughnutComponent] = useState<DoughnutComponent | null>(null);
  const chartInitRef = useRef(false);

  useEffect(() => {
    if (chartInitRef.current) return;
    chartInitRef.current = true;
    async function init() {
      const [chartjs, reactChartjs2] = await Promise.all([
        import("chart.js") as Promise<typeof import("chart.js")>,
        import("react-chartjs-2") as Promise<typeof import("react-chartjs-2")>,
      ]);
      chartjs.Chart.register(chartjs.ArcElement, chartjs.Tooltip, chartjs.Legend);
      chartjs.Chart.defaults.font.family = "Inter, system-ui, sans-serif";
      setDoughnutComponent(() => reactChartjs2.Doughnut);
    }
    void init();
  }, []);

  const total = distribution.reduce((sum, item) => sum + item.value, 0);
  const data = useMemo(() => ({
    labels: distribution.map((item) => item.label),
    datasets: [{
      data: distribution.map((item) => item.value),
      backgroundColor: ["#147245", "#419939", "#7baa2e"],
      borderColor: "#ffffff",
      borderWidth: 4,
      hoverOffset: 8,
    }],
  }), [distribution]);
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 12,
        boxPadding: 8,
        titleMarginBottom: 8,
        titleFont: { family: "Inter, system-ui, sans-serif", size: 13, weight: 700 },
        bodyFont: { family: "Inter, system-ui, sans-serif", size: 13, weight: 700 },
        callbacks: {
          label: (context: { parsed: number }) => `${context.parsed} Log`,
        },
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any), []);

  return (
    <PatientDetailSection title="Distribusi Aktivitas" delay={0.22}>
      {total > 0 ? (
        <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center lg:grid-cols-1 xl:grid-cols-[180px_1fr]">
          <div className="relative h-48">
            <div className="relative z-10 h-full">
              {DoughnutComponent && <DoughnutComponent data={data} options={options} />}
            </div>
            <div className="pointer-events-none absolute inset-0 z-0 grid place-items-center text-center">
              <div>
                <p className="font-display text-3xl font-extrabold tracking-[-0.06em] text-text-main">{total}</p>
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted">Log</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-y-3">
            {distribution.map((item, index) => (
              <div key={item.label} className="flex items-center justify-between gap-3 px-1 py-2">
                <span className="flex items-center gap-2 text-sm font-extrabold text-text-main">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: ["#147245", "#419939", "#7baa2e"][index] }} />
                  {item.label}
                </span>
                <span className="text-sm font-black text-text-main">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="Belum ada aktivitas pasien." />
      )}
    </PatientDetailSection>
  );
}
