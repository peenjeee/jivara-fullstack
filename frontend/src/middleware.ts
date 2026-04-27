import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

// Route yang memerlukan autentikasi
const protectedRoutes = ['/dashboard'];

// Route yang TIDAK boleh diakses jika sudah login
const authRoutes = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  await updateSession(request);

  const token = request.cookies.get('jivara-token')?.value;
  const hasValidToken = token && token !== 'undefined' && token !== 'null' && token.length > 0;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !hasValidToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
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
