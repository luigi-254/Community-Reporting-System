
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BrandLogo from "./BrandLogo";

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
    <header className="sticky top-0 z-50 border-b border-[#dce2d8] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
        <Link
          href="/government"
          className="flex items-center gap-3 font-bold text-[#173c32]"
        >
          <BrandLogo className="h-9 w-9" preload />
          <span>
            Community Reporting System
            <span className="ml-2 text-sm font-normal text-[#687468]">
              Government Portal
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-3">
          {signedIn && (
            <Link
              href="/government"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#687468] hover:bg-[#f5f8f5]"
            >
              Dashboard
            </Link>
          )}

          {signedIn ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126448]"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126448]"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
