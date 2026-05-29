import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, getBackendApiUrl } from "@/app/api/auth/cookies";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!accessToken || accessToken === "undefined" || accessToken === "null") {
    return NextResponse.json({ status: "gagal", message: "Token akses diperlukan" }, { status: 401 });
  }

  const backendUrl = new URL(`${getBackendApiUrl().replace(/\/$/, "")}/activity-events`);

  const response = await fetch(backendUrl, {
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
    signal: request.signal,
  });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { status: "gagal", message: "Koneksi aktivitas realtime gagal dibuat" },
      { status: response.status || 502 },
    );
  }

  return new NextResponse(response.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
