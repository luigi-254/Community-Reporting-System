"use client";

import { useEffect, useState } from "react";
import BrandLogo from "../../components/BrandLogo";
import { normalizeRole } from "../../../lib/auth";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

export default function DashboardLayout({ children }) {
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setSessionReady(true);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }

        const result = await response.json().catch(() => ({}));
        const currentUser = result?.data?.user;

        if (!currentUser) {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }

        if (normalizeRole(currentUser.role) !== "CITIZEN") {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }

        if (!cancelled) {
          setUser(currentUser);
        }
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!sessionReady) {
    return null;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
