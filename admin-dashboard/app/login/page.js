"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../components/BrandLogo";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
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
        throw new Error("The backend did not return a valid login session.");
      }

      const role = String(user.role || "")
        .trim()
        .toUpperCase();

      if (!["ADMIN", "SUPER_ADMIN"].includes(role)) {
        throw new Error(
          "Access denied. Only an administrator can sign in here."
        );
      }

      localStorage.setItem("crs_admin_access_token", accessToken);
      localStorage.setItem("crs_access_token", accessToken);
      localStorage.setItem(
        "crs_admin_user",
        JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        })
      );

      router.push("/users");
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
        <BrandLogo className="mb-6 h-14 w-14" preload />

        <p className="text-sm font-semibold uppercase tracking-wider text-[#55745c]">
          Community Reporting System
        </p>

        <h1 className="mt-3 text-3xl font-bold">Admin Sign In</h1>

        <p className="mt-3 text-sm leading-6 text-[#687468]">
          Sign in with an authorized administrator account to manage users
          and government officer accounts.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter admin email"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none focus:border-[#55745c] focus:ring-2 focus:ring-[#eff1e9]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block text-sm font-semibold"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none focus:border-[#55745c] focus:ring-2 focus:ring-[#eff1e9]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#244637] px-5 py-3.5 font-semibold text-white transition hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 border-t border-[#edf0e9] pt-5 text-xs leading-5 text-[#687468]">
          Only accounts with the ADMIN or SUPER_ADMIN role can access
          administrator functions.
        </p>
      </section>
    </main>
  );
}