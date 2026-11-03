import { NextResponse } from 'next/server';

const TOKEN_KEY = 'crs_citizen_access_token';
const PROTECTED_PREFIXES = ['/dashboard', '/report', '/reports', '/notifications'];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_KEY)?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/report/:path*', '/reports/:path*', '/notifications/:path*'],
};
