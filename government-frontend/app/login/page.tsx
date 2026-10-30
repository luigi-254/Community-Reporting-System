"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../../components/BrandLogo";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function GovernmentLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Login failed. Check your email and password."
        );
      }

      const accessToken = result?.data?.accessToken;
      const user = result?.data?.user;

      if (!accessToken || !user) {
        throw new Error(
          "The backend did not return a valid login session."
        );
      }

      const role = String(user.role || user.userRole || "")
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, "_");

     
const allowedRoles = [
  "OFFICER",
  "ADMIN",
  "SUPER_ADMIN",
];
      if (!allowedRoles.includes(role)) {
        throw new Error(
          `This account has the role "${role || "UNKNOWN"}". A government officer or administrator account is required.`
        );
      }

      // Keep this token separate from the citizen's login token.
      localStorage.setItem("crs_government_access_token", accessToken);

      localStorage.setItem(
        "crs_government_user",
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        })
      );

      router.push("/government");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Check that the backend is running."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-10 text-[#243329]">
      <section className="w-full max-w-md rounded-2xl border border-[#dce2d8] bg-white p-7 shadow-sm sm:p-9">
        <BrandLogo className="mb-7 h-14 w-14" preload />

        <p className="text-sm font-semibold uppercase tracking-wider text-[#55745c]">
          Community Reporting System
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#173c32]">
          Government Portal
        </h1>

        <p className="mt-3 text-sm leading-6 text-[#687468]">
          Sign in with your authorized government officer or administrator
          account to manage community reports in Kisii County.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="government-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email address
            </label>

            <input
              id="government-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your government account email"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>

          <div>
            <label
              htmlFor="government-password"
              className="mb-2 block text-sm font-semibold"
            >
              Password
            </label>

            <input
              id="government-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#187a58] px-5 py-3.5 font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 border-t border-[#e8eee9] pt-5 text-xs leading-5 text-[#687468]">
          Only authorized accounts can update report statuses. Citizen
          accounts cannot perform government actions.
        </p>
      </section>
    </main>
  );
}