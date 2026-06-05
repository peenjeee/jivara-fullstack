import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, getBackendApiUrl, REFRESH_COOKIE, setAuthTimingHeaders, setLogoutCookie } from '../cookies';

const LOGOUT_CLEAR_SITE_DATA = '"cache"';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  clearAuthCookies(response, request);
  setLogoutCookie(response, request);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Clear-Site-Data', LOGOUT_CLEAR_SITE_DATA);

  if (refreshToken) {
    void fetch(`${getBackendApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }

  return setAuthTimingHeaders(response, startedAt);
}
