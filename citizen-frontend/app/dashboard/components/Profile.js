"use client";

import { useState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";
const USER_KEY = "crs_citizen_user";

function initialsFromName(name) {
  return (
    String(name || "C")
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C"
  );
}

export default function Profile({ token, user, reports, onLogout }) {
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem(USER_KEY)
        : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.avatarUrl && !avatarUrl) {
          setAvatarUrl(parsed.avatarUrl);
        }
      } catch {
        // ignore bad JSON
      }
    }
  }, [avatarUrl]);

  async function handleSave(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, phone }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.message || "Failed to update profile.");
        setBusy(false);
        return;
      }
      setNotice("Profile updated successfully.");

      const updatedUser = result?.data?.user || { name, email, phone };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          USER_KEY,
          JSON.stringify({ ...updatedUser, avatarUrl })
        );
      }
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
    setNotice(
      "Use 'Forgot password' on the sign-in page to change your password."
    );
    setBusy(false);
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setUploadingAvatar(true);
    setError("");

    setAvatarPreview(URL.createObjectURL(file));

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_BASE_URL}/api/uploads/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload avatar.");
      }
      const data = await res.json();
      const secureUrl = data.data?.url;
      if (!secureUrl) throw new Error("No image URL returned.");

      setAvatarUrl(secureUrl);
      setAvatarPreview(secureUrl);

      await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ avatarUrl: secureUrl }),
      });

      const currentUser =
        typeof window !== "undefined"
          ? JSON.parse(window.localStorage.getItem(USER_KEY) || "{}")
          : {};
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          USER_KEY,
          JSON.stringify({ ...currentUser, avatarUrl: secureUrl })
        );
      }

      setNotice("Profile photo updated.");
    } catch (err) {
      setError(err.message || "Could not upload avatar.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  }

  const pendingCount = reports.filter((r) =>
    ["Pending", "Submitted", "Under review"].includes(r.status)
  ).length;
  const inProgressCount = reports.filter((r) => r.status === "In progress").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const totalReports = reports.length;

  const displayAvatar = avatarPreview || avatarUrl;
  const showInitials = !displayAvatar;

  const avatarBgClass = displayAvatar ? "bg-white" : "bg-[#dce5d8]";

  return (
    <section className="max-w-6xl mx-auto">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
          Account
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          My Profile
        </h2>
        <p className="mt-3 text-sm leading-7 text-[#687468]">
          Manage your account information, profile photo, and preferences.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="border border-[#dce2d8] bg-[#fdfdf9] p-6 rounded-xl shadow-sm">
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div
                  className={`flex h-24 w-24 items-center justify-center rounded-full text-[#244637] font-semibold text-xl overflow-hidden border border-[#dce2d8] ${avatarBgClass}`}
                >
                  {showInitials ? (
                    <span>{initialsFromName(user?.name)}</span>
                  ) : (
                    <img
                      src={displayAvatar}
                      alt="Profile avatar"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full cursor-pointer hover:bg-emerald-700 transition-colors"
                  aria-label="Change profile photo"
                >
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Camera className="w-5 h-5" aria-hidden="true" />
                </label>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <Loader2 className="animate-spin w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-[#173c32]">
                {user?.name || "Citizen"}
              </h3>
              <p className="mt-1 text-sm text-[#687468] truncate max-w-xs">
                {user?.email || ""}
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="flex h-3 w-3 rounded-full bg-emerald-600" aria-hidden="true" />
                Verified Citizen
              </div>
            </div>

            <div className="mt-6 border-t border-[#dce2d8] pt-6">
              <h4 className="mb-3 text-sm font-semibold text-[#173c32]">
                Account Stats
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <dt className="text-[#687468]">Reports Submitted</dt>
                  <dd className="font-medium">{totalReports}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-[#687468]">Pending</dt>
                  <dd className="font-medium">{pendingCount}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-[#687468]">In Progress</dt>
                  <dd className="font-medium">{inProgressCount}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-[#687468]">Resolved</dt>
                  <dd className="font-medium">{resolvedCount}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="border border-[#dce2d8] bg-[#fdfdf9] p-6 sm:p-8 rounded-xl shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-[#173c32]">
              Personal Information
            </h3>
            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  autoCapitalize="sentences"
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
                  autoCapitalize="sentences"
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
          </div>

          <div className="border border-[#dce2d8] bg-[#fdfdf9] p-6 sm:p-8 rounded-xl shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-[#173c32]">
              Security Settings
            </h3>
            <p className="mb-4 text-sm text-[#687468]">
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
            <div className="mt-6">
              <button
                type="button"
                onClick={onLogout}
                className="border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
