import { CalendarClock, LayoutDashboard, ListChecks, UserRound } from "lucide-react";

export const DASHBOARD_NAV_ITEMS = [
  { label: "Dashboard", href: "#overview", icon: LayoutDashboard },
  { label: "Pasien", href: "#pasien", icon: UserRound },
  { label: "Jadwal", href: "#jadwal", icon: CalendarClock },
  { label: "Log Aktivitas", href: "#log-aktivitas", icon: ListChecks },
] as const;

export type DashboardNavLabel = (typeof DASHBOARD_NAV_ITEMS)[number]["label"];
export type DashboardNavItemConfig = (typeof DASHBOARD_NAV_ITEMS)[number];
