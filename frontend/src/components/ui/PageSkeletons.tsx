import DashboardRouteFallback from "@/components/dashboard/DashboardRouteFallback";

export function DashboardPageSkeleton() {
  return <DashboardRouteFallback />;
}

export function SummaryCardsSkeleton({ count = 3 }: { readonly count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`summary-skeleton-${index}`} className="h-32 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      ))}
    </div>
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

export function DetailDataSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-52 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      <SummaryCardsSkeleton count={4} />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
        <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      </div>
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
