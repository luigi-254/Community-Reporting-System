import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  if (request.cookies.has('refreshToken')) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // Public brand/app assets must bypass the auth gate, otherwise the favicon,
  // manifest and logo are redirected to /login and never reach the browser.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|brand/).*)',
  ],
};
