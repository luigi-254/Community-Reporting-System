"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { AdminShell, ReportDetailsDialog } from "./components/AdminShell";

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

function normalizeStatus(status) {
  const value = String(status || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  const aliases = {
    PENDING: "SUBMITTED",
    "IN PROGRESS": "IN_PROGRESS",
    "UNDER REVIEW": "UNDER_REVIEW",
  };

  return aliases[value] || value;
}

function statusLabel(status) {
  const labels = {
    SUBMITTED: "Pending",
    UNDER_REVIEW: "Under Review",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REJECTED: "Rejected",
    ESCALATED: "Escalated",
  };

  const normalized = normalizeStatus(status);

  return (
    labels[normalized] ||
    normalized.toLowerCase().replaceAll("_", " ")
  );
}

function statusStyle(status) {
  switch (normalizeStatus(status)) {
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

function normalizeReport(report, index) {
  const reporter = report.reporter || report.user || {};

  let location = report.location;

  if (typeof location !== "string") {
    location = [
      location?.name,
      report.ward,
      report.subCounty,
      report.county,
    ]
      .filter(Boolean)
      .join(", ");
  }

  const category =
    typeof report.category === "object"
      ? report.category?.name || report.category?.title
      : report.category;

  const dateValue =
    report.createdAt ||
    report.created_at ||
    report.date ||
    null;

  return {
    id: String(
      report.reportNumber ||
        report.referenceNumber ||
        report.id ||
        `report-${index + 1}`
    ),
    issue: report.title || report.issue || "Untitled report",
    category: category || report.subCategory || "Uncategorized",
    location: location || "Location not provided",
    status: normalizeStatus(report.status),
    date: formatDate(dateValue),
    createdAt: dateValue,
    reportedBy:
      report.reportedBy ||
      report.reporterName ||
      reporter.name ||
      reporter.email ||
      (report.isAnonymous ? "Anonymous resident" : "Citizen"),
    description: report.description || "",
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const { logout, user, loading: authLoading } = useAuth();

  const [selectedReportId, setSelectedReportId] = useState(null);
  const [reports, setReports] = useState([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const initials = String(user?.name || "C")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const adminScope = useMemo(() => {
    if (!user) return { label: "Unauthenticated", level: "none" };
    if (user.role === "SUPER_ADMIN")
      return { label: "Platform-wide", level: "platform" };
    if (user.role === "ADMIN")
      return { label: "County platform administration", level: "county" };
    return { label: "Administrative scope", level: "none" };
  }, [user]);

  const adminWelcome = useMemo(() => {
    if (!user) return { title: "Admin Portal", subtitle: "" };
    if (user.role === "SUPER_ADMIN") {
      return {
        title: "Super Administration",
        subtitle: "Full platform oversight, system administration, and global configuration.",
      };
    }
    if (user.role === "ADMIN") {
      return {
        title: "County Platform Administration",
        subtitle: "Departmental configuration, user management, and platform activity monitoring.",
      };
    }
    return { title: "Admin Portal", subtitle: "" };
  }, [user]);

  // Strict auth redirect: redirect unauthenticated users to /login
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectTo = window.location.pathname;
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [authLoading, user, router]);

  // System health state.
  const [systemHealth, setSystemHealth] = useState(null);
  const [systemHealthLoading, setSystemHealthLoading] = useState(false);

  useEffect(() => {
    if (!systemHealthLoading && !user) {
      const redirectTo = window.location.pathname;
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [systemHealthLoading, user, router]);

  const checkSystemHealth = useCallback(async () => {
    setSystemHealthLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (response.ok) {
        setSystemHealth({ status: "healthy", message: "Backend is reachable" });
      } else {
        setSystemHealth({
          status: "degraded",
          message: `Backend returned status ${response.status}`,
        });
      }
    } catch {
      setSystemHealth({
        status: "unhealthy",
        message: "Cannot connect to the backend",
      });
    } finally {
      setSystemHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSystemHealth();
  }, [checkSystemHealth]);

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports?page=1&limit=100`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            ...(getAdminToken() ? { Authorization: `Bearer ${getAdminToken()}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `The reports API returned status ${response.status}.`
        );
      }

      const apiReports =
        result?.data?.reports ??
        result?.reports;

      if (!Array.isArray(apiReports)) {
        throw new Error(
          "The API response did not contain a valid reports list."
        );
      }

      setReports(apiReports.map(normalizeReport));

      const apiTotal = Number(
        result?.data?.total ?? result?.total ?? apiReports.length
      );

      setTotalFromApi(
        Number.isFinite(apiTotal) ? apiTotal : apiReports.length
      );

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Admin dashboard report loading failed:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check that it is running on port 5000 and allows this dashboard through CORS."
          : err.message || "Failed to load reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const reportStats = useMemo(() => {
    const pending = reports.filter(
      (report) =>
        report.status === "SUBMITTED" ||
        report.status === "UNDER_REVIEW"
    ).length;

    const inProgress = reports.filter(
      (report) => report.status === "IN_PROGRESS"
    ).length;

    const resolved = reports.filter(
      (report) => report.status === "RESOLVED"
    ).length;

    const categoryCounts = reports.reduce((counts, report) => {
      const category = report.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});

    const recentReports = [...reports].sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA;
    });

    const resolutionRate =
      reports.length === 0
        ? 0
        : Math.round((resolved / reports.length) * 100);

    return {
      pending,
      inProgress,
      resolved,
      categoryCounts,
      recentReports: recentReports.slice(0, 5),
      resolutionRate,
    };
  }, [reports]);

  const selectedReport = reports.find((report) => report.id === selectedReportId);

  const statCards = [
    {
      title: "Total Reports",
      value: totalFromApi,
      subtitle: "Reports returned by the backend",
      color: "text-[#173c32]",
    },
    {
      title: "Pending",
      value: reportStats.pending,
      subtitle: "Awaiting review or action",
      color: "text-[#66572f]",
    },
    {
      title: "In Progress",
      value: reportStats.inProgress,
      subtitle: "Currently being handled",
      color: "text-[#244637]",
    },
    {
      title: "Resolved",
      value: reportStats.resolved,
      subtitle: "Marked as resolved",
      color: "text-[#244637]",
    },
  ];

  return (
    <AdminShell user={user} pageTitle={adminWelcome.title}>
      {authLoading || !user ? null : (
        <div className="space-y-8 p-5 md:p-8">
          {systemHealthLoading ? (
            <div className="p-5 md:p-8">
              <div className="flex items-center gap-3 text-sm text-[#687468]">
                Checking system health…
              </div>
            </div>
          ) : systemHealth ? (
            <div className="p-5 md:p-8">
              <div
                className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  systemHealth.status === "healthy"
                    ? "border-[#cfe2d5] bg-[#f1f8f3] text-[#31584b]"
                    : systemHealth.status === "degraded"
                      ? "border-[#f1c9c2] bg-[#fff3f0] text-[#8b392f]"
                      : "border-[#f1c9c2] bg-[#fff3f0] text-[#8b392f]"
                }`}
              >
                <span
                  className={`flex h-2.5 w-2.5 rounded-full ${
                    systemHealth.status === "healthy"
                      ? "bg-[#187a58]"
                      : "bg-[#8b392f]"
                  }`}
                  aria-hidden="true"
                />
                <span className="font-medium">
                  System: {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                </span>
                <span className="font-normal">{systemHealth.message}</span>
              </div>
            </div>
          ) : null}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-5 text-sm text-[#8b392f]"
            >
              <p className="font-bold">
                Could not load live reports
              </p>
              <p className="mt-2">{error}</p>
              <p className="mt-2">
                Check the backend terminal, then select Refresh Data.
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm"
              >
                <p className="text-sm text-[#687468]">
                  {card.title}
                </p>

                <p
                  className={`mt-3 text-3xl font-bold ${card.color}`}
                >
                  {loading ? "—" : card.value}
                </p>

                <p className="mt-2 text-xs text-[#687468]">
                  {card.subtitle}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#173c32]">
                  Resolution Progress
                </h3>

                <span className="text-2xl font-bold text-[#244637]">
                  {loading ? "—" : `${reportStats.resolutionRate}%`}
                </span>
              </div>

              <p className="mt-2 text-sm text-[#687468]">
                Percentage of reports in the records loaded that are resolved.
              </p>

              <div
                className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[#eff1e9]"
                role="progressbar"
                aria-label="Report resolution rate"
                aria-valuenow={loading ? undefined : reportStats.resolutionRate}
                aria-valuetext={
                  loading
                    ? "Loading resolution rate"
                    : `${reportStats.resolutionRate}% resolved`
                }
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-[#244637] transition-all"
                  style={{
                    width: `${reportStats.resolutionRate}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-[#687468]">
                {loading
                  ? "Loading resolution details..."
                  : `${reportStats.resolved} of ${reports.length} loaded reports resolved`}
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#173c32]">
                Reports by Category
              </h3>

              <p className="mt-2 text-sm text-[#687468]">
                Breakdown of issues returned by the API.
              </p>

              <div className="mt-5 space-y-4">
                {Object.entries(reportStats.categoryCounts).map(
                  ([category, count]) => (
                    <div key={category}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="text-[#687468]">
                          {category}
                        </span>
                        <span className="font-semibold">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#eff1e9]">
                        <div
                          className="h-full rounded-full bg-[#244637]"
                          style={{
                            width: `${reports.length ? (count / reports.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}

                {!loading &&
                  Object.keys(reportStats.categoryCounts).length === 0 && (
                    <p className="text-sm text-[#687468]">
                      No reports available yet.
                    </p>
                  )}

                {loading && (
                  <p className="text-sm text-[#687468]">
                    Loading categories...
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e4e1d5] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-[#e4e1d5] px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-bold text-[#173c32]">
                  Recent Reports
                </h3>
                <p className="mt-1 text-sm text-[#687468]">
                  Latest issues received from the backend.
                </p>
              </div>

              <button
                onClick={() => router.push("/reports")}
                className="rounded-lg bg-[#187a58] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#126448]"
              >
                View All Reports
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-[#eff1e9] text-[#687468]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Report ID
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Issue
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Location
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-[#687468]"
                      >
                        Loading reports from the backend...
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center"
                      >
                        <p className="font-semibold text-[#687468]">
                          {error
                            ? "Reports could not be loaded."
                            : "No reports found."}
                        </p>
                        <p className="mt-2 text-sm text-[#687468]">
                          {error
                            ? "Resolve the connection error and refresh."
                            : "Submit a citizen report, then click Refresh Data."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    reportStats.recentReports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-t border-[#dce2d8] transition hover:bg-[#f5f8f5]"
                      >
                        <td
                          className="px-6 py-4 font-semibold text-[#173c32]"
                          title={report.id}
                        >
                          {report.id.length > 15
                            ? `${report.id.slice(0, 8)}...`
                            : report.id}
                        </td>

                        <td className="px-6 py-4 font-medium">
                          {report.issue}
                        </td>

                        <td className="px-6 py-4 text-[#687468]">
                          {report.location}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(report.status)}`}
                          >
                            {statusLabel(report.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-[#687468]">
                          {report.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
      {selectedReport && (
        <ReportDetailsDialog
          report={selectedReport}
          onClose={() => setSelectedReportId(null)}
        />
      )}
    </AdminShell>
  );
}
