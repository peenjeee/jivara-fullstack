import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import type { User } from "@/types/auth";

interface TokenPayload {
  readonly id?: string;
  readonly email?: string;
  readonly role?: string;
  readonly exp?: number;
}

const decodeTokenPayload = (token?: string): TokenPayload | null => {
  if (!token || token === "undefined" || token === "null") return null;

  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
};

function isTokenUsable(token?: string) {
  const decoded = decodeTokenPayload(token);
  return Boolean(decoded && (!decoded.exp || decoded.exp * 1000 > Date.now()));
}

function getInitialUserFromToken(token?: string, accountStatus?: string): User | null {
  const decoded = decodeTokenPayload(token);
  if (!decoded?.id || !decoded.email || !decoded.role) return null;

  return {
    id: decoded.id,
    email: decoded.email,
    fullName: decoded.email.split("@")[0] || decoded.email,
    role: decoded.role,
    accountStatus: accountStatus || "active",
    age: 0,
  };
}

export default async function ProtectedDashboardLayout({ children }: { readonly children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("jivara-token")?.value;
  const refreshToken = cookieStore.get("jivara-refresh-token")?.value;
  const accountStatus = cookieStore.get("jivara-account-status")?.value;
  const hasRefreshToken = Boolean(refreshToken && refreshToken !== "undefined" && refreshToken !== "null");

  if (!isTokenUsable(token) && !hasRefreshToken) {
    redirect("/login?reason=unauthenticated");
  }

  const initialUser = getInitialUserFromToken(token, accountStatus);

  return <DashboardLayout initialUser={initialUser}>{children}</DashboardLayout>;
}
