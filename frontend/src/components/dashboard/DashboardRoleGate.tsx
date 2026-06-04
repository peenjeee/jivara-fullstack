"use client";

import { redirect } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { getFallbackPathForRole } from "./access";
import { useDashboardInitialUser } from "./DashboardInitialUserContext";
import DashboardRouteFallback from "./DashboardRouteFallback";

interface DashboardRoleGateProps {
  readonly allowedRoles: readonly string[];
  readonly children: React.ReactNode;
  readonly fallbackTitle?: string;
  readonly fallbackSummaryCount?: number;
}

export default function DashboardRoleGate({ allowedRoles, children, fallbackTitle, fallbackSummaryCount }: DashboardRoleGateProps) {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const initialUser = useDashboardInitialUser();
  const effectiveUser = user ?? initialUser;
  const isAuthReady = hasHydrated || Boolean(initialUser);
  const role = effectiveUser?.role;
  const isAllowed = !!role && allowedRoles.includes(role);

  if (!isAuthReady) return <DashboardRouteFallback title={fallbackTitle} summaryCount={fallbackSummaryCount} />;
  if (!effectiveUser) redirect("/login");
  if (!isAllowed) redirect(getFallbackPathForRole(role));

  return children;
}
