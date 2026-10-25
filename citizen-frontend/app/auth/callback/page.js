"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, normalizeRole } from "../../../lib/auth";

export default function CitizenAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const codeRef = useRef(null);
  const exchangePromiseRef = useRef(null);

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
        if (!accessToken || normalizeRole(user?.role) !== "CITIZEN") {
          throw new Error("This account is not authorized for the citizen dashboard.");
        }

        if (cancelled) return;
        window.localStorage.setItem("crs_citizen_access_token", accessToken);
        window.localStorage.setItem("crs_citizen_user", JSON.stringify(user));
        router.replace("/dashboard");
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
    <main className="flex min-h-screen items-center justify-center bg-[#f2f7f3] px-5 text-[#173c32]">
      <section className="w-full max-w-md rounded-2xl border border-[#e1ebe4] bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#e6f3eb] font-bold text-[#187a58]">M</div>
        <h1 className="mt-5 text-xl font-bold">Finishing sign-in</h1>
        {error ? (
          <>
            <p role="alert" className="mt-3 text-sm leading-6 text-[#8b392f]">{error}</p>
            <Link href="/sign-in" className="mt-6 inline-flex rounded-lg bg-[#187a58] px-5 py-3 text-sm font-semibold text-white">Return to sign in</Link>
          </>
        ) : (
          <p className="mt-3 text-sm text-[#66776f]">Connecting your account to the citizen workspace…</p>
        )}
      </section>
    </main>
  );
}
