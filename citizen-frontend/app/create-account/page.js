"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "../components/AuthShell";
import { API_URL, createDashboardHandoff } from "../../lib/auth";

const inputClass =
  "min-h-12 w-full rounded-xl border border-[#cddbd1] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10";

export default function CreateAccountPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function readResponse(response) {
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "The request could not be completed.");
    }
    return result;
  }

  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Use at least 6 characters for your password.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
        }),
      });
      const result = await readResponse(response);
      setDevelopmentCode(result?.data?.verificationCode || "");
      setAwaitingVerification(true);
      setNotice(
        result.message ||
          "Account created. Enter the verification code sent to your email."
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          identifier: email.trim().toLowerCase(),
          code: (verificationCode || developmentCode).trim(),
          type: "EMAIL",
        }),
      });
      await readResponse(verifyResponse);

      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const loginResult = await readResponse(loginResponse);
      const accessToken = loginResult?.data?.accessToken;
      const user = loginResult?.data?.user;

      if (!accessToken || !user?.role) {
        throw new Error("Email verified, but the server did not return a valid sign-in session.");
      }

      await createDashboardHandoff(accessToken, user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not verify your email.");
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow={awaitingVerification ? "Verify your email" : "Join your community"}
      title={awaitingVerification ? "Check your inbox" : "Create your account"}
      description={
        awaitingVerification
          ? `Enter the verification code sent to ${email}.`
          : "Create a citizen account to report local issues and follow their progress."
      }
    >
      {notice && (
        <div role="status" className="mb-5 rounded-xl border border-[#cfe2d5] bg-[#f1f8f3] p-4 text-sm leading-6 text-[#31584b]">
          {notice}
          {developmentCode && (
            <p className="mt-2 font-semibold">
              Development verification code: <span className="font-mono">{developmentCode}</span>
            </p>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]">
          {error}
        </div>
      )}

      {awaitingVerification ? (
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label htmlFor="verification-code" className="mb-2 block text-sm font-semibold">Email verification code</label>
            <input
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={verificationCode || developmentCode}
              onChange={(event) => setVerificationCode(event.target.value)}
              className={`${inputClass} font-mono tracking-widest`}
              placeholder="Enter the code from your email"
            />
          </div>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#126448] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Verifying…" : "Verify email and continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAwaitingVerification(false);
              setVerificationCode("");
              setDevelopmentCode("");
              setNotice("");
              setError("");
            }}
            className="w-full py-2 text-sm font-semibold text-[#187a58] hover:underline"
          >
            Back to account details
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="account-name" className="mb-2 block text-sm font-semibold">Full name</label>
            <input id="account-name" type="text" autoComplete="name" minLength={2} maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} className={inputClass} placeholder="Your full name" />
          </div>
          <div>
            <label htmlFor="account-email" className="mb-2 block text-sm font-semibold">Email address</label>
            <input id="account-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="account-phone" className="mb-2 block text-sm font-semibold">Phone number <span className="font-normal text-[#7b8981]">(optional)</span></label>
            <input id="account-phone" type="tel" autoComplete="tel" pattern="[+0-9\s-]{7,20}" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} placeholder="+254 7XX XXX XXX" />
          </div>
          <div>
            <label htmlFor="account-password" className="mb-2 block text-sm font-semibold">Password</label>
            <div className="flex rounded-xl border border-[#cddbd1] focus-within:border-[#187a58] focus-within:ring-4 focus-within:ring-[#187a58]/10">
              <input id="account-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} maxLength={100} required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-l-xl px-4 py-3 outline-none" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="rounded-r-xl px-4 text-sm font-semibold text-[#187a58] hover:bg-[#f2f7f3]" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="mb-2 block text-sm font-semibold">Confirm password</label>
            <input id="account-confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={6} maxLength={100} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </div>
          <p className="text-xs leading-5 text-[#66776f]">Public registrations create citizen accounts. Officer and administrator access is assigned through the existing administrator process.</p>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#126448] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Creating account…" : "Create Account"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#66776f]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-[#187a58] hover:underline">Sign In</Link>
      </p>
    </AuthShell>
  );
}
