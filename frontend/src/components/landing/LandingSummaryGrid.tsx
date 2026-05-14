import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";

interface LandingSummaryGridProps {
  readonly stats: readonly SummaryCardItem[];
  readonly className?: string;
}

export default function LandingSummaryGrid({ stats, className = "" }: LandingSummaryGridProps) {
  return <SummaryCardGrid stats={stats} variant="compact" compactLayout="constrained" className={`mt-10 lg:mt-12 ${className}`} />;
}
