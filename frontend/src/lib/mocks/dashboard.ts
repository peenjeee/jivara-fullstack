import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, UsersRound } from "lucide-react";
import type { SummaryCardColor, SummaryCardTone } from "@/components/ui/SummaryCard";
export { patients as recentPatients } from "./patients";

export interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly tone: SummaryCardTone;
  readonly color?: SummaryCardColor;
  readonly icon: LucideIcon;
  readonly progress?: number;
}

export const dashboardStats: DashboardStat[] = [
  {
    label: "Total Pasien",
    value: "6767",
    helper: "",
    tone: "safe",
    color: "pine",
    icon: UsersRound,
  },
  {
    label: "Kepatuhan Keseluruhan",
    value: "67%",
    helper: "Target bulanan 90%",
    tone: "safe",
    color: "leaf",
    icon: CheckCircle2,
    progress: 86,
  },
  {
    label: "Peringatan Kritis",
    value: "67",
    helper: "Memerlukan perhatian segera",
    tone: "critical",
    color: "lime",
    icon: AlertTriangle,
  },
];
