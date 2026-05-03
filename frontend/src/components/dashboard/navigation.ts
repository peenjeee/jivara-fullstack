import { CalendarClock, LayoutDashboard, ListChecks, UserRound } from "lucide-react";

export const DASHBOARD_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Pasien", href: "/patients", icon: UserRound },
  { label: "Jadwal", href: "/schedule", icon: CalendarClock },
  { label: "Log Aktivitas", href: "/activity-log", icon: ListChecks },
] as const;

export type DashboardNavLabel = (typeof DASHBOARD_NAV_ITEMS)[number]["label"];
export type DashboardNavItemConfig = (typeof DASHBOARD_NAV_ITEMS)[number];
