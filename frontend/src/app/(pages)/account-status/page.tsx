import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth";
import AccountStatusPage from "@/components/auth/AccountStatusPage";

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

export const metadata: Metadata = {
  title: "Status Akun",
  description: "Lihat status persetujuan akun admin Jivara.",
  robots: { index: false, follow: false },
};

export default async function AccountStatusRoute() {
  const cookieStore = await cookies();
  const token = cookieStore.get("jivara-token")?.value;
  const refreshToken = cookieStore.get("jivara-refresh-token")?.value;
  const hasRefreshToken = Boolean(refreshToken && refreshToken !== "undefined" && refreshToken !== "null");

  if (!isTokenUsable(token) && !hasRefreshToken) {
    redirect("/login?reason=unauthenticated");
  }

  return (
    <AuthPageShell>
      <AccountStatusPage />
    </AuthPageShell>
  );
}
