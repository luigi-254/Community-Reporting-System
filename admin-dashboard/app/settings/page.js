"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";
import { StatusBadge, StatCard, EmptyState, LoadingState, ErrorState } from "../components";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
        <LoadingState message="Loading settings…" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
        <ErrorState
          message="No active session. Please sign in to access settings."
          onRetry={() => {}}
        />
      </div>
    );
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const settings = {
        notifications,
        emailAlerts,
        maintenanceMode,
      };
      localStorage.setItem("mtaafix_admin_settings", JSON.stringify(settings));
      setSaved(true);
    } catch {
      // Save failed silently; settings remain in memory for this session
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      <header className="border-b border-[#dce2d8] bg-[#244637] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4d3bf]">
              Mtaa Fix
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Settings</h1>
            <p className="mt-2 text-sm text-[#c4d3bf]">
              Manage your platform administrator settings.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-[#cbd6c8] bg-white px-4 py-2.5 text-sm font-semibold text-[#187a58] transition hover:bg-[#f5f8f5]"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        <div className="space-y-6">

          {/* Administrator Profile - real data from auth context */}
          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">Administrator Profile</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Profile information for the signed-in platform administrator.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="settings-full-name" className="mb-2 block text-sm font-medium">
                  Full Name
                </label>
                <input
                  id="settings-full-name"
                  type="text"
                  defaultValue={user.name || "—"}
                  readOnly
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm bg-[#f5f8f5]"
                />
              </div>

              <div>
                <label htmlFor="settings-email" className="mb-2 block text-sm font-medium">
                  Email Address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  defaultValue={user.email || "—"}
                  readOnly
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm bg-[#f5f8f5]"
                />
              </div>

              <div>
                <label htmlFor="settings-role" className="mb-2 block text-sm font-medium">
                  Role
                </label>
                <input
                  id="settings-role"
                  type="text"
                  defaultValue={
                    user.role
                      ? String(user.role).replace(/_/g, " ")
                      : "—"
                  }
                  readOnly
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm bg-[#f5f8f5]"
                />
              </div>

              <div>
                <label htmlFor="settings-status" className="mb-2 block text-sm font-medium">
                  Account Status
                </label>
                <StatusBadge
                  status={user.isActive ? "ACTIVE" : "INACTIVE"}
                  size="sm"
                  className="text-xs"
                />
              </div>
            </div>
          </section>

          {/* Notifications - session-level preferences */}
          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">Notifications</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Control how the system sends notifications. These preferences are
              stored for this session only.
            </p>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Dashboard Notifications</p>
                  <p className="text-sm text-[#687468]">
                    Receive notifications about new reports.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={
                    notifications
                      ? "Turn dashboard notifications off"
                      : "Turn dashboard notifications on"
                  }
                  aria-pressed={notifications}
                  onClick={() => setNotifications((value) => !value)}
                  className={`h-6 w-12 rounded-full ${
                    notifications ? "bg-[#187a58]" : "bg-[#cbd6c8]"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      notifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Email Alerts</p>
                  <p className="text-sm text-[#687468]">
                    Receive important system updates by email.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label={
                    emailAlerts ? "Turn email alerts off" : "Turn email alerts on"
                  }
                  aria-pressed={emailAlerts}
                  onClick={() => setEmailAlerts((value) => !value)}
                  className={`h-6 w-12 rounded-full ${
                    emailAlerts ? "bg-[#187a58]" : "bg-[#cbd6c8]"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                      emailAlerts ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* System Settings */}
          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">System Settings</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Configure general system behavior. These preferences are stored
              for this session only.
            </p>

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-[#687468]">
                  Temporarily restrict access while maintenance is being performed.
                </p>
              </div>

              <button
                type="button"
                aria-label={
                  maintenanceMode
                    ? "Turn maintenance mode off"
                    : "Turn maintenance mode on"
                }
                aria-pressed={maintenanceMode}
                onClick={() => setMaintenanceMode((value) => !value)}
                className={`h-6 w-12 rounded-full ${
                  maintenanceMode ? "bg-[#187a58]" : "bg-[#cbd6c8]"
                }`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#187a58] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && (
              <span className="ml-4 text-sm text-[#187a58] font-semibold">
                Settings saved for this session.
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
