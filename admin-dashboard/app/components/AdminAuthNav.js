"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TOKEN_KEYS = [
  "crs_admin_access_token",
  "crs_access_token",
  "accessToken",
  "access_token",
  "authToken",
  "token",
];

export default function AdminAuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    function checkSession() {
      setSignedIn(
        Boolean(window.localStorage.getItem("crs_admin_access_token"))
      );
    }

    checkSession();

    window.addEventListener("storage", checkSession);

    return () => {
      window.removeEventListener("storage", checkSession);
    };
  }, [pathname]);

  function handleSignOut() {
    TOKEN_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
    });

    window.localStorage.removeItem("crs_admin_user");

    setSignedIn(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[#dce2d8] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="font-bold text-[#244637]">
          Community Reporting System
          <span className="ml-2 text-xs font-normal text-[#687468]">
            Admin Portal
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {signedIn && (
            <Link
              href="/users"
              className="text-sm font-medium text-[#244637] hover:underline"
            >
              Manage Officers
            </Link>
          )}

          {signedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-[#244637] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#19372a]"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[#244637] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#19372a]"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}