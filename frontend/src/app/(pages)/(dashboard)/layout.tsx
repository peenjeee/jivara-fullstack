import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

function isTokenUsable(token?: string) {
  if (!token || token === "undefined" || token === "null") return false;

  try {
    const payload = token.split(".")[1];
    if (!payload) return false;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    const decoded = JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8")) as { exp?: number };
    return !decoded.exp || decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default async function ProtectedDashboardLayout({ children }: { readonly children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("jivara-token")?.value;
  const refreshToken = cookieStore.get("jivara-refresh-token")?.value;
  const hasRefreshToken = Boolean(refreshToken && refreshToken !== "undefined" && refreshToken !== "null");

  if (!isTokenUsable(token) && !hasRefreshToken) {
    redirect("/login?reason=unauthenticated");
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
