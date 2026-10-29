"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const INITIAL_FORM = {
  name: "",
  email: "",
  password: "",
  phone: "",
  county: "Kisii",
  subCounty: "",
  ward: "",
};

const inputClass =
  "w-full rounded-lg border border-[#cbd6c8] bg-white px-3 py-2.5 text-sm text-[#243329] outline-none focus:border-[#55745c] focus:ring-2 focus:ring-[#eff1e9]";

function getAdminToken() {
  if (typeof window === "undefined") return null;

  const keys = [
    "crs_admin_access_token",
    "crs_access_token",
    "accessToken",
    "access_token",
    "authToken",
    "token",
  ];

  for (const key of keys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  return null;
}

async function readResponse(response) {
  return response.json().catch(() => ({}));
}

function friendlyApiError(response, payload) {
  if (response.status === 401) {
    return "Your admin session is missing or expired. Sign in to the Admin Dashboard again.";
  }

  if (response.status === 403) {
    return "Access denied. Only an ADMIN or SUPER_ADMIN can manage officer accounts.";
  }

  return payload?.message || `Request failed with status ${response.status}.`;
}

export default function UsersPage() {
  const [officers, setOfficers] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOfficers = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getAdminToken();

    if (!token) {
      setError(
        "No admin login token was found. Sign in using an ADMIN or SUPER_ADMIN account before managing officers."
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/officers`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const payload = await readResponse(response);

      if (!response.ok) {
        throw new Error(friendlyApiError(response, payload));
      }

      const result = payload?.data?.officers;
      setOfficers(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load officer accounts. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  const filteredOfficers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return officers;

    return officers.filter((officer) =>
      [
        officer.name,
        officer.email,
        officer.phone,
        officer.county,
        officer.subCounty,
        officer.ward,
        officer.role,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [officers, search]);

  const activeCount = officers.filter(
    (officer) => officer.isActive !== false
  ).length;

  async function handleCreateOfficer(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const token = getAdminToken();

    if (!token) {
      setError("Please sign in to the Admin Dashboard before creating an officer.");
      return;
    }

    if (form.name.trim().length < 2) {
      setError("Enter the officer's full name.");
      return;
    }

    if (form.password.length < 6) {
      setError("The initial password must contain at least 6 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim(),
        county: form.county.trim(),
        subCounty: form.subCounty.trim(),
        ward: form.ward.trim(),
        isActive: true,
      };

      const response = await fetch(`${API_BASE_URL}/api/officers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const payload = await readResponse(response);

      if (!response.ok) {
        throw new Error(friendlyApiError(response, payload));
      }

      setForm(INITIAL_FORM);
      setSuccess(
        "Officer account created. The backend assigned the OFFICER role and saved the account."
      );

      await loadOfficers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create the officer account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <main className="min-h-screen bg-[#f7f7f2] p-5 text-[#243329] md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-5 border-b border-[#dce2d8] pb-7">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
              Community Reporting System
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Government Officer Management
            </h1>
            <p className="mt-2 text-sm text-[#687468]">
              Create officer accounts and manage the officers registered in the database.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-[#cbd6c8] px-4 py-3 text-sm font-medium text-[#244637] hover:bg-[#eff1e9]"
          >
            Back to Dashboard
          </Link>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#dce2d8] bg-white p-5">
            <p className="text-sm text-[#687468]">Total officers</p>
            <p className="mt-2 text-3xl font-semibold">{officers.length}</p>
          </div>
          <div className="rounded-xl border border-[#dce2d8] bg-white p-5">
            <p className="text-sm text-[#687468]">Active officers</p>
            <p className="mt-2 text-3xl font-semibold">{activeCount}</p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}

        <section className="mb-8 rounded-xl border border-[#dce2d8] bg-white p-5 md:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Create officer account</h2>
            <p className="mt-1 text-sm text-[#687468]">
              The backend assigns the OFFICER role. The officer can then sign in through the Government Portal.
            </p>
          </div>

          <form onSubmit={handleCreateOfficer} className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="officer-name" className="mb-2 block text-sm font-medium">
                Full name *
              </label>
              <input
                id="officer-name"
                name="name"
                value={form.name}
                onChange={updateField}
                className={inputClass}
                placeholder="Enter full name"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor="officer-email" className="mb-2 block text-sm font-medium">
                Email address *
              </label>
              <input
                id="officer-email"
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                className={inputClass}
                placeholder="officer@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="officer-password" className="mb-2 block text-sm font-medium">
                Initial password *
              </label>
              <input
                id="officer-password"
                name="password"
                type="password"
                value={form.password}
                onChange={updateField}
                className={inputClass}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                maxLength={100}
                required
              />
              <p className="mt-1 text-xs text-[#687468]">
                Give the officer their initial password securely.
              </p>
            </div>

            <div>
              <label htmlFor="officer-phone" className="mb-2 block text-sm font-medium">
                Phone number
              </label>
              <input
                id="officer-phone"
                name="phone"
                value={form.phone}
                onChange={updateField}
                className={inputClass}
                placeholder="Optional"
                autoComplete="tel"
              />
            </div>

            <div>
              <label htmlFor="officer-county" className="mb-2 block text-sm font-medium">
                County
              </label>
              <input
                id="officer-county"
                name="county"
                value={form.county}
                onChange={updateField}
                className={inputClass}
                placeholder="Kisii"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="officer-subcounty" className="mb-2 block text-sm font-medium">
                Sub-county
              </label>
              <input
                id="officer-subcounty"
                name="subCounty"
                value={form.subCounty}
                onChange={updateField}
                className={inputClass}
                placeholder="Optional"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="officer-ward" className="mb-2 block text-sm font-medium">
                Ward
              </label>
              <input
                id="officer-ward"
                name="ward"
                value={form.ward}
                onChange={updateField}
                className={inputClass}
                placeholder="Optional"
                maxLength={100}
              />
            </div>

            <div>
              <label htmlFor="officer-role" className="mb-2 block text-sm font-medium">
                Assigned role
              </label>
              <input
                id="officer-role"
                value="Government Officer (OFFICER)"
                className={`${inputClass} bg-[#eff1e9]`}
                readOnly
              />
              <p className="mt-1 text-xs text-[#687468]">
                This account creation form cannot assign administrator privileges.
              </p>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create officer account"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-[#dce2d8] bg-white p-5 md:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Registered officers</h2>
              <p className="mt-1 text-sm text-[#687468]">
                This list is loaded from the backend API.
              </p>
            </div>
            <button
              type="button"
              onClick={loadOfficers}
              disabled={loading}
              className="rounded-lg border border-[#cbd6c8] px-4 py-2 text-sm font-medium hover:bg-[#eff1e9] disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh list"}
            </button>
          </div>

          <div className="mb-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={inputClass}
              placeholder="Search by name, email, phone or location"
              aria-label="Search officers"
            />
          </div>

          {loading ? (
            <p className="py-8 text-sm text-[#687468]">Loading officer accounts...</p>
          ) : filteredOfficers.length === 0 ? (
            <p className="py-8 text-sm text-[#687468]">
              {officers.length === 0
                ? "No officer accounts were returned. Create an account using the form above."
                : "No officers match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] text-[#687468]">
                    <th className="px-3 py-3 font-medium">Name</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Location</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOfficers.map((officer) => (
                    <tr
                      key={officer.id || officer.email}
                      className="border-b border-[#edf0e9] last:border-0"
                    >
                      <td className="px-3 py-4 font-medium">
                        {officer.name || "Unnamed"}
                      </td>
                      <td className="px-3 py-4">{officer.email}</td>
                      <td className="px-3 py-4">
                        {[officer.ward, officer.subCounty, officer.county]
                          .filter(Boolean)
                          .join(", ") || "Not provided"}
                      </td>
                      <td className="px-3 py-4">Government Officer</td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            officer.isActive === false
                              ? "bg-amber-100 text-amber-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {officer.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
