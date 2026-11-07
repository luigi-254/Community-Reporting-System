"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { getRoleRoute } from "../../lib/roles-config";

/**
 * Root government route. Reads the authenticated user's role from the session
 * and redirects to the correct role-specific dashboard, e.g.
 *   Governor -> /government/governor
 *   CECM     -> /government/cecm
 *
 * If the session is still loading, renders nothing (the AuthProvider shows a
 * spinner). If unauthenticated, the proxy redirects to /login.
 */
export default function GovernmentDashboardRedirect() {
  const router = useRouter();
  const { status, user } = useAuth();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    if (redirected) return;
    if (status === "authenticated" && user) {
      const target = getRoleRoute(user.role);
      router.replace(target);
      setRedirected(true);
    }
  }, [status, user, router, redirected]);

  if (status === "loading") return null;
  return null;
}
