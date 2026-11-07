'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  apiFetch,
  getToken,
  setSession,
  clearSession,
  onSessionExpired,
} from './api';

export const AUTH_STATUS = {
  LOADING: 'loading',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
};

/** Normalise a role string coming from the API into SCREAMING_SNAKE form. */
export const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

const AuthContext = createContext(null);

/**
 * Full-page spinner shown while the session is still being resolved.
 * The application tree is not mounted during this phase, so no dashboard page
 * can paint and no redirect can fire before the session is known.
 */
function SessionLoadingScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading your session"
      className="flex min-h-screen items-center justify-center bg-[#f7f7f2]"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#dce2d8] border-t-[#187a58]" />
        <p className="text-sm font-medium text-[#687468]">Loading your session…</p>
      </div>
    </div>
  );
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState(AUTH_STATUS.LOADING);
  const [user, setUser] = useState(null);
  // Bumps whenever the authenticated account changes (login/logout/session
  // expiry). Dashboard data-fetching effects depend on it so they re-run for
  // the new account without requiring a full page reload.
  const [sessionVersion, setSessionVersion] = useState(0);

  // Controllers for in-flight auth/session requests so logout can abort them.
  const resolveControllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Resolve the session exactly once on app start.
   *
   * While the status is 'loading' the provider renders a spinner instead of
   * the application tree, so no dashboard page is mounted and no redirect is
   * attempted before we know whether the visitor is signed in.
   */
  useEffect(() => {
    const controller = new AbortController();
    resolveControllerRef.current = controller;
    let cancelled = false;

    async function resolveSession() {
      if (!getToken()) {
        if (cancelled) return;
        // A stale httpOnly cookie would make the server-side guard bounce
        // between /login and the protected route. Clear it once the client
        // knows there is no usable session.
        void clearSession();
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
        return;
      }
      try {
        const res = await apiFetch('/api/auth/me', { signal: controller.signal });
        const resolvedUser = res?.data?.user ?? null;
        if (cancelled) return;
        if (resolvedUser) {
          setUser(resolvedUser);
          setStatus(AUTH_STATUS.AUTHENTICATED);
        } else {
          await clearSession();
          setStatus(AUTH_STATUS.UNAUTHENTICATED);
        }
      } catch (error) {
        if (cancelled || error?.name === 'AbortError') return;
        await clearSession();
        setStatus(AUTH_STATUS.UNAUTHENTICATED);
      }
    }

    void resolveSession();

    return () => {
      cancelled = true;
      controller.abort();
      resolveControllerRef.current = null;
    };
  }, []);

  /**
   * A 401 on an authenticated request means the session expired. Abort
   * in-flight work, clear the session, and navigate exactly once.
   */
  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      resolveControllerRef.current?.abort();
      resolveControllerRef.current = null;
      void clearSession();
      setUser(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
      setSessionVersion((v) => v + 1);
      router.replace('/login?reason=session-expired');
    });
    return unsubscribe;
  }, [router]);

  /**
   * Sign in: establish the session first, then hand control back to the caller.
   *
   * `allowedRoles` is checked *before* the session is established, so an
   * account that is not allowed into this portal never receives a token or a
   * session cookie.
   */
  const login = useCallback(async (email, password, { allowedRoles } = {}) => {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    const accessToken = res?.data?.accessToken;
    const signedInUser = res?.data?.user;
    if (!accessToken || !signedInUser) {
      throw new Error('The backend did not return a valid login session.');
    }

    const role = normalizeRole(signedInUser.role);
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      await clearSession();
      throw new Error(
        `This account has the role "${role || 'UNKNOWN'}". A government officer or administrator account is required.`,
      );
    }

    await setSession(accessToken);
    if (mountedRef.current) {
      setUser({ ...signedInUser, role });
      setStatus(AUTH_STATUS.AUTHENTICATED);
      setSessionVersion((v) => v + 1);
    }
    return { ...signedInUser, role };
  }, []);

  const register = useCallback(async (payload) => {
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: payload });
    const accessToken = res?.data?.accessToken;
    const signedInUser = res?.data?.user;
    if (!accessToken || !signedInUser) {
      throw new Error('The backend did not return a valid registration session.');
    }
    await setSession(accessToken);
    if (mountedRef.current) {
      setUser(signedInUser);
      setStatus(AUTH_STATUS.AUTHENTICATED);
      setSessionVersion((v) => v + 1);
    }
    return signedInUser;
  }, []);

  /** Sign out: abort in-flight requests, clear the session, navigate once. */
  const logout = useCallback(async () => {
    resolveControllerRef.current?.abort();
    resolveControllerRef.current = null;
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // A failed logout call must not block the client-side session reset.
    }
    await clearSession();
    if (mountedRef.current) {
      setUser(null);
      setStatus(AUTH_STATUS.UNAUTHENTICATED);
      setSessionVersion((v) => v + 1);
    }
    router.replace('/login');
  }, [router]);

  const value = useMemo(
    () => ({
      status,
      user,
      sessionVersion,
      isAuthenticated: status === AUTH_STATUS.AUTHENTICATED,
      isLoading: status === AUTH_STATUS.LOADING,
      login,
      register,
      logout,
    }),
    [status, user, sessionVersion, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {status === AUTH_STATUS.LOADING ? <SessionLoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
