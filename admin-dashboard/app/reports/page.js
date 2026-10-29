
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
      return "bg-amber-100 text-amber-800";
    case "UNDER_REVIEW":
      return "bg-sky-100 text-sky-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-800";
    case "REJECTED":
      return "bg-rose-100 text-rose-800";
    case "ESCALATED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-700";
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

  const rows = reports.map((report) =>
    [
      report.id,
      report.issue,
      report.category,
      report.location,
      statusLabel(report.status),
      report.date,
      report.reportedBy,
      report.description,
    ]
      .map(escapeCSV)
      .join(",")
  );

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
          throw new Error(
            "The backend requires an authorized account. Sign in with an administrator account and ensure its access token is available to this dashboard."
          );
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
      style: "border-l-4 border-emerald-700",
    },
    {
      label: "Awaiting Review",
      value: reports.filter(
        (report) =>
          report.status === "SUBMITTED" ||
          report.status === "UNDER_REVIEW"
      ).length,
      style: "border-l-4 border-amber-500",
    },
    {
      label: "In Progress",
      value: reports.filter(
        (report) => report.status === "IN_PROGRESS"
      ).length,
      style: "border-l-4 border-blue-500",
    },
    {
      label: "Resolved",
      value: reports.filter(
        (report) => report.status === "RESOLVED"
      ).length,
      style: "border-l-4 border-green-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f7f6ef] text-gray-900">
      <header className="border-b border-white/10 bg-[#173d2d] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Community Reporting System
            </p>

            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Community Reports
            </h1>

            <p className="mt-2 text-sm text-emerald-100">
              View citizen submissions received by the backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadReports}
              disabled={loading}
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Reports"}
            </button>

            <Link
              href="/"
              className="rounded-lg bg-[#f4f0dc] px-4 py-2.5 text-sm font-semibold text-[#173d2d] transition hover:bg-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
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
              className={`rounded-xl border border-[#e4e1d5] bg-white p-5 shadow-sm ${stat.style}`}
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-bold text-[#173d2d]">
                {loading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-[#e4e1d5] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="report-search"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Search Reports
              </label>

              <input
                id="report-search"
                type="search"
                placeholder="Search ID, issue, category, citizen or location..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#35654b] focus:ring-2 focus:ring-[#35654b]/20"
              />
            </div>

            <div className="w-full md:w-60">
              <label
                htmlFor="status-filter"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Filter by Status
              </label>

              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#35654b] focus:ring-2 focus:ring-[#35654b]/20"
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
              className="rounded-lg bg-[#24543b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173d2d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-1 border-t border-gray-100 pt-4 text-sm text-gray-500 sm:flex-row sm:justify-between">
            <p>
              Showing{" "}
              <span className="font-semibold text-gray-800">
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

        <section className="overflow-hidden rounded-xl border border-[#e4e1d5] bg-white shadow-sm">
          <div className="border-b border-[#e4e1d5] px-5 py-5 md:px-6">
            <h2 className="text-lg font-bold text-[#173d2d]">
              Report Register
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Reports returned by the Community Reporting System API.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#f5f4ec] text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Report ID</th>
                  <th className="px-5 py-4 font-semibold">Issue</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-gray-500"
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
                      <p className="font-semibold text-gray-700">
                        {error
                          ? "Reports could not be loaded."
                          : reports.length === 0
                            ? "No reports have been returned by the API."
                            : "No reports match your search."}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
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
                      className="border-t border-gray-100 transition hover:bg-[#fafaf5]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#24543b]">
                        <span title={report.id}>
                          {report.id.length > 16
                            ? `${report.id.slice(0, 8)}...`
                            : report.id}
                        </span>
                      </td>

                      <td className="max-w-xs px-5 py-4 font-medium text-gray-900">
                        {report.issue}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {report.category}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-gray-600">
                        {report.location}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(report.status)}`}
                        >
                          {statusLabel(report.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {report.date}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="rounded-lg border border-[#b7c8bc] px-3 py-2 text-xs font-semibold text-[#24543b] transition hover:bg-[#edf4ee]"
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

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setSelectedReport(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-detail-title"
            className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 bg-[#173d2d] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                  Report Details
                </p>
                <h2
                  id="report-detail-title"
                  className="mt-1 text-xl font-bold"
                >
                  {selectedReport.issue}
                </h2>
                <p className="mt-1 break-all text-sm text-emerald-100">
                  Reference: {selectedReport.id}
                </p>
              </div>

              <button
                onClick={() => setSelectedReport(null)}
                aria-label="Close report details"
                className="rounded-lg px-3 py-1 text-2xl text-white/80 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="mt-1 font-semibold">
                    {selectedReport.category}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="mt-1 font-semibold">
                    {selectedReport.location}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Reported By</p>
                  <p className="mt-1 font-semibold">
                    {selectedReport.reportedBy}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Date Submitted</p>
                  <p className="mt-1 font-semibold">
                    {selectedReport.date}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Current Status</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(selectedReport.status)}`}
                >
                  {statusLabel(selectedReport.status)}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-gray-700">
                  {selectedReport.description}
                </p>
              </div>

              {selectedReport.mediaUrls.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-[#173d2d]">
                    Attachments
                  </h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {selectedReport.mediaUrls.map((media, index) => {
                      const url = getMediaUrl(media);
                      const isImage =
                        /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

                      return (
                        <div
                          key={`${url}-${index}`}
                          className="overflow-hidden rounded-xl border border-gray-200"
                        >
                          {isImage ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <Image
                                src={url}
                                alt={`Attachment ${index + 1}`}
                                width={800}
                                height={416}
                                unoptimized
                                className="h-52 w-full object-cover"
                              />
                            </a>
                          ) : (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="block p-4 font-medium text-[#24543b] underline"
                            >
                              Open attachment {index + 1}
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t border-gray-100 pt-4">
                <button
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg bg-[#24543b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173d2d]"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
