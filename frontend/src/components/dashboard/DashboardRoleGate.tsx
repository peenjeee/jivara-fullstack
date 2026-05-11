"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { getFallbackPathForRole } from "./access";
import DashboardRouteFallback from "./DashboardRouteFallback";

interface DashboardRoleGateProps {
  readonly allowedRoles: readonly string[];
  readonly children: React.ReactNode;
}

export default function DashboardRoleGate({ allowedRoles, children }: DashboardRoleGateProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const role = user?.role;
  const isAllowed = !!role && allowedRoles.includes(role);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!isAllowed) router.replace(getFallbackPathForRole(role));
  }, [hasHydrated, isAllowed, role, router, user]);

  if (!hasHydrated || !isAllowed) return <DashboardRouteFallback />;

  return children;
}
