import type { LucideIcon } from "lucide-react";

export type SummaryCardTone = "safe" | "warning" | "critical" | "neutral";
export type SummaryCardColor = "primary" | "forest" | "emerald" | "pine" | "leaf" | "lime" | "safe" | "warning" | "danger" | "surface";

export interface SummaryCardItem {
  readonly label: string;
  readonly value: string;
  readonly helper?: string;
  readonly tone: SummaryCardTone;
  readonly color?: SummaryCardColor;
  readonly icon: LucideIcon;
  readonly progress?: number;
}

interface SummaryCardProps {
  readonly stat: SummaryCardItem;
}

const cardColorStyles: Record<SummaryCardColor, string> = {
  primary: "bg-primary/10",
  forest: "bg-forest/10",
  emerald: "bg-emerald/10",
  pine: "bg-pine/10",
  leaf: "bg-leaf/10",
  lime: "bg-lime/10",
  safe: "bg-safe/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
  surface: "bg-surface",
};

const iconColorStyles: Record<SummaryCardColor, string> = {
  primary: "text-primary",
  forest: "text-forest",
  emerald: "text-emerald",
  pine: "text-pine",
  leaf: "text-leaf",
  lime: "text-lime",
  safe: "text-safe",
  warning: "text-warning",
  danger: "text-danger",
  surface: "text-muted",
};

const progressToneStyles: Record<SummaryCardTone, string> = {
  safe: "bg-leaf",
  warning: "bg-warning",
  critical: "bg-danger",
  neutral: "bg-muted",
};

export default function SummaryCard({ stat }: SummaryCardProps) {
  const Icon = stat.icon;
  const color = stat.color ?? (stat.tone === "critical" ? "danger" : "primary");

  return (
    <article className={`relative h-full min-h-[160px] overflow-hidden rounded-3xl px-4 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)] sm:min-h-[220px] sm:px-8 sm:py-8 ${cardColorStyles[color]}`}>
      <div className="relative z-10 flex h-full flex-col justify-between gap-5 sm:gap-7">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
          <Icon className={`mt-1 h-8 w-8 shrink-0 sm:h-10 sm:w-10 ${iconColorStyles[color]}`} strokeWidth={2.4} />
          <div className="flex flex-col gap-6 sm:gap-10">
            <p className="text-sm font-black leading-tight tracking-[-0.04em] text-text-main sm:text-xl">{stat.label}</p>
            <p className="font-body text-4xl font-black leading-none tracking-[-0.07em] text-text-main sm:text-5xl">{stat.value}</p>
          </div>
        </div>

        {stat.progress ? (
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${progressToneStyles[stat.tone]}`} style={{ width: `${stat.progress}%` }} />
          </div>
        ) : stat.helper ? (
          <p className={`max-w-[260px] text-sm font-bold leading-6 ${stat.tone === "critical" ? "text-muted" : "text-emerald"}`}>{stat.helper}</p>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </article>
  );
}
