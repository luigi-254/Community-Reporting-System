"use client";

import { useState } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      <header className="border-b border-[#dce2d8] bg-[#244637] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4d3bf]">
              Community Reporting System
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Settings</h1>
            <p className="mt-2 text-sm text-[#c4d3bf]">
              Manage your admin dashboard settings.
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
          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">Administrator Profile</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Information about the administrator account.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="full-name" className="mb-2 block text-sm font-medium">
                  Full Name
                </label>
                <input
                  id="full-name"
                  type="text"
                  defaultValue="System Administrator"
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/10"
                />
              </div>

              <div>
                <label htmlFor="email-address" className="mb-2 block text-sm font-medium">
                  Email Address
                </label>
                <input
                  id="email-address"
                  type="email"
                  defaultValue="admin@communityreporting.com"
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm outline-none focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/10"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">Notifications</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Control how the system sends notifications.
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

          <section className="rounded-xl border border-[#dce2d8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#173c32]">System Settings</h2>
            <p className="mt-1 text-sm text-[#687468]">
              Configure general system behavior.
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
              onClick={() => alert("Settings saved successfully.")}
              className="rounded-lg bg-[#187a58] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#126448]"
            >
              Save Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
