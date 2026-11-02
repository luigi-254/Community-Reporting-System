"use client";

import { useState } from "react";
import { normalizeReport } from "../utils/reportUtils";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

export default function Profile({ token, user, reports, onLogout }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSave(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/me`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, email, phone }),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.message || "Failed to update profile.");
        setBusy(false);
        return;
      }
      setNotice("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update profile.");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    // Password change would need current password + new password fields
    // For now, redirect to forgot-password flow
    setNotice("Use 'Forgot password' on the sign-in page to change your password.");
    setBusy(false);
  }

  return (
    <section className="max-w-3xl">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
          Account
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">My Profile</h2>
        <p className="mt-3 text-sm leading-7 text-[#687468]">
          Manage your account information and preferences.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-6 border-l-4 border-[#55745c] bg-[#e8eee3] p-4 text-sm leading-6 text-[#244637]">
          {notice}
        </div>
      )}

      <div className="border border-[#dce2d8] bg-[#fdfdf9] p-6 sm:p-8">
        <div className="flex items-center gap-4 border-b border-[#dce2d8] pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#dce5d8] text-lg font-semibold text-[#244637]">
            {String(user?.name || "C")
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold">{user?.name || "Citizen"}</h3>
            <p className="mt-1 text-sm text-[#687468]">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-6 space-y-5">
          <div>
            <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="mb-2 block text-sm font-semibold">
              Email address
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            />
          </div>
          <div>
            <label htmlFor="profile-phone" className="mb-2 block text-sm font-semibold">
              Phone number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="min-h-12 w-full rounded-xl border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#55745c]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="min-h-12 w-full rounded-xl bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save changes"}
          </button>
        </form>

        <div className="mt-8 border-t border-[#dce2d8] pt-6">
          <h4 className="mb-3 text-sm font-semibold text-[#173c32]">Change password</h4>
          <p className="text-sm text-[#687468]">
            Use the password reset flow on the sign-in page to change your
            password.
          </p>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={busy}
            className="mt-4 border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9] disabled:opacity-60"
          >
            Reset password
          </button>
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onLogout}
            className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="mt-8 border border-[#dce2d8] bg-[#fdfdf9] p-6 sm:p-8">
        <h3 className="mb-4 text-sm font-semibold text-[#173c32]">Account summary</h3>
        <dl className="space-y-4">
          <div className="flex justify-between text-sm">
            <dt className="text-[#687468]">Account role</dt>
            <dd className="font-medium">{user?.role || "CITIZEN"}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-[#687468]">Reports submitted</dt>
            <dd className="font-medium">{reports.length}</dd>
          </div>
          <div className="flex justify-between text-sm">
            <dt className="text-[#687468]">Account verification</dt>
            <dd className="font-medium">
              {user?.isVerified ? "Verified" : "Not verified"}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
