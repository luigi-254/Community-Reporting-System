
"use client";

import { useState } from "react";
import Link from "next/link";

const initialUsers = [
  {
    id: 1,
    name: "Enock matara",
    email: "enock@example.com",
    role: "Citizen",
    status: "Active",
    reports: 3,
  },
  {
    id: 2,
    name: "John Osiemo",
    email: "john@example.com",
    role: "Citizen",
    status: "Active",
    reports: 5,
  },
  {
    id: 3,
    name: "Admin User",
    email: "admin@example.com",
    role: "Administrator",
    status: "Active",
    reports: 0,
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("Citizen");
  const [message, setMessage] = useState("");

  const activeUsers = users.filter(
    (user) => user.status === "Active"
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.status === "Inactive"
  ).length;

  const filteredUsers = users.filter((user) => {
    const searchText =
      `${user.name} ${user.email} ${user.role}`.toLowerCase();

    const matchesSearch = searchText.includes(
      search.toLowerCase().trim()
    );

    const matchesRole =
      roleFilter === "All" || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  function toggleStatus(id) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "Active" ? "Inactive" : "Active",
            }
          : user
      )
    );

    setMessage("User status updated in this demo.");
  }

  function addUser(event) {
    event.preventDefault();

    const name = newName.trim();
    const email = newEmail.trim();

    if (!name || !email) {
      setMessage("Please enter the user's name and email.");
      return;
    }

    const emailExists = users.some(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      setMessage("A user with this email already exists.");
      return;
    }

    const newUser = {
      id: Date.now(),
      name,
      email,
      role: newRole,
      status: "Active",
      reports: 0,
    };

    setUsers((currentUsers) => [...currentUsers, newUser]);

    setNewName("");
    setNewEmail("");
    setNewRole("Citizen");
    setShowAddForm(false);
    setRoleFilter("All");
    setSearch("");
    setMessage("Demo user added successfully.");
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              User Management
            </h1>
            <p className="mt-2 text-gray-600">
              View and manage community reporting system users.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Back to Dashboard
          </Link>
        </header>

        {/* User Statistics */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="mt-2 text-3xl font-bold">
              {users.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {activeUsers}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Inactive Users</p>
            <p className="mt-2 text-3xl font-bold text-gray-500">
              {inactiveUsers}
            </p>
          </div>
        </section>

        {/* User Management Controls */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Manage Users</h2>
              <p className="mt-1 text-sm text-gray-500">
                Search, filter, or add a demo user.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddForm((current) => !current);
                setMessage("");
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {showAddForm ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {message && (
            <p
              role="status"
              className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800"
            >
              {message}
            </p>
          )}

          {/* Add User Form */}
          {showAddForm && (
            <form
              onSubmit={addUser}
              className="mt-5 grid gap-4 border-t border-gray-100 pt-5 md:grid-cols-2"
            >
              <div>
                <label
                  htmlFor="new-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full Name
                </label>
                <input
                  id="new-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Enter full name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email Address
                </label>
                <input
                  id="new-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="Enter email address"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="new-role"
                  className="mb-2 block text-sm font-medium"
                >
                  User Role
                </label>
                <select
                  id="new-role"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="Citizen">Citizen</option>
                  <option value="Government Officer">
                    Government Officer
                  </option>
                  <option value="Administrator">
                    Administrator
                  </option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
                >
                  Create Demo User
                </button>
              </div>
            </form>
          )}

          {/* Search and Role Filter */}
          <div className="mt-5 grid gap-4 border-t border-gray-100 pt-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="user-search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search Users
              </label>
              <input
                id="user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, or role..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="role-filter"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Filter by Role
              </label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:border-blue-500"
              >
                <option value="All">All Roles</option>
                <option value="Citizen">Citizen</option>
                <option value="Government Officer">
                  Government Officer
                </option>
                <option value="Administrator">Administrator</option>
              </select>
            </div>
          </div>
        </section>

        {/* Users Table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
            <h2 className="text-lg font-bold">System Users</h2>
            <p className="text-sm text-gray-500">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Reports</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">
                      {user.name}
                    </td>

                    <td className="p-4 text-gray-600">
                      {user.email}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {user.role}
                      </span>
                    </td>

                    <td className="p-4">{user.reports}</td>

                    <td className="p-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => toggleStatus(user.id)}
                        aria-label={`${user.status === "Active" ? "Deactivate" : "Activate"} ${user.name}`}
                        className={`font-medium ${
                          user.status === "Active"
                            ? "text-red-600 hover:text-red-800"
                            : "text-green-600 hover:text-green-800"
                        }`}
                      >
                        {user.status === "Active"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-500"
                    >
                      No users match your search or selected role.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Demo Notice */}
        <p className="mt-4 text-xs text-gray-500">
          Demo data only. User additions and status changes are held in
          browser memory and are not saved to a database. Refreshing the
          page resets these changes.
        </p>
      </div>
    </main>
  );
}
