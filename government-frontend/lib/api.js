const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'crs_government_access_token';
const SESSION_COOKIE_PATH = '/api/session';

/** Event fired when a request fails with 401 using the *current* session token. */
export const SESSION_EXPIRED_EVENT = 'crs:session-expired';

export const getToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);

/**
 * Persist the access token for the API client's Authorization header.
 *
 * The httpOnly session cookie is the source of truth for the server-side route
 * guard; it is written separately through POST /api/session so it cannot be
 * read or tampered with by client-side script.
 */
export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

/** Remove the locally stored token without touching the httpOnly cookie. */
export const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('crs_government_user');
};

/**
 * Write the httpOnly session cookie used by the server-side route guard.
 * Best-effort: the localStorage token still authenticates API calls.
 */
export async function persistSessionCookie(accessToken) {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(SESSION_COOKIE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Remove the httpOnly session cookie. */
export async function clearSessionCookie() {
  if (typeof window === 'undefined') return false;
  try {
    const response = await fetch(SESSION_COOKIE_PATH, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Notify the auth provider that the current session is no longer valid.
 * The provider owns the redirect so it can use router.replace (no full
 * page reload, no ping-pong between /login and the protected route).
 */
export function notifySessionExpired() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

/** Subscribe to session-expiry notifications. Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SESSION_EXPIRED_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
}

/**
 * Perform an authenticated API request.
 *
 * 401 handling: a 401 only invalidates the session when the failing request
 * carried the token that is *currently* stored. Token-less probes and stale
 * requests from before a login must never clear a valid session — that is what
 * caused the redirect ping-pong and the request storm.
 *
 * Retries are never attempted on 401; the caller decides how to recover.
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 401) {
    const currentToken = getToken();
    if (token && currentToken && token === currentToken) {
      clearStoredToken();
      notifySessionExpired();
    }
    throw new Error('Unauthorized - please sign in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
