"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-5 py-10 text-gray-800">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
        <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-2xl text-white">
          🏛️
        </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
          Community Reporting System
        </p>

        <h1 className="mt-3 text-3xl font-bold">
          Government Portal
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-500">
          Sign in with your authorized government officer or administrator
          account to manage community reports in Kisii County.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 border-t border-gray-100 pt-5 text-xs leading-5 text-gray-500">
          Only authorized accounts can update report statuses. Citizen
          accounts cannot perform government actions.
        </p>
      </section>
    </main>
  );
}