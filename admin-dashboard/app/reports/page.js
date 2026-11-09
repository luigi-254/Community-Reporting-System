"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { AdminShell, ReportDetailsDialog } from "../components/AdminShell";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Reports" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ESCALATED", label: "Escalated" },
];

function getAccessToken() {
  if (typeof window === "undefined") return null;

  const tokenKeys = [
    "crs_admin_access_token",
    "crs_access_token",
    "accessToken",
    "access_token",
    "authToken",
    "token",
  ];

  for (const key of tokenKeys) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }

  return null;
}

function getText(value, fallback = "Not provided") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function getCategory(category) {
  if (typeof category === "string") return category;
  return category?.name || category?.title || "Uncategorized";
}

function getLocation(report) {
  if (typeof report.location === "string" && report.location.trim()) {
    return report.location;
  }

  const parts = [
    report.location?.name,
    report.ward,
    report.subCounty,
    report.county,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Location not provided";
}

function getStatus(status) {
  const value = String(status || "SUBMITTED").toUpperCase();

  const aliases = {
    PENDING: "SUBMITTED",
    "UNDER REVIEW": "UNDER_REVIEW",
    "IN PROGRESS": "IN_PROGRESS",
  };

  return aliases[value] || value;
}

function statusLabel(status) {
  const normalized = getStatus(status);
  const option = STATUS_OPTIONS.find((item) => item.value === normalized);

  if (option) return option.label;

  return normalized
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getStatusStyle(status) {
  switch (getStatus(status)) {
    case "SUBMITTED":
      return "bg-[#e6ece3] text-[#31543a]";
    case "UNDER_REVIEW":
      return "bg-[#e4e8dd] text-[#344338]";
    case "IN_PROGRESS":
      return "bg-[#dce8d8] text-[#244637]";
    case "RESOLVED":
      return "bg-[#dce8d8] text-[#244637]";
    case "REJECTED":
      return "bg-[#f2e2dc] text-[#7d4435]";
    case "ESCALATED":
      return "bg-[#f0ebd9] text-[#66572f]";
    default:
      return "bg-[#e8eee9] text-[#687468]";
  }
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeReport(report) {
  const reporter = report.reporter || report.user || {};

  return {
    id: String(
      report.reportNumber || report.referenceNumber || report.id || "Unknown"
    ),
    originalId: report.id,
    issue: getText(report.title || report.issue, "Untitled report"),
    category: getCategory(report.category || report.subCategory),
    location: getLocation(report),
    status: getStatus(report.status),
    date: formatDate(report.createdAt || report.created_at || report.date),
    reportedBy: getText(
      report.reportedBy ||
        report.reporterName ||
        reporter.name ||
        reporter.fullName ||
        reporter.email,
      report.isAnonymous ? "Anonymous resident" : "Citizen"
    ),
    description: getText(report.description, "No description provided"),
    mediaUrls: Array.isArray(report.mediaUrls)
      ? report.mediaUrls
      : Array.isArray(report.media)
        ? report.media
        : Array.isArray(report.attachments)
          ? report.attachments
          : [],
  };
}

function getMediaUrl(media) {
  const value =
    typeof media === "string"
      ? media
      : media?.url || media?.path || media?.mediaUrl || "";

  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  return `${API_BASE_URL}/${value.replace(/^\/+/, "")}`;
}

function exportToCSV(reports) {
  const headers = [
    "Report ID",
    "Issue",
    "Category",
    "Location",
    "Status",
    "Date",
    "Reported By",
    "Description",
  ];

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = reports.map((report) => [
    report.id,
    report.issue,
    report.category,
    report.location,
    statusLabel(report.status),
    report.date,
    report.reportedBy,
    report.description,
  ].map(escapeCSV).join(","));

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows,
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "community-reports.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAccessToken();

      const headers = {
        Accept: "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: "GET",
        headers,
        credentials: "include",
        cache: "no-store",
      });

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response. Check that the API is running."
        );
      }

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const redirectTo = window.location.pathname;
          router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
          return;
        }

        throw new Error(
          result?.message ||
            `Unable to load reports. Server returned ${response.status}.`
        );
      }

      const reportData =
        result?.data?.reports ??
        result?.data?.items ??
        result?.reports ??
        result?.data;

      if (!Array.isArray(reportData)) {
        throw new Error(
          "The API responded, but its report data format was not recognized."
        );
      }

      setReports(reportData.map(normalizeReport));
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Loading reports failed:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Ensure it is running on port 5000 and that CORS allows this dashboard."
          : err.message || "An unexpected error occurred while loading reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredReports = reports.filter((report) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch = [
      report.id,
      report.issue,
      report.category,
      report.location,
      report.reportedBy,
      report.description,
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(searchText)
    );

    const matchesStatus =
      statusFilter === "ALL" || report.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = [
    {
      label: "Total Reports",
      value: reports.length,
      style: "border-l-4 border-[#173c32]",
    },
    {
      label: "Awaiting Review",
      value: reports.filter(
        (report) =>
          report.status === "SUBMITTED" ||
          report.status === "UNDER_REVIEW"
      ).length,
      style: "border-l-4 border-[#66572f]",
    },
    {
      label: "In Progress",
      value: reports.filter(
        (report) => report.status === "IN_PROGRESS"
      ).length,
      style: "border-l-4 border-[#244637]",
    },
    {
      label: "Resolved",
      value: reports.filter(
        (report) => report.status === "RESOLVED"
      ).length,
      style: "border-l-4 border-[#244637]",
    },
  ];

  return (
    <AdminShell pageTitle="Community Reports">
      <div className="mx-auto max-w-7xl p-5 md:p-8">
        <header className="mb-6 border-b border-[#dce2d8] pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c4d3bf]">
                Mtaa Fix
              </p>

              <h1 className="mt-2 text-2xl font-bold md:text-3xl">
                Community Reports
              </h1>

              <p className="mt-2 text-sm text-[#c4d3bf]">
                View citizen submissions received by the backend.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadReports}
                disabled={loading}
                className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh Reports"}
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

        <main className="space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-5 text-sm text-[#8b392f]"
            >
              <h2 className="font-bold">Could not load live reports</h2>
              <p className="mt-2">{error}</p>
              <p className="mt-2">
                Check the backend terminal for errors, then select Refresh
                Reports to try again.
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm ${stat.style}`}
              >
                <p className="text-sm text-[#687468]">{stat.label}</p>
                <p className="mt-3 text-3xl font-bold text-[#173c32]">
                  {loading ? "—" : stat.value}
                </p>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="flex-1">
                <label
                  htmlFor="report-search"
                  className="mb-2 block text-sm font-semibold text-[#687468]"
                >
                  Search Reports
                </label>

                <input
                  id="report-search"
                  type="search"
                  placeholder="Search ID, issue, category, citizen or location..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/10"
                />
              </div>

              <div className="w-full md:w-60">
                <label
                  htmlFor="status-filter"
                  className="mb-2 block text-sm font-semibold text-[#687468]"
                >
                  Filter by Status
                </label>

                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-2 focus:ring-[#187a58]/10"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => exportToCSV(filteredReports)}
                disabled={filteredReports.length === 0}
                className="rounded-lg bg-[#187a58] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-1 border-t border-[#dce2d8] pt-4 text-sm text-[#687468] sm:flex-row sm:justify-between">
              <p>
                Showing{" "}
                <span className="font-semibold text-[#243329]">
                  {filteredReports.length}
                </span>{" "}
                of {reports.length} reports
              </p>

              <p>
                {lastUpdated
                  ? `Last updated at ${lastUpdated}`
                  : "Waiting for backend data"}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#dce2d8] bg-white shadow-sm">
            <div className="border-b border-[#dce2d8] px-5 py-5 md:px-6">
              <h2 className="text-lg font-bold text-[#173d2d]">
                Report Register
              </h2>
              <p className="mt-1 text-sm text-[#687468]">
                Reports returned by the Mtaa Fix API.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#f5f4ec] text-[#687468]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Report ID
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Issue
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Category
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Location
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Date
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-[#687468]"
                      >
                        Loading reports from the backend...
                      </td>
                    </tr>
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center"
                      >
                        <p className="font-semibold text-[#687468]">
                          {error
                            ? "Reports could not be loaded."
                            : reports.length === 0
                              ? "No reports have been returned by the API."
                              : "No reports match your search."}
                        </p>
                        <p className="mt-2 text-sm text-[#687468]">
                          {error
                            ? "Resolve the connection or authorization error and refresh."
                            : reports.length === 0
                              ? "Submit a test citizen report, then refresh this page."
                              : "Try another search term or status filter."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map((report, index) => (
                      <tr
                        key={`${report.originalId || report.id}-${index}`}
                        className="border-t border-[#dce2d8] transition hover:bg-[#f5f8f5]"
                      >
                        <td className="px-5 py-4 font-semibold text-[#173c32]">
                          <span title={report.id}>
                            {report.id.length > 16
                              ? `${report.id.slice(0, 8)}...`
                              : report.id}
                          </span>
                        </td>

                        <td className="max-w-xs px-5 py-4 font-medium text-[#243329]">
                          {report.issue}
                        </td>

                        <td className="px-5 py-4 text-[#687468]">
                          {report.category}
                        </td>

                        <td className="max-w-xs px-5 py-4 text-[#687468]">
                          {report.location}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(report.status)}`}
                          >
                            {statusLabel(report.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-[#687468]">
                          {report.date}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="rounded-lg border border-[#cbd6c8] px-3 py-2 text-xs font-semibold text-[#173c32] transition hover:bg-[#e6f3eb]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
      {selectedReport && (
        <ReportDetailsDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AdminShell>
  );
}
