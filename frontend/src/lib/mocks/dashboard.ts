import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, UsersRound } from "lucide-react";
import type { SummaryCardColor, SummaryCardTone } from "@/components/ui/SummaryCard";

export interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly tone: SummaryCardTone;
  readonly color?: SummaryCardColor;
  readonly icon: LucideIcon;
  readonly progress?: number;
}

export interface RecentPatient {
  readonly name: string;
  readonly meta: string;
  readonly mrn: string;
  readonly status: "On Ideal Schedule" | "Lagging Behind" | "Need Special Attention";
  readonly lastVisit: string;
  readonly avatar: string;
  readonly image?: string;
}

const formatToday = () =>
  new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const dashboardStats: DashboardStat[] = [
  {
    label: "Total Pasien",
    value: "6767",
    helper: "",
    tone: "safe",
    color: "primary",
    icon: UsersRound,
  },
  {
    label: "Kepatuhan Keseluruhan",
    value: "67%",
    helper: "Target bulanan 90%",
    tone: "safe",
    color: "safe",
    icon: CheckCircle2,
    progress: 86,
  },
  {
    label: "Peringatan Kritis",
    value: "67",
    helper: "Memerlukan perhatian segera",
    tone: "critical",
    color: "danger",
    icon: AlertTriangle,
  },
];

export const recentPatients: RecentPatient[] = [
  {
    name: "Panji Ihsanudin Fajri",
    meta: "24 thn • Pria",
    mrn: "JVR-01",
    status: "On Ideal Schedule",
    lastVisit: formatToday(),
    avatar: "PJ",
  },
  {
    name: "Rama Danadipa Putra Wijaya",
    meta: "22 thn • Pria",
    mrn: "JVR-02",
    status: "Need Special Attention",
    lastVisit: formatToday(),
    avatar: "RD",
  },
  {
    name: "La Rayan",
    meta: "21 thn • Pria",
    mrn: "JVR-03",
    status: "Lagging Behind",
    lastVisit: formatToday(),
    avatar: "LR",
  },
  {
    name: "Rizki Pangestu",
    meta: "24 thn • Pria",
    mrn: "JVR-04",
    status: "On Ideal Schedule",
    lastVisit: formatToday(),
    avatar: "RP",
  },
  {
    name: "Hanip Rifan",
    meta: "22 thn • Pria",
    mrn: "JVR-05",
    status: "Need Special Attention",
    lastVisit: formatToday(),
    avatar: "HR",
  },
  {
    name: "Alfito Juanda",
    meta: "21 thn • Pria",
    mrn: "JVR-06",
    status: "Lagging Behind",
    lastVisit: formatToday(),
    avatar: "AJ",
  },
];
