import { CalendarClock, Home, ListChecks, ScanLine, Settings, UserRound } from "lucide-react";

export const DASHBOARD_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Pasien", href: "/patients", icon: UserRound },
  { label: "Jadwal", href: "/schedule", icon: CalendarClock },
  { label: "Log Aktivitas", href: "/activity-log", icon: ListChecks },
] as const;

export const DASHBOARD_BOTTOM_NAV_ITEMS = [
  ...DASHBOARD_NAV_ITEMS,
  { label: "Pengaturan", href: "/settings", icon: Settings },
] as const;

export const PATIENT_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Jadwal", href: "/schedule", icon: CalendarClock },
  { label: "Scan Makanan", href: "/food-scan", icon: ScanLine, featured: true },
  { label: "Log Aktivitas", href: "/activity-log", icon: ListChecks },
] as const;

export const PATIENT_BOTTOM_NAV_ITEMS = [
  ...PATIENT_NAV_ITEMS,
  { label: "Pengaturan", href: "/settings", icon: Settings },
] as const;

export type DashboardRole = "nurse" | "patient";

export type DashboardNavLabel = (typeof DASHBOARD_NAV_ITEMS)[number]["label"] | (typeof PATIENT_BOTTOM_NAV_ITEMS)[number]["label"];
export type DashboardNavItemConfig = (typeof DASHBOARD_BOTTOM_NAV_ITEMS)[number] | (typeof PATIENT_BOTTOM_NAV_ITEMS)[number];

export function getDashboardRole(role?: string | null): DashboardRole {
  return role === "nurse" || role === "admin" ? "nurse" : "patient";
}

export function getDashboardNavItems(role: DashboardRole): readonly DashboardNavItemConfig[] {
  return role === "patient" ? PATIENT_NAV_ITEMS : DASHBOARD_NAV_ITEMS;
}

export function getDashboardBottomNavItems(role: DashboardRole): readonly DashboardNavItemConfig[] {
  return role === "patient" ? PATIENT_BOTTOM_NAV_ITEMS : DASHBOARD_BOTTOM_NAV_ITEMS;
}
