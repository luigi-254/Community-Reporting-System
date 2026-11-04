import { NextResponse } from 'next/server';

export const COOKIE_NAME = 'crs_government_access_token';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

/**
 * Store the access token in an httpOnly, SameSite=Lax cookie.
 *
 * This cookie is the source of truth for the server-side route guard
 * (see proxy.js). It is httpOnly so client-side script cannot read or forge
 * it, and SameSite=Lax so it is not sent on cross-site requests.
 */
export async function POST(request) {
  let accessToken = '';
  try {
    const body = await request.json();
    if (typeof body?.accessToken === 'string') accessToken = body.accessToken.trim();
  } catch {
    accessToken = '';
  }

  if (!accessToken) {
    return NextResponse.json(
      { status: 'error', message: 'accessToken is required.' },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ status: 'success' });
  response.cookies.set(COOKIE_NAME, accessToken, {
    ...cookieOptions,
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

/** Clear the httpOnly session cookie. */
export async function DELETE() {
  const response = NextResponse.json({ status: 'success' });
  response.cookies.set(COOKIE_NAME, '', {
    ...cookieOptions,
    maxAge: 0,
  });
  return response;
}
