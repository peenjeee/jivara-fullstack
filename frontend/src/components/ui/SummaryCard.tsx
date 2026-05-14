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
  readonly compact?: boolean;
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

export default function SummaryCard({ stat, compact = false }: SummaryCardProps) {
  const Icon = stat.icon;
  const color = stat.color ?? (stat.tone === "critical" ? "danger" : "primary");

  const cardSizeClass = compact
    ? "min-h-[130px] rounded-[26px] px-4 py-4 sm:min-h-[170px] sm:px-6 sm:py-6"
    : "min-h-[160px] rounded-3xl px-4 py-5 sm:min-h-[220px] sm:px-8 sm:py-8";
  const contentGapClass = compact ? "gap-4 sm:gap-5" : "gap-5 sm:gap-7";
  const headerGapClass = compact ? "gap-3 sm:gap-4" : "gap-4 sm:gap-5";
  const textGapClass = compact ? "gap-4 sm:gap-7" : "gap-6 sm:gap-10";
  const iconSizeClass = compact ? "h-7 w-7 sm:h-9 sm:w-9" : "h-8 w-8 sm:h-10 sm:w-10";
  const labelSizeClass = compact ? "text-sm sm:text-lg" : "text-sm sm:text-xl";
  const valueSizeClass = compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl";

  if (compact) {
    return (
      <article className={`relative h-full overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${cardSizeClass} ${cardColorStyles[color]}`}>
        <div className="relative z-10 flex h-full items-center gap-5 sm:gap-7">
          <Icon className={`h-12 w-12 shrink-0 sm:h-14 sm:w-14 ${iconColorStyles[color]}`} strokeWidth={2.4} aria-hidden="true" focusable="false" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-5 sm:gap-7">
            <p className={`font-black leading-tight tracking-[-0.04em] text-text-main ${labelSizeClass}`}>{stat.label}</p>
            <p className={`font-body font-black leading-none tracking-[-0.07em] text-text-main ${valueSizeClass}`}>{stat.value}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`relative h-full overflow-hidden shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${cardSizeClass} ${cardColorStyles[color]}`}>
      <div className={`relative z-10 flex h-full flex-col justify-between ${contentGapClass}`}>
        <div className={`flex flex-col items-start sm:flex-row ${headerGapClass}`}>
          <Icon className={`mt-1 shrink-0 ${iconSizeClass} ${iconColorStyles[color]}`} strokeWidth={2.4} aria-hidden="true" focusable="false" />
          <div className={`flex flex-col ${textGapClass}`}>
            <p className={`font-black leading-tight tracking-[-0.04em] text-text-main ${labelSizeClass}`}>{stat.label}</p>
            <p className={`font-body font-black leading-none tracking-[-0.07em] text-text-main ${valueSizeClass}`}>{stat.value}</p>
          </div>
        </div>

        {stat.helper ? (
          <p className={`max-w-[260px] text-sm font-bold leading-6 ${stat.tone === "critical" ? "text-muted" : "text-emerald"}`}>{stat.helper}</p>
        ) : (
          <div className="h-6" />
        )}
      </div>
    </article>
  );
}
