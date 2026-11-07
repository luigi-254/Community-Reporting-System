import { NextResponse } from 'next/server';

const TOKEN_KEY = 'crs_government_access_token';
const PROTECTED_PREFIXES = ['/government'];
const AUTH_ROUTES = ['/login'];
const DEFAULT_AUTHENTICATED_ROUTE = '/government/governor';

/**
 * Server-side route guard.
 *
 * - No session cookie on a protected route  -> redirect to /login before any
 *   dashboard markup is painted and before any /api/dashboard call is made.
 * - Session cookie present on /login         -> redirect to the dashboard so a
 *   signed-in user never sees the login form.
 *
 * The cookie is httpOnly, so this check is the only thing that can make a
 * redirect decision without trusting client-side JavaScript.
 */
export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_KEY)?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/government/:path*', '/login'],
};
