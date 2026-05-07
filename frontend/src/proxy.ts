import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

function createContentSecurityPolicy(nonce: string) {
  const isDev = process.env.NODE_ENV === 'development';
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://ajax.googleapis.com${isDev ? " 'unsafe-eval'" : ''}`,
    `script-src-elem 'self' 'nonce-${nonce}' https://ajax.googleapis.com${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`}`,
    `style-src-elem 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}' 'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=' 'sha256-RpGvlRbRQP1LZDBLDKCjN1VY9+ac/RHqgjmDHc2Y6PA='`}`,
    `style-src-attr 'self'${isDev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self' data:",
    "connect-src 'self' blob: https://*.supabase.co https://*.supabase.in https://api.jivara.web.id https://jivara-production.up.railway.app http://localhost:3001 ws://localhost:3000 ws://127.0.0.1:3000",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ];

  return directives.join('; ');
}

// Route yang memerlukan axutentikasi.
// const protectedRoutes = ['/dashboard', '/patients', '/schedule', '/activity-log', '/settings', '/food-scan'];

// Route yang TIDAK boleh diakses jika sudah login
const authRoutes = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  await updateSession(request);

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const token = request.cookies.get('jivara-token')?.value;
  const hasValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 0;
  const { pathname } = request.nextUrl;

  // const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // if (isProtectedRoute && !hasValidToken) {
  //   const url = new URL('/login', request.url);
  //   url.searchParams.set('callbackUrl', pathname);
  //   const response = NextResponse.redirect(url);
  //   response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  //   return response;
  // }

  if (isAuthRoute && hasValidToken) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
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
