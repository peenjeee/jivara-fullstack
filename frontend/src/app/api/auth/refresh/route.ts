import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, REFRESH_COOKIE, setAuthCookies } from "../cookies";
import { fetchWithTransientRetry } from "../../proxyRetry";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ status: "gagal", message: "Sesi tidak tersedia" }, { status: 401 });
  }

  let backendResponse: Response;
  const refreshRequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  } satisfies RequestInit;

  try {
    backendResponse = await fetchWithTransientRetry(`${getBackendApiUrl()}/auth/refresh`, refreshRequestInit);
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

  const statusResponse = await fetchWithTransientRetry(`${getBackendApiUrl()}/auth/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  const statusPayload = statusResponse?.ok ? await statusResponse.json() : null;
  const user = statusPayload?.data?.user ?? null;
  const data = payload.data;
  const response = NextResponse.json({ ...payload, data: { ...data, access_token: undefined, user } }, { status: backendResponse.status });

  setAuthCookies(response, {
    accessToken: data.access_token,
    role: user?.role,
    accountStatus: user?.accountStatus,
    expiresIn: data.expires_in,
  }, request);

  return response;
}
