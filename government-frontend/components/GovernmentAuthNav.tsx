
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function GovernmentAuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(
      Boolean(localStorage.getItem("crs_government_access_token"))
    );
  }, [pathname]);

  function handleSignOut() {
    localStorage.removeItem("crs_government_access_token");
    localStorage.removeItem("crs_government_user");

    setSignedIn(false);
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link href="/government" className="font-bold text-slate-900">
          Community Reporting System
          <span className="ml-2 text-sm font-normal text-slate-500">
            Government Portal
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {signedIn && (
            <Link
              href="/government"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Dashboard
            </Link>
          )}

          {signedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
