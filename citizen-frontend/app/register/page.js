'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const onSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await register(form);
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

        <h1 className="mb-2 text-3xl font-bold text-[#173c32]">Create account</h1>
        <p className="mb-8 text-sm leading-6 text-[#687468]">
          Register to submit and track community reports.
        </p>

        {error ? (
          <div role="alert" className="mb-6 rounded-lg border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label htmlFor="register-name" className="mb-2 block text-sm font-semibold text-[#173c32]">Full name</label>
            <input
              id="register-name"
              value={form.name}
              onChange={update('name')}
              required
              minLength={2}
              maxLength={100}
              placeholder="Your full name"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <div>
            <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-[#173c32]">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <div>
            <label htmlFor="register-phone" className="mb-2 block text-sm font-semibold text-[#173c32]">Phone number <span className="font-normal text-[#7a8378]">(optional)</span></label>
            <input
              value={form.phone}
              onChange={update('phone')}
              placeholder="+254 7XX XXX XXX"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <div>
            <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-[#173c32]">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={6}
              maxLength={100}
              placeholder="At least 6 characters"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
            />
          </div>
          <button
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[#687468]">
          Already registered?{' '}
          <Link href="/sign-in" className="font-semibold text-[#187a58] hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
