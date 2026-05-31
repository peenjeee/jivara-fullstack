import type { NextRequest, NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";
const defaultBackendApiUrl = "https://api.jivara.web.id/api/v1";
const sharedCookieDomain = ".jivara.web.id";

export const ACCESS_COOKIE = "jivara-token";
export const REFRESH_COOKIE = "jivara-refresh-token";
export const ROLE_COOKIE = "jivara-role";
export const ACCOUNT_STATUS_COOKIE = "jivara-account-status";
export const LOGOUT_COOKIE = "jivara-logged-out";

const isSecureRequest = (request?: NextRequest) => {
  if (!request) return isProduction;
  return request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
};

const getCookieDomain = (request?: NextRequest) => {
  const configuredDomain = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (configuredDomain) return configuredDomain;
  const hostname = request?.nextUrl.hostname;
  if (!hostname) return undefined;
  return hostname === "jivara.web.id" || hostname.endsWith(".jivara.web.id") ? sharedCookieDomain : undefined;
};

const getCookieOptions = (request?: NextRequest) => ({
  httpOnly: true,
  secure: isSecureRequest(request),
  sameSite: "strict" as const,
  path: "/",
  ...(getCookieDomain(request) ? { domain: getCookieDomain(request) } : {}),
});

export const setAuthCookies = (response: NextResponse, data: { accessToken: string; refreshToken?: string; role?: string | null; accountStatus?: string | null; expiresIn?: number }, request?: NextRequest) => {
  const commonCookieOptions = getCookieOptions(request);

  response.cookies.set(ACCESS_COOKIE, data.accessToken, {
    ...commonCookieOptions,
    maxAge: data.expiresIn ?? 60 * 60,
  });

  if (data.refreshToken) {
    response.cookies.set(REFRESH_COOKIE, data.refreshToken, {
      ...commonCookieOptions,
      maxAge: 7 * 24 * 60 * 60,
    });
  }

  response.cookies.set(ROLE_COOKIE, data.role ?? "", {
    ...commonCookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  });
  response.cookies.set(ACCOUNT_STATUS_COOKIE, data.accountStatus ?? "active", {
    ...commonCookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  });
  response.cookies.set(LOGOUT_COOKIE, "", {
    ...commonCookieOptions,
    maxAge: 0,
  });
};

export const clearAuthCookies = (response: NextResponse, request?: NextRequest) => {
  const commonCookieOptions = getCookieOptions(request);
  const hostOnlyCookieOptions = {
    httpOnly: commonCookieOptions.httpOnly,
    secure: commonCookieOptions.secure,
    sameSite: commonCookieOptions.sameSite,
    path: commonCookieOptions.path,
  };

  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, ROLE_COOKIE, ACCOUNT_STATUS_COOKIE]) {
    response.cookies.set(name, "", {
      ...commonCookieOptions,
      maxAge: 0,
    });
    response.cookies.set(name, "", {
      ...hostOnlyCookieOptions,
      maxAge: 0,
    });
  }
};

export const setLogoutCookie = (response: NextResponse, request?: NextRequest) => {
  const commonCookieOptions = getCookieOptions(request);

  response.cookies.set(LOGOUT_COOKIE, "1", {
    ...commonCookieOptions,
    maxAge: 5 * 60,
  });
};

export const getBackendApiUrl = () => {
  const configuredUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (configuredUrl) return configuredUrl;
  if (process.env.NODE_ENV === "development") return "http://localhost:3001/api/v1";
  return defaultBackendApiUrl;
};
