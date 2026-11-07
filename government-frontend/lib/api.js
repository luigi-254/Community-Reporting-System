const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const TOKEN_KEY = 'crs_government_access_token';
const SESSION_COOKIE_PATH = '/api/session';

/** Event fired when a request fails with 401 using the *current* session token. */
export const SESSION_EXPIRED_EVENT = 'crs:session-expired';

export const getToken = () =>
  typeof window === 'undefined' ? null : sessionStorage.getItem(TOKEN_KEY);

/**
 * Persist the access token for the API client's Authorization header.
 *
 * Uses sessionStorage (tab-scoped) so that each browser tab can hold a
 * different account's token — enabling concurrent multi-role login (e.g. one
 * tab as GOVERNOR, another as CECM) without tabs overwriting each other.
 *
 * The httpOnly session cookie is intentionally NOT the source of truth for
 * per-tab sessions: cookies are shared across all tabs on the same origin, so
 * they cannot distinguish which tab issued which token. API calls authenticate
 * via the Authorization header built from sessionStorage instead.
 */
export const setToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
};

/** Remove the locally stored token without touching the httpOnly cookie. */
export const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('crs_government_user');
};

/**
 * Write the access token to sessionStorage (tab-scoped, used by apiFetch /
 * dashboard fetch calls) and best-effort to the httpOnly session cookie.
 * Both are written together when possible, but sessionStorage is the
 * authoritative per-tab source; the shared cookie cannot be tab-specific.
 */
export async function setSession(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('crs_government_user');
  }
  return persistSessionCookie(token);
}

/** Clear both sessionStorage and the httpOnly session cookie together. */
export async function clearSession() {
  clearStoredToken();
  return clearSessionCookie();
}

/**
 * Write the httpOnly session cookie used by the server-side route guard.
 * Best-effort: cookies are shared across all tabs on the origin, so they
 * cannot hold a tab-specific token. API calls authenticate via the
 * sessionStorage token instead; the cookie is only a best-effort hint.
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
 *
 * The expired token is passed in the event detail so that each tab can
 * verify whether the expiry applies to *its* own session. Without this, a
 * 401 in one tab would wrongly clear every other tab's concurrent session.
 * The provider owns the redirect so it can use router.replace (no full
 * page reload, no ping-pong between /login and the protected route).
 */
export function notifySessionExpired(expiredToken) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { token: expiredToken } }),
  );
}

/** Subscribe to session-expiry notifications. Returns an unsubscribe function. */
export function onSessionExpired(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = (event) => {
    const currentToken = getToken();
    // Only react when the expiring token matches this tab's own token.
    // Other tabs may be logged in as different roles and must not be affected.
    if (event.detail?.token && currentToken && event.detail.token === currentToken) {
      listener(event.detail.token);
    }
  };
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
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
 *
 * @param {string} path - API path (BASE_URL is prepended)
 * @param {object} [options] - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {any} [options.body] - Request body (JSON-stringified when present)
 * @param {object} [options.headers] - Additional headers
 * @param {AbortSignal} [options.signal] - Abort signal
 * @param {string} [options.cache] - Cache mode passed through to fetch
 * @returns {Promise<any>} Parsed JSON response
 */
export async function apiFetch(path, { method = 'GET', body, headers = {}, signal, cache } = {}) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    signal,
    cache,
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
      // Notify before clearing so the originating tab can still match its
      // own token in the expiry handler. Other tabs see a non-matching token
      // and leave their sessions untouched.
      notifySessionExpired(token);
      clearStoredToken();
    }
    throw new Error('Unauthorized - please sign in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
}
