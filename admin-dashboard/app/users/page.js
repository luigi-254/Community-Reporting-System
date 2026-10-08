"use client";

import Link from "next/link";
import { useState } from "react";

const users = [
  {
    id: "USR-001",
    name: "Enock Matara",
    email: "enock@example.com",
    role: "Citizen",
    reports: 4,
    status: "Active",
  },
  {
    id: "USR-002",
    name: "John osiemo",
    email: "john@example.com",
    role: "Citizen",
    reports: 7,
    status: "Active",
  },
  {
    id: "USR-003",
    name: "Fidel Langa",
    email: "fidel@example.com",
    role: "Citizen",
    reports: 2,
    status: "Active",
  },
  {
    id: "USR-004",
    name: "Brian Philip",
    email: "brian@example.com",
    role: "Citizen",
    reports: 5,
    status: "Inactive",
  },
  {
    id: "USR-005",
    name: "David Kamau",
    email: "david@example.com",
    role: "Government Officer",
    reports: 12,
    status: "Active",
  },
];

export default function UsersPage() {
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage citizens and government users
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

      <main className="p-8">
        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium mb-2">
            Search Users
          </label>

          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/2 border border-gray-300 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-gray-300"
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-bold">Registered Users</h2>

            <p className="text-sm text-gray-500 mt-1">
              {filteredUsers.length} users found
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold">
                    User ID
                  </th>

                  <th className="text-left px-6 py-4 font-semibold">
                    Name
                  </th>

                  <th className="text-left px-6 py-4 font-semibold">
                    Email
                  </th>

                  <th className="text-left px-6 py-4 font-semibold">
                    Role
                  </th>

                  <th className="text-left px-6 py-4 font-semibold">
                    Reports
                  </th>

                  <th className="text-left px-6 py-4 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-medium">
                      {user.id}
                    </td>

                    <td className="px-6 py-4">
                      {user.name}
                    </td>

                    <td className="px-6 py-4 text-gray-600">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      {user.role}
                    </td>

                    <td className="px-6 py-4">
                      {user.reports}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
