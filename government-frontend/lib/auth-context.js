'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      if (!getToken()) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const res = await apiFetch('/api/auth/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email, password) => {
    const res = await apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await apiFetch('/api/auth/register', { method: 'POST', body: payload });
    setToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
