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
    label: "Total Pasien Saya",
    value: "0",
    helper: "",
    tone: "safe",
    color: "pine",
    icon: UsersRound,
  },
  {
    label: "Peringatan Pasien Kritis",
    value: "0",
    helper: "",
    tone: "critical",
    color: "lime",
    icon: AlertTriangle,
  },
  {
    label: "Kepatuhan Pasien Keseluruhan",
    value: "0%",
    helper: "",
    tone: "safe",
    color: "leaf",
    icon: CheckCircle2,
    progress: 0,
  }
];
