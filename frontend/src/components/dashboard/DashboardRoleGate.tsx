"use client";

import { redirect } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { getFallbackPathForRole } from "./access";
import DashboardRouteFallback from "./DashboardRouteFallback";

interface DashboardRoleGateProps {
  readonly allowedRoles: readonly string[];
  readonly children: React.ReactNode;
}

export default function DashboardRoleGate({ allowedRoles, children }: DashboardRoleGateProps) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const role = user?.role;
  const isAllowed = !!role && allowedRoles.includes(role);

  if (!hasHydrated) return <DashboardRouteFallback />;
  if (!user) redirect("/login");
  if (!isAllowed) redirect(getFallbackPathForRole(role));

  return children;
}
