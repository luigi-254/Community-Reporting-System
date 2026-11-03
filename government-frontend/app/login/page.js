'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function GovernmentLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(email, password);
      const searchParams = new URLSearchParams(window.location.search);
      const redirectTo = searchParams.get("redirectTo") || "/government";
      router.push(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-10 text-[#243329]">
      <section className="w-full max-w-md rounded-2xl border border-[#dce2d8] bg-white p-7 shadow-sm sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white ring-1 ring-black/5 mb-6">
          <img
            src="/brand/mtaa-fix-logo.png"
            alt="MTAA Fix"
            width={416}
            height={344}
            className="h-full w-full object-contain"
          />
        </div>

        <p className="text-sm font-semibold uppercase tracking-wider text-[#55745c]">
          Mtaa Fix
        </p>

        <h1 className="mt-3 text-3xl font-bold">Government Portal Sign In</h1>

        <p className="mt-3 text-sm leading-6 text-[#687468]">
          Enter your administrator credentials to access the management dashboard.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-lg border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm text-[#8b392f]"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="gov-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email address
            </label>
            <input
              id="gov-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter admin email"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none focus:border-[#55745c] focus:ring-2 focus:ring-emerald-600 placeholder:text-[#7a8378]"
            />
          </div>

          <div>
            <label
              htmlFor="gov-password"
              className="mb-2 block text-sm font-semibold"
            >
              Password
            </label>
            <input
              id="gov-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none focus:border-[#55745c] focus:ring-2 focus:ring-emerald-600 placeholder:text-[#7a8378]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#187a58] px-5 py-3.5 font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-6 border-t border-[#edf0e9] pt-5 text-xs leading-5 text-[#55745c]">
          Only accounts with an administrator role can access the government
          dashboard.
        </p>
      </section>
    </main>
  );
}
