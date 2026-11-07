"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The Admin Dashboard does not host a government officer dashboard.
 * Government officers use the separate Government Frontend (port 302).
 * This route redirects to the Admin Dashboard home to avoid serving
 * a duplicate government dashboard in the wrong application shell.
 */
export default function GovernmentRouteRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
