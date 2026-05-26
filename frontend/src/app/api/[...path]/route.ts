import { NextRequest, NextResponse } from "next/server";
import { getBackendApiUrl } from "@/app/api/auth/cookies";
import { fetchWithTransientRetry } from "@/app/api/proxyRetry";

interface ProxyRouteContext {
  readonly params: Promise<{
    readonly path: string[];
  }>;
}

const forwardedRequestHeaders = new Set(["accept", "authorization", "content-type", "x-requested-with"]);
const strippedResponseHeaders = [
  "content-encoding",
  "content-length",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

const buildBackendUrl = async (request: NextRequest, context: ProxyRouteContext) => {
  const { path } = await context.params;
  const url = new URL(request.url);
  const proxiedPath = path[0] === "v1" ? path.slice(1) : path;
  const backendUrl = new URL(`${getBackendApiUrl().replace(/\/$/, "")}/${proxiedPath.map(encodeURIComponent).join("/")}`);
  backendUrl.search = url.search;
  return backendUrl;
};

const buildHeaders = (request: NextRequest) => {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (forwardedRequestHeaders.has(key.toLowerCase())) headers.set(key, value);
  });

  const accessToken = request.cookies.get("jivara-token")?.value;
  if (accessToken && accessToken !== "undefined" && accessToken !== "null") {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  return headers;
};

const getProxyTimeoutMs = (url: URL) => {
  const pathname = url.pathname;

  if (pathname.includes("/food-scans/") || pathname.includes("/nutrition-estimates")) {
    return Number(process.env.FOOD_SCAN_PROXY_TIMEOUT_MS || 60_000);
  }

  return Number(process.env.API_PROXY_TIMEOUT_MS || 10_000);
};

const proxyRequest = async (request: NextRequest, context: ProxyRouteContext) => {
  const backendUrl = await buildBackendUrl(request, context);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const canRetry = request.method === "GET" || request.method === "HEAD";
  let response: Response;

  try {
    const requestInit = {
      method: request.method,
      headers: buildHeaders(request),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(getProxyTimeoutMs(backendUrl)),
    } satisfies RequestInit;

    response = canRetry
      ? await fetchWithTransientRetry(backendUrl, requestInit)
      : await fetch(backendUrl, requestInit);
  } catch {
    return NextResponse.json(
      { status: "gagal", message: "Layanan sedang tidak merespons. Coba lagi beberapa saat." },
      { status: 504, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const responseHeaders = new Headers(response.headers);
  strippedResponseHeaders.forEach((header) => responseHeaders.delete(header));
  responseHeaders.set("Cache-Control", "no-store, max-age=0");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
};

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
