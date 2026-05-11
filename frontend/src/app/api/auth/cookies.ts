import type { NextResponse } from "next/server";

const isProduction = process.env.NODE_ENV === "production";

export const ACCESS_COOKIE = "jivara-token";
export const REFRESH_COOKIE = "jivara-refresh-token";
export const ROLE_COOKIE = "jivara-role";
export const ACCOUNT_STATUS_COOKIE = "jivara-account-status";
export const LOGOUT_COOKIE = "jivara-logged-out";

const commonCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/",
};

export const setAuthCookies = (response: NextResponse, data: { accessToken: string; refreshToken?: string; role?: string | null; accountStatus?: string | null; expiresIn?: number }) => {
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

export const clearAuthCookies = (response: NextResponse) => {
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, ROLE_COOKIE, ACCOUNT_STATUS_COOKIE]) {
    response.cookies.set(name, "", {
      ...commonCookieOptions,
      maxAge: 0,
    });
  }
};

export const setLogoutCookie = (response: NextResponse) => {
  response.cookies.set(LOGOUT_COOKIE, "1", {
    ...commonCookieOptions,
    maxAge: 5 * 60,
  });
};

export const getBackendApiUrl = () => process.env.NEXT_PUBLIC_API_URL || "https://api.jivara.web.id/api";
