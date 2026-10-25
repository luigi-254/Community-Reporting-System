"use client";

import Link from "next/link";
import { useState } from "react";
import AuthShell from "../components/AuthShell";
import { API_URL } from "../../lib/auth";

const inputClass =
  "min-h-12 w-full rounded-xl border border-[#cddbd1] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10";

async function readResponse(response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "The request could not be completed.");
  }
  return result;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [developmentToken, setDevelopmentToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestReset(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await readResponse(response);
      setDevelopmentToken(result?.dev?.resetCode || result?.dev?.resetToken || "");
      setRequested(true);
      setNotice(result.message || "If the account exists, recovery instructions have been sent.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      setBusy(false);
      return;
    }
    if (newPassword.length < 6) {
      setError("Use at least 6 characters for your new password.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token: resetToken.trim() || developmentToken,
          newPassword,
          confirmPassword,
        }),
      });
      const result = await readResponse(response);
      setComplete(true);
      setNotice(result.message || "Password updated. You can now sign in.");
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={complete ? "Password updated" : "Reset your password"}
      description={
        complete
          ? "Your password has been changed. Sign in with the new password to continue."
          : "Request a recovery code by email, then use it to choose a new password."
      }
    >
      {notice && (
        <div role="status" className="mb-5 rounded-xl border border-[#cfe2d5] bg-[#f1f8f3] p-4 text-sm leading-6 text-[#31584b]">
          {notice}
          {developmentToken && requested && (
            <p className="mt-2 font-semibold">
              Development reset code: <span className="break-all font-mono">{developmentToken}</span>
            </p>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm leading-6 text-[#8b392f]">
          {error}
        </div>
      )}

      {complete ? (
        <Link href="/sign-in" className="flex min-h-12 items-center justify-center rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#126448]">
          Return to Sign In
        </Link>
      ) : requested ? (
        <form onSubmit={resetPassword} className="space-y-5">
          <div>
            <label htmlFor="reset-code" className="mb-2 block text-sm font-semibold">Reset code</label>
            <input id="reset-code" type="text" autoComplete="one-time-code" value={resetToken || developmentToken} onChange={(event) => setResetToken(event.target.value)} required className={inputClass} placeholder="Enter the code from your email" />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-semibold">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={6} maxLength={100} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="mb-2 block text-sm font-semibold">Confirm new password</label>
            <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={6} maxLength={100} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          </div>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#126448] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Updating password…" : "Set New Password"}
          </button>
        </form>
      ) : (
        <form onSubmit={requestReset} className="space-y-5">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-semibold">Email address</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-[#187a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#126448] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Requesting code…" : "Send Recovery Code"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-[#66776f]">
        <Link href="/sign-in" className="font-semibold text-[#187a58] hover:underline">Back to Sign In</Link>
      </p>
    </AuthShell>
  );
}
