"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../lib/auth-context";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

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

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionStyle(action) {
  const value = String(action || "").toUpperCase();
  const styles = {
    CREATE: "bg-[#e6f3eb] text-[#187a58]",
    UPDATE: "bg-[#e4e8dd] text-[#344338]",
    DELETE: "bg-[#fff3f0] text-[#8b392f]",
    LOGIN: "bg-[#e8eee3] text-[#243329]",
    LOGOUT: "bg-[#e8eee3] text-[#243329]",
    ESCALATE: "bg-[#f0ebd9] text-[#66572f]",
    RESOLVE: "bg-[#dce8d8] text-[#244637]",
    ASSIGN: "bg-[#dce8d8] text-[#244637]",
  };
  return styles[value] || "bg-[#e8eee9] text-[#687468]";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    const token = getAdminToken();
    if (!token) {
      setError(
        "No admin login token was found. Sign in using an ADMIN or SUPER_ADMIN account before viewing audit logs."
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/audit-logs`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const payload = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          payload?.message || `The audit logs API returned status ${response.status}.`
        );
      }

      const data = payload?.data?.logs ?? payload?.logs ?? [];
      setLogs(Array.isArray(data) ? data : []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Loading audit logs failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Could not load audit logs. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return logs;
    return logs.filter(
      (log) =>
        [log.action, log.entityType, log.entityId, log.actor?.name, log.actor?.email]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [logs, search]);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      <header className="border-b border-[#dce2d8] bg-[#244637] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4d3bf]">
              Community Reporting System
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">Audit Logs</h1>
            <p className="mt-2 text-sm text-[#c4d3bf]">
              Immutable record of system actions performed by administrators and
              platform users.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh Logs"}
            </button>

            <Link
              href="/"
              className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-2.5 text-sm font-semibold text-[#187a58] transition hover:bg-[#f5f8f5]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-4 max-w-7xl text-xs text-[#c4d3bf]">
        {lastUpdated
          ? `Last updated at ${lastUpdated}`
          : "Waiting for backend data"}
      </div>

      <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-5 text-sm text-[#8b392f]"
          >
            <p className="font-bold">Could not load audit logs</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2">
              Check the backend terminal, then select Refresh Logs.
            </p>
          </div>
        )}

        <div className="mb-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-[#cbd6c8] bg-[#fdfdf9] px-4 py-3 text-sm outline-none focus:border-[#55745c] focus:ring-2 focus:ring-[#eff1e9]"
            placeholder="Search by action, entity type, entity ID, or actor…"
            aria-label="Search audit logs"
          />
        </div>

        <div className="rounded-xl border border-[#dce2d8] bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#eff1e9] text-[#687468]">
                <tr>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Entity Type</th>
                  <th className="px-4 py-3 font-medium">Entity ID</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Previous Value</th>
                  <th className="px-4 py-3 font-medium">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e9e1]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-[#687468]"
                    >
                      Loading audit logs from the backend…
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center"
                    >
                      <p className="font-semibold text-[#687468]">
                        {logs.length === 0
                          ? "No audit logs found."
                          : "No logs match your search."}
                      </p>
                      <p className="mt-2 text-sm text-[#687468]">
                        {logs.length === 0
                          ? "Audit actions performed through the backend will appear here."
                          : "Try a different search term."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-[#edf0e9] last:border-0 hover:bg-[#f5f8f5] transition"
                    >
                      <td className="px-4 py-3 text-[#687468]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${actionStyle(
                            log.action
                          )}`}
                        >
                          {String(log.action || "Unknown").replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#687468]">
                        {String(log.entityType || "Unknown").replaceAll(
                          "_",
                          " "
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[#243329] truncate">
                        {log.entityId || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {log.actor?.name || "Unknown actor"}
                          </p>
                          <p className="text-xs text-[#7a8378] truncate">
                            {log.actor?.email || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <pre
                          className="text-xs text-[#687468] break-words max-w-[200px]"
                        >
                          {log.previousValue
                            ? JSON.stringify(log.previousValue, null, 2)
                            : "—"}
                        </pre>
                      </td>
                      <td className="px-4 py-3">
                        <pre
                          className="text-xs text-[#687468] break-words max-w-[200px]"
                        >
                          {log.newValue ? JSON.stringify(log.newValue, null, 2) : "—"}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#dce2d8] bg-[#fdfdf9] px-4 py-3">
            <p className="text-sm text-[#687468]">
              Showing {filteredLogs.length} of {logs.length} audit log entries.
            </p>
          </div>
        </div>

        <p className="text-xs text-[#687468]">
          Audit logs capture who performed what action, on which entity, and
          when. Previous and new values are recorded where available. Logs are
          append-only and cannot be modified through the UI.
        </p>
      </main>
    </div>
  );
}
