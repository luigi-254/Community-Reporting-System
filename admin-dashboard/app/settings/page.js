"use client";

import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Settings
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage your admin dashboard settings
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="p-8">
        <div className="max-w-4xl space-y-6">

          {/* Profile Settings */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold">
              Administrator Profile
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-6">
              Information about the administrator account
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>
                <label className="block text-sm font-medium mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  defaultValue="System Administrator"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email Address
                </label>

                <input
                  type="email"
                  defaultValue="admin@communityreporting.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
                />
              </div>

            </div>
          </section>

          {/* Notification Settings */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold">
              Notifications
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-6">
              Control how the system sends notifications
            </p>

            <div className="space-y-5">

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Dashboard Notifications
                  </p>

                  <p className="text-sm text-gray-500">
                    Receive notifications about new reports
                  </p>
                </div>

                <button
                  onClick={() =>
                    setNotifications(!notifications)
                  }
                  className={`w-12 h-6 rounded-full ${
                    notifications
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                      notifications
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  ></span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    Email Alerts
                  </p>

                  <p className="text-sm text-gray-500">
                    Receive important system updates by email
                  </p>
                </div>

                <button
                  onClick={() =>
                    setEmailAlerts(!emailAlerts)
                  }
                  className={`w-12 h-6 rounded-full ${
                    emailAlerts
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                      emailAlerts
                        ? "translate-x-6"
                        : "translate-x-1"
                    }`}
                  ></span>
                </button>
              </div>

            </div>
          </section>

          {/* System Settings */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold">
              System Settings
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-6">
              Configure general system behaviour
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Maintenance Mode
                </p>

                <p className="text-sm text-gray-500">
                  Temporarily restrict access while maintenance is being performed
                </p>
              </div>

              <button
                onClick={() =>
                  setMaintenanceMode(!maintenanceMode)
                }
                className={`w-12 h-6 rounded-full ${
                  maintenanceMode
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              >
                <span
                  className={`block w-5 h-5 bg-white rounded-full transition-transform ${
                    maintenanceMode
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                ></span>
              </button>
            </div>
          </section>

          {/* Save */}
          <div className="flex justify-end">
            <button
              onClick={() =>
                alert("Settings saved successfully.")
              }
              className="px-6 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
            >
              Save Settings
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
