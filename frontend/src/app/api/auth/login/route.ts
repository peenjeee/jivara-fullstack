import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, setAuthCookies, setAuthTimingHeaders } from "../cookies";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const body = await request.json();
  let backendResponse: Response;

  try {
    backendResponse = await fetch(`${getBackendApiUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return setAuthTimingHeaders(
      NextResponse.json(
        { status: "gagal", message: "Layanan autentikasi sedang tidak merespons. Coba lagi beberapa saat." },
        { status: 504 },
      ),
      startedAt,
    );
  }

  const payload = await backendResponse.json();

  if (!backendResponse.ok) {
    return setAuthTimingHeaders(NextResponse.json(payload, { status: backendResponse.status }), startedAt);
  }

  const data = payload.data;
  const safePayload = {
    ...payload,
    data: {
      ...data,
      access_token: undefined,
      refresh_token: undefined,
    },
  };
  const response = NextResponse.json(safePayload, { status: backendResponse.status });
  setAuthCookies(response, {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    role: data.user?.role,
    accountStatus: data.user?.accountStatus,
    expiresIn: data.expires_in,
  }, request);

  return setAuthTimingHeaders(response, startedAt);
}
