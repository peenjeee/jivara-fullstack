import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

function getConfiguredApiOrigin() {
  try {
    return process.env.NEXT_PUBLIC_API_URL ? new URL(process.env.NEXT_PUBLIC_API_URL).origin : null;
  } catch {
    return null;
  }
}

function createContentSecurityPolicy(nonce: string, pathname: string) {
  const isDev = process.env.NODE_ENV === 'development';
  const isLandingPage = pathname === '/';
  const allowInlineStyles = isDev || isLandingPage;
  const allowEval = isDev || isLandingPage;
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
    ...(apiOrigin ? [apiOrigin] : []),
  ].join(' ');

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://ajax.googleapis.com${allowEval ? " 'unsafe-eval'" : ''}`,
    `script-src-elem 'self' 'nonce-${nonce}' https://ajax.googleapis.com${allowEval ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${allowInlineStyles ? "'unsafe-inline'" : `'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`}`,
    `style-src-elem 'self' ${allowInlineStyles ? "'unsafe-inline'" : `'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`}`,
    `style-src-attr 'self'${allowInlineStyles ? " 'unsafe-inline'" : ""}`,
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

// Route yang TIDAK boleh diakses jika sudah login
const authRoutes = ['/login', '/register'];

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

function getDefaultPathForRole(role?: string) {
  return role === 'super_admin' ? '/admin-approvals' : '/dashboard';
}

function isRouteAllowedForRole(pathname: string, role?: string) {
  if (!role) return false;
  if (pathname.startsWith('/account-status')) return role === 'admin';
  if (pathname.startsWith('/settings')) return ['super_admin', 'admin', 'nurse', 'patient'].includes(role);
  if (pathname.startsWith('/dashboard')) return ['super_admin', 'admin', 'nurse', 'patient'].includes(role);
  if (pathname.startsWith('/admin-approvals')) return role === 'super_admin';
  if (pathname.startsWith('/nurses')) return role === 'admin' || role === 'nurse';
  if (pathname.startsWith('/patients')) return role === 'admin' || role === 'nurse';
  if (pathname.startsWith('/schedule')) return role === 'admin' || role === 'nurse' || role === 'patient';
  if (pathname.startsWith('/activity-log')) return role === 'super_admin' || role === 'admin' || role === 'nurse' || role === 'patient';
  if (pathname.startsWith('/food-scan')) return role === 'patient';
  return true;
}

function shouldRedirectAdminToAccountStatus(pathname: string, role?: string, accountStatus?: string) {
  if (role !== 'admin') return false;
  if (!accountStatus || accountStatus === 'active') return false;
  return !pathname.startsWith('/account-status') && protectedRoutes.some(route => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const supabaseResponse = await updateSession(request);

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const token = request.cookies.get('jivara-token')?.value;
  const roleCookie = request.cookies.get('jivara-role')?.value;
  const accountStatusCookie = request.cookies.get('jivara-account-status')?.value;
  const hasValidToken = isTokenUsable(token);
  const tokenPayload = decodeJwtPayload(token);
  const { pathname } = request.nextUrl;
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, pathname);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  requestHeaders.set('x-pathname', pathname);

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !hasValidToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(url);
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  if (isAuthRoute && hasValidToken) {
    const response = NextResponse.redirect(new URL(getDefaultPathForRole(tokenPayload?.role), request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  const effectiveRole = roleCookie || tokenPayload?.role;

  if (isProtectedRoute && hasValidToken && shouldRedirectAdminToAccountStatus(pathname, effectiveRole, accountStatusCookie)) {
    const response = NextResponse.redirect(new URL('/account-status', request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  if (isProtectedRoute && hasValidToken && !isRouteAllowedForRole(pathname, effectiveRole)) {
    const response = NextResponse.redirect(new URL(getDefaultPathForRole(effectiveRole), request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua path permintaan kecuali yang dimulai dengan:
     * - api (route API)
     * - _next/static (file statis)
     * - _next/image (file optimisasi gambar)
     * - favicon.ico (file favicon)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
