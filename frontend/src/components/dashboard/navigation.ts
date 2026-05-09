import { CalendarClock, Home, ListChecks, ScanLine, Settings, ShieldCheck, UserRound, UsersRound } from "lucide-react";

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

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Perawat", href: "/nurses", icon: UsersRound },
  { label: "Pasien", href: "/patients", icon: UserRound },
  { label: "Jadwal", href: "/schedule", icon: CalendarClock },
  { label: "Log Aktivitas", href: "/activity-log", icon: ListChecks },
] as const;

export const SUPER_ADMIN_NAV_ITEMS = [
  { label: "Persetujuan Admin", href: "/admin-approvals", icon: ShieldCheck },
  { label: "Log Aktivitas", href: "/activity-log", icon: ListChecks },
] as const;

export const ADMIN_BOTTOM_NAV_ITEMS = [
  ...ADMIN_NAV_ITEMS,
  { label: "Pengaturan", href: "/settings", icon: Settings },
] as const;

export const SUPER_ADMIN_BOTTOM_NAV_ITEMS = [
  ...SUPER_ADMIN_NAV_ITEMS,
  { label: "Pengaturan", href: "/settings", icon: Settings },
] as const;

export type DashboardRole = "super_admin" | "admin" | "nurse" | "patient";

export type DashboardNavLabel = (typeof DASHBOARD_NAV_ITEMS)[number]["label"] | (typeof PATIENT_BOTTOM_NAV_ITEMS)[number]["label"] | (typeof ADMIN_BOTTOM_NAV_ITEMS)[number]["label"] | (typeof SUPER_ADMIN_BOTTOM_NAV_ITEMS)[number]["label"];
export type DashboardNavItemConfig = (typeof DASHBOARD_BOTTOM_NAV_ITEMS)[number] | (typeof PATIENT_BOTTOM_NAV_ITEMS)[number] | (typeof ADMIN_BOTTOM_NAV_ITEMS)[number] | (typeof SUPER_ADMIN_BOTTOM_NAV_ITEMS)[number];

export function getDashboardRole(role?: string | null): DashboardRole {
  if (role === "super_admin") return "super_admin";
  if (role === "admin") return "admin";
  if (role === "nurse") return "nurse";
  return "patient";
}

export function isAdminDashboardRole(role: DashboardRole) {
  return role === "admin" || role === "super_admin";
}

export function isOperationalAdminRole(role: DashboardRole) {
  return role === "admin";
}

export function getDashboardNavItems(role: DashboardRole): readonly DashboardNavItemConfig[] {
  if (role === "super_admin") return SUPER_ADMIN_NAV_ITEMS;
  if (role === "admin") return ADMIN_NAV_ITEMS;
  return role === "patient" ? PATIENT_NAV_ITEMS : DASHBOARD_NAV_ITEMS;
}

export function getDashboardBottomNavItems(role: DashboardRole): readonly DashboardNavItemConfig[] {
  if (role === "super_admin") return SUPER_ADMIN_BOTTOM_NAV_ITEMS;
  if (role === "admin") return ADMIN_BOTTOM_NAV_ITEMS;
  return role === "patient" ? PATIENT_BOTTOM_NAV_ITEMS : DASHBOARD_BOTTOM_NAV_ITEMS;
}
