import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";

export function DashboardPageSkeleton() {
  return <DashboardRouteFallback />;
}

export function SummaryCardsSkeleton({ count = 3 }: { readonly count?: number }) {
  const desktopGridClass = count === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3";

  return (
    <section className={`mt-6 grid auto-rows-fr grid-cols-2 items-stretch gap-4 ${desktopGridClass}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`summary-skeleton-${index}`}
          className={`h-32 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${count === 3 && index === 2 ? "summary-skeleton-last" : ""}`}
        />
      ))}
    </section>
  );
}

export function ToolbarSkeleton() {
  return <div className="h-24 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />;
}

export function TableDataSkeleton({ rows = 6 }: { readonly rows?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="hidden divide-y divide-line md:block">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={`table-skeleton-${index}`} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-4">
            <div className="h-5 animate-pulse rounded-xl bg-line/70" />
            <div className="h-5 animate-pulse rounded-xl bg-line/60" />
            <div className="h-5 animate-pulse rounded-xl bg-line/60" />
            <div className="h-5 animate-pulse rounded-xl bg-line/50" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-line md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`card-skeleton-${index}`} className="space-y-3 p-5">
            <div className="h-5 w-2/3 animate-pulse rounded-xl bg-line/70" />
            <div className="h-4 w-1/2 animate-pulse rounded-xl bg-line/60" />
            <div className="h-10 animate-pulse rounded-2xl bg-line/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityDataSkeleton({ rows = 5 }: { readonly rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={`activity-skeleton-${index}`} className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="h-5 w-2/3 animate-pulse rounded-xl bg-line/70" />
          <div className="mt-3 h-4 w-full animate-pulse rounded-xl bg-line/60" />
          <div className="mt-3 h-4 w-1/3 animate-pulse rounded-xl bg-line/50" />
        </div>
      ))}
    </div>
  );
}

export function PatientDashboardContentSkeleton() {
  return (
    <div className="h-[300px] animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:h-[360px]" />
  );
}

export function PatientScheduleContentSkeleton() {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
        <div className="h-7 w-44 animate-pulse rounded-xl bg-line/70" />
        <div className="mt-8 h-28 animate-pulse rounded-3xl bg-line/45" />
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <section className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="mx-auto h-8 w-56 animate-pulse rounded-xl bg-line/70" />
          <div className="mt-8 grid grid-cols-7 gap-4">
            {Array.from({ length: 42 }).map((_, index) => (
              <div key={`patient-schedule-calendar-skeleton-${index}`} className="mx-auto size-9 animate-pulse rounded-full bg-line/45" />
            ))}
          </div>
        </section>
        <section className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className="h-7 w-44 animate-pulse rounded-xl bg-line/70" />
          <div className="mt-5 h-24 animate-pulse rounded-3xl bg-line/45" />
          <div className="mt-5 h-40 animate-pulse rounded-3xl bg-line/45" />
        </section>
      </div>
    </div>
  );
}

export function PatientActivityCalendarSkeleton() {
  return (
    <section className="rounded-[32px] bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 w-48 animate-pulse rounded-xl bg-line/70" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-line/50" />
      </div>
      <div className="mt-8 grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-line">
        {Array.from({ length: 42 }).map((_, index) => (
          <div key={`patient-activity-calendar-skeleton-${index}`} className="h-24 animate-pulse border border-line/60 bg-line/25 p-3">
            <div className="h-4 w-5 rounded-full bg-line/60" />
            {index % 5 === 0 && <div className="mt-4 h-5 rounded-md bg-line/70" />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function DetailDataSkeleton({ summaryCount = 4 }: { readonly summaryCount?: number }) {
  return (
    <div className="space-y-6">
      <div className="h-52 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      <SummaryCardsSkeleton count={summaryCount} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
        <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      </div>
    </div>
  );
}

export function ButtonSkeleton({ className = "" }: { readonly className?: string }) {
  return <div className={`inline-block h-9 w-36 animate-pulse rounded-full bg-line/60 ${className}`} />;
}

export function DashboardPanelGridSkeleton() {
  return (
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <section key={`panel-skeleton-${index}`} className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="h-7 w-48 animate-pulse rounded-xl bg-line/70" />
            <div className="h-4 w-10 animate-pulse rounded bg-line/50" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, row) => (
              <div key={`panel-skeleton-row-${index}-${row}`} className="rounded-2xl bg-surface px-4 py-3">
                <div className="h-4 w-3/4 animate-pulse rounded-lg bg-line/70" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded-lg bg-line/50" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function FormDataSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-16 animate-pulse rounded-3xl bg-line/60" />
      <div className="flex justify-end pt-2">
        <div className="h-11 w-28 animate-pulse rounded-full bg-line/60" />
      </div>
    </div>
  );
}
