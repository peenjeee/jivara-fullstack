import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl, REFRESH_COOKIE, setAuthCookies } from "../cookies";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ status: "gagal", message: "Sesi tidak tersedia" }, { status: 401 });
  }

  let backendResponse: Response;

  try {
    backendResponse = await fetch(`${getBackendApiUrl()}/auth/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return NextResponse.json(
      { status: "gagal", message: "Layanan autentikasi sedang tidak merespons. Coba lagi beberapa saat." },
      { status: 504 },
    );
  }

  const payload = await backendResponse.json();
  const response = NextResponse.json(payload, { status: backendResponse.status });

  if (backendResponse.ok) {
    const accessToken = request.cookies.get("jivara-token")?.value;
    if (accessToken) {
      setAuthCookies(response, {
        accessToken,
        role: payload.data?.user?.role,
        accountStatus: payload.data?.user?.accountStatus,
      }, request);
    }
  }

  return response;
}
