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
    <main style={{ maxWidth: 420, margin: '40px auto', padding: 16 }}>
      <h1>Create account</h1>
      <form onSubmit={onSubmit}>
        <label>Full name</label>
        <input value={form.name} onChange={update('name')} required />
        <label>Email</label>
        <input type="email" value={form.email} onChange={update('email')} required />
        <label>Phone (optional)</label>
        <input value={form.phone} onChange={update('phone')} />
        <label>Password</label>
        <input type="password" value={form.password} onChange={update('password')} required minLength={8} />
        {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
        <button disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
      </form>
      <p>
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </main>
  );
}
