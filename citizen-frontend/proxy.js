import { NextResponse } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/report', '/reports', '/notifications'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (request.cookies.has('refreshToken')) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/report/:path*', '/reports/:path*', '/notifications/:path*'],
};
