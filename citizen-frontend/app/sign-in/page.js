"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { API_URL } from "../../lib/auth";

const TOKEN_KEY = "crs_citizen_access_token";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || "Sign-in failed. Check your details and try again.");
      }

      const accessToken = result?.data?.accessToken;
      const user = result?.data?.user;
      if (!accessToken || !user?.role) {
        throw new Error("The server did not return a valid sign-in session.");
      }

      // Persist session and go straight to the citizen dashboard.
      window.localStorage.setItem(TOKEN_KEY, accessToken);
      window.localStorage.setItem("crs_citizen_user", JSON.stringify(user));
      document.cookie = `${TOKEN_KEY}=${accessToken}; path=/; max-age=604800; SameSite=Lax`;

      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get("redirectTo") || "/dashboard";
      router.push(redirectTo);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to sign in. Please try again."
      );
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to MtaaFix"
      description="Use your registered email and password. We’ll take you to the right workspace."
    >
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="signin-email" className="mb-2 block text-sm font-semibold">Email address</label>
            <input
            id="signin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoCapitalize="sentences"
            placeholder="you@example.com"
            className="min-h-12 w-full rounded-xl border border-[#cddbd1] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="signin-password" className="text-sm font-semibold">Password</label>
            <Link href="/forgot-password" className="text-xs font-semibold text-[#187a58] hover:underline">Forgot password?</Link>
          </div>
          <div className="flex rounded-xl border border-[#cddbd1] focus-within:border-[#187a58] focus-within:ring-4 focus-within:ring-[#187a58]/10">
            <input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 min-w-0 flex-1 rounded-l-xl px-4 py-3 outline-none"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-r-xl px-4 text-sm font-semibold text-[#187a58] hover:bg-[#f2f7f3]" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-wait disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin w-4 h-4 mr-2" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#66776f]">
        New to MtaaFix?{" "}
        <Link href="/create-account" className="font-semibold text-[#187a58] hover:underline">Create an account</Link>
      </p>
      <p className="mt-4 text-center text-xs text-[#7b8981]">
        <Link href="/" className="hover:text-[#187a58]">Back to home</Link>
      </p>
    </AuthShell>
  );
}
