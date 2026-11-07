"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../../components/BrandLogo";
import { Eye, EyeOff } from "lucide-react";
import { useAuth, AUTH_STATUS } from "../../lib/auth-context";
import { getRoleRoute } from "../../lib/roles-config";

const ALLOWED_ROLES = [
  "GOVERNOR",
  "CECM",
  "CHIEF_OFFICER",
  "TECHNICAL_HEAD",
  "TECHNICAL_SUPERVISOR",
  "WARD_ADMIN",
  "SUBCOUNTY_ADMIN",
  "FIELD_OFFICER",
  "DISASTER_MANAGER",
  "ENFORCEMENT_OFFICER",
  "OFFICER",
  "DEPARTMENTAL_ADMIN",
  "ADMIN",
  "SUPER_ADMIN",
];

export default function GovernmentLoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Exactly one navigation may happen, whether it is triggered by the sign-in
  // handler or by an already-active session being detected.
  const navigatedRef = useRef(false);
  const redirectRef = useRef<string | null>(null);

  const redirectTarget = useCallback(() => {
    if (redirectRef.current) return redirectRef.current;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("redirectTo");
    redirectRef.current =
      requested && requested.startsWith("/") ? requested : "/government";
    return redirectRef.current;
  }, []);

  const navigateOnce = useCallback(
    (target: string) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      router.replace(target);
    },
    [router],
  );

  // Already signed in: leave the login screen once, without a full reload.
  // When a session already exists, redirect to the role-specific dashboard
  // rather than the generic /government shell.
  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED) {
      navigateOnce(redirectTarget());
    }
  }, [status, navigateOnce, redirectTarget]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");

    try {
      // The session (token + httpOnly cookie) is established first; the
      // navigation happens exactly once afterwards.
      const result = await login(email.trim(), password, {
        allowedRoles: ALLOWED_ROLES,
      });
      // Redirect to the role-specific dashboard when no explicit redirectTo
      // was supplied, e.g. Governor -> /government/governor.
      const target =
        redirectTarget() === "/government" ? getRoleRoute(result.role) : redirectTarget();
      navigateOnce(target);
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
          Mtaa Fix
        </p>

        <h1 className="mt-3 text-3xl font-bold text-[#173c32]">
          Government Portal
        </h1>

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

            <div className="flex rounded-lg border border-[#cbd6c8] focus-within:border-[#187a58] focus-within:ring-4 focus-within:ring-[#187a58]/10">
              <input
                id="government-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="min-w-0 flex-1 rounded-l-xl px-4 py-3 outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded-r-xl px-4 text-sm font-semibold text-[#187a58] hover:bg-[#f2f7f3]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Eye className="w-4 h-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#187a58] px-5 py-3.5 font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
