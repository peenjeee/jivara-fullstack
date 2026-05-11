import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, setAuthCookies } from "../cookies";

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { status: "gagal", message: "Layanan autentikasi sedang tidak merespons. Coba lagi beberapa saat." },
      { status: 504 },
    );
  }

  const payload = await backendResponse.json();

  if (!backendResponse.ok) {
    return NextResponse.json(payload, { status: backendResponse.status });
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

  return response;
}
