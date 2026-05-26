interface DashboardRouteFallbackProps {
  readonly title?: string;
  readonly summaryCount?: number;
}

export default function DashboardRouteFallback({ title, summaryCount = 3 }: DashboardRouteFallbackProps) {
  return (
    <main className="mx-auto min-h-[60vh] w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8">
      <div className="space-y-6">
        {title ? <h1 className="font-display text-4xl font-extrabold tracking-[-0.05em] text-text-main">{title}</h1> : <div className="h-10 w-48 animate-pulse rounded-2xl bg-line/70" />}
        <div className={`grid auto-rows-fr grid-cols-2 items-stretch gap-4 ${summaryCount === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
          {Array.from({ length: summaryCount }, (_, index) => (
            <div key={index} className={`h-32 animate-pulse rounded-[28px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] ${summaryCount === 3 && index === 2 ? "summary-skeleton-last" : ""}`} />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-[32px] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]" />
      </div>
    </main>
  );
}
