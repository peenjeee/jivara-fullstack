import type { LucideIcon } from "lucide-react";

export type SummaryCardTone = "safe" | "warning" | "critical" | "neutral";
export type SummaryCardColor = "primary" | "safe" | "warning" | "danger" | "surface";

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
  safe: "bg-safe/10",
  warning: "bg-warning/10",
  danger: "bg-danger/10",
  surface: "bg-surface",
};

const iconColorStyles: Record<SummaryCardColor, string> = {
  primary: "text-primary",
  safe: "text-safe",
  warning: "text-warning",
  danger: "text-danger",
  surface: "text-muted",
};

const progressToneStyles: Record<SummaryCardTone, string> = {
  safe: "bg-safe",
  warning: "bg-warning",
  critical: "bg-danger",
  neutral: "bg-muted",
};

export default function SummaryCard({ stat }: SummaryCardProps) {
  const Icon = stat.icon;
  const color = stat.color ?? (stat.tone === "critical" ? "danger" : "primary");

  return (
    <article className={`relative min-h-[220px] overflow-hidden rounded-3xl px-8 py-8 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${cardColorStyles[color]}`}>
      <div className="relative z-10 flex h-full flex-col justify-between gap-7">
        <div className="flex items-start gap-5">
          <Icon className={`mt-1 h-10 w-10 shrink-0 ${iconColorStyles[color]}`} strokeWidth={2.4} />
          <div className="flex flex-col gap-10">
            <p className="text-xl font-black leading-tight tracking-[-0.04em] text-text-main">{stat.label}</p>
            <p className="font-body text-5xl font-black leading-none tracking-[-0.07em] text-text-main">{stat.value}</p>
          </div>
        </div>

        {stat.progress ? (
          <div className="mt-4 h-2 rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${progressToneStyles[stat.tone]}`} style={{ width: `${stat.progress}%` }} />
          </div>
        ) : stat.helper ? (
          <p className={`max-w-[260px] text-sm font-bold leading-6 ${stat.tone === "critical" ? "text-muted" : "text-safe"}`}>{stat.helper}</p>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </article>
  );
}
