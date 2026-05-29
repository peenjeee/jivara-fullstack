import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { JSON_LD_SCRIPT } from './config/seo';

function getConfiguredApiOrigin() {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : null;
  } catch {
    return null;
  }
}

async function createSha256Hash(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

async function createContentSecurityPolicy(nonce: string, pathname: string, hostname: string) {
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  const isDev = process.env.NODE_ENV === 'development' || isLocalhost;
  const isLandingPage = pathname === '/';
  const allowInlineStyles = isDev || isLandingPage;
  const allowWasmEval = isDev || isLandingPage;
  const apiOrigin = getConfiguredApiOrigin();
  const shouldUpgradeInsecureRequests = !apiOrigin?.startsWith('http://');
  const connectSources = [
    "'self'",
    'blob:',
    'https://*.supabase.co',
    'https://*.supabase.in',
    'https://api.jivara.web.id',
    'https://jivara-production.up.railway.app',
    ...(apiOrigin ? [apiOrigin] : []),
    ...(isDev ? ['http://localhost:3001', 'ws://localhost:3000', 'ws://127.0.0.1:3000'] : []),
  ].join(' ');
  const imageSources = [
    "'self'",
    'data:',
    'blob:',
    'https://images.unsplash.com',
    'https://www.jivara.web.id',
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(' ');

  const jsonLdHash = await createSha256Hash(JSON_LD_SCRIPT);
  const scriptSource = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: http://localhost:* http://127.0.0.1:* https://ajax.googleapis.com"
    : `script-src 'self' 'nonce-${nonce}' 'sha256-${jsonLdHash}'${allowWasmEval ? " 'wasm-unsafe-eval'" : ''} 'strict-dynamic' https://ajax.googleapis.com`;
  const scriptElementSource = isDev
    ? "script-src-elem 'self' 'unsafe-inline' blob: http://localhost:* http://127.0.0.1:* https://ajax.googleapis.com"
    : `script-src-elem 'self' 'nonce-${nonce}' 'sha256-${jsonLdHash}' https://ajax.googleapis.com`;
  const styleSource = allowInlineStyles
    ? "style-src 'self' 'unsafe-inline'"
    : `style-src 'self' 'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`;
  const styleElementSource = allowInlineStyles
    ? "style-src-elem 'self' 'unsafe-inline'"
    : `style-src-elem 'self' 'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`;
  const styleAttributeSource = allowInlineStyles
    ? "style-src-attr 'self' 'unsafe-inline'"
    : "style-src-attr 'none'";
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    scriptSource,
    scriptElementSource,
    styleSource,
    styleElementSource,
    styleAttributeSource,
    `img-src ${imageSources}`,
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    ...(shouldUpgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
  ];

  return directives.join('; ');
}

const protectedRoutes = ['/dashboard', '/patients', '/schedule', '/activity-log', '/settings', '/food-scan', '/nurses', '/admin-approvals', '/account-status'];

const authRoutes = ['/login', '/register'];
const authCookieNames = ['jivara-token', 'jivara-refresh-token', 'jivara-role', 'jivara-account-status'];
const logoutCookieName = 'jivara-logged-out';

function setHardeningHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
}

function expireAuthCookies(response: NextResponse) {
  for (const name of authCookieNames) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  }
}

function setLogoutMarker(response: NextResponse) {
  response.cookies.set(logoutCookieName, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 5 * 60,
  });
}

function decodeJwtPayload(token?: string) {
  if (!token) return null;

  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(paddedPayload, 'base64').toString('utf8')) as { role?: string; exp?: number };
  } catch {
    return null;
  }
}

function isTokenUsable(token?: string) {
  if (!token || token === 'undefined' || token === 'null') return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const token = request.cookies.get('jivara-token')?.value;
  const refreshToken = request.cookies.get('jivara-refresh-token')?.value;
  const hasLogoutMarker = request.cookies.get(logoutCookieName)?.value === '1';
  const hasValidToken = isTokenUsable(token);
  const hasRefreshToken = Boolean(refreshToken && refreshToken !== 'undefined' && refreshToken !== 'null');
  const hasSession = !hasLogoutMarker && (hasValidToken || hasRefreshToken);
  const { pathname } = request.nextUrl;
  const contentSecurityPolicy = await createContentSecurityPolicy(nonce, pathname, request.nextUrl.hostname);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  requestHeaders.set('x-pathname', pathname);

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isExplicitLogout = isAuthRoute && request.nextUrl.searchParams.get('loggedOut') === '1';

  if (isExplicitLogout) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    setHardeningHeaders(response);
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    expireAuthCookies(response);
    setLogoutMarker(response);
    return response;
  }

  if (isProtectedRoute && !hasSession) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    setHardeningHeaders(response);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    if (hasLogoutMarker) expireAuthCookies(response);
    return response;
  }

  if (isAuthRoute && hasSession) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    setHardeningHeaders(response);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  setHardeningHeaders(response);
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  if (hasLogoutMarker) expireAuthCookies(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
