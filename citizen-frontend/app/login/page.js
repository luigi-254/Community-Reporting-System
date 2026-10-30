'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
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
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-[#243329] sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="inline-flex items-center gap-3 font-semibold mb-8 text-[#173c32]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white ring-1 ring-black/5">
            <span className="text-2xl font-bold tracking-tight">M</span>
          </span>
          <span className="text-xl">MtaaFix</span>
        </Link>

        <h1 className="mb-2 text-3xl font-bold text-[#173c32]">Sign in</h1>
        <p className="mb-8 text-sm leading-6 text-[#687468]">
          Sign in to access your community reports.
        </p>

        {error ? (
          <div role="alert" className="mb-6 rounded-lg border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-[#173c32]">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-[#173c32]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <button
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#687468]">
          New to MtaaFix?{' '}
          <Link href="/create-account" className="font-semibold text-[#187a58] hover:underline">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
