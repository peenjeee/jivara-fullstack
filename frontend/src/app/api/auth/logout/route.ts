import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearAuthCookies, getBackendApiUrl, REFRESH_COOKIE, setLogoutCookie } from '../cookies';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  const response = NextResponse.json({ message: 'Logged out' }, { status: 200 });
  clearAuthCookies(response);
  setLogoutCookie(response);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  response.headers.set('Clear-Site-Data', '"cache"');

  if (refreshToken) {
    void fetch(`${getBackendApiUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    }).catch(() => {});
  }

  return response;
}
