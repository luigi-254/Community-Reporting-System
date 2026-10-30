"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const CITIZEN_APP_URL =
  process.env.NEXT_PUBLIC_CITIZEN_APP_URL ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:3002");

export default function GovernmentAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const codeRef = useRef<string | null>(null);
  const exchangePromiseRef = useRef<
    Promise<{ accessToken?: string; user?: { role?: string } } | undefined> | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const code =
        codeRef.current ||
        new URLSearchParams(window.location.hash.slice(1)).get("code");

      if (!code) {
        setError("The sign-in link is missing its code. Please sign in again.");
        return;
      }

      codeRef.current = code;
      window.history.replaceState(null, "", window.location.pathname);

      try {
        if (!exchangePromiseRef.current) {
          exchangePromiseRef.current = fetch(
            `${API_URL}/api/auth/handoff/exchange`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              cache: "no-store",
              body: JSON.stringify({ code }),
            }
          ).then(async (response) => {
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(
                result.message || "This sign-in link is invalid or expired."
              );
            }
            return result?.data;
          });
        }

        const data = await exchangePromiseRef.current;
        const accessToken = data?.accessToken;
        const user = data?.user;
        const role = String(user?.role || "")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");
        if (!accessToken || !["OFFICER", "ADMIN", "SUPER_ADMIN"].includes(role)) {
          throw new Error("This account is not authorized for the government dashboard.");
        }

        if (cancelled) return;
        window.localStorage.setItem("crs_government_access_token", accessToken);
        window.localStorage.setItem("crs_government_user", JSON.stringify(user));
        router.replace("/government");
      } catch (exchangeError) {
        if (!cancelled) {
          setError(
            exchangeError instanceof Error
              ? exchangeError.message
              : "Could not complete sign-in. Please try again."
          );
        }
      }
    }

    completeSignIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 text-[#243329]">
      <section className="w-full max-w-md rounded-2xl border border-[#cbd6c8] bg-[#fdfdf9] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5f3eb] font-bold text-[#187a58]">M</div>
        <h1 className="mt-5 text-xl font-bold">Finishing sign-in</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-sm leading-6 text-[#8b392f]">{error}</p>
            {CITIZEN_APP_URL ? (
              <a href={`${CITIZEN_APP_URL.replace(/\/+$/, "")}/sign-in`} className="mt-6 inline-flex rounded-lg bg-[#187a58] px-5 py-3 text-sm font-semibold text-white">Return to MtaaFix</a>
            ) : (
              <p className="mt-4 text-xs text-[#687468]">Set NEXT_PUBLIC_CITIZEN_APP_URL to show the portal sign-in link.</p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-[#687468]">Connecting your account to the government workspace…</p>
        )}
      </section>
    </main>
  );
}
