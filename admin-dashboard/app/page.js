"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../lib/auth-context";
import { PanelLeftClose, PanelLeftOpen, Menu, LogOut, LayoutDashboard, FileText, Users, BarChart3, Settings } from "lucide-react";
import BrandLogo from "./components/BrandLogo";
import AdminProfilePill from "./components/AdminProfilePill";

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

  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const initials = String(user?.name || "C")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainContentMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

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

  const handleNavigation = (page) => {
    setActivePage(page);

    const routes = {
      Reports: "/reports",
      Users: "/users",
      Statistics: "/statistics",
      "Audit Logs": "/audit-logs",
      Settings: "/settings",
    };

    if (routes[page]) {
      router.push(routes[page]);
    }
  };

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
    <div className="flex min-h-screen bg-[#f7f7f2] text-[#243329]">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[#244637] text-[#f7f7f2] transition-all duration-300 overflow-hidden ${sidebarWidth} lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`border-b border-white/15 px-5 py-4 flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-3`}>
          <BrandLogo className="h-8 w-8 flex-shrink-0" />
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Mtaa Fix</p>
              <p className="mt-0.5 text-[10px] text-[#d1d5db] leading-none">
                Admin Portal
              </p>
            </div>
          )}
        </div>

        <div className={`px-5 pt-8 ${!sidebarCollapsed ? "" : "pt-3"}`}>
          {!sidebarCollapsed && (
            <p className="mb-6 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bdcdbd]">
              Main menu
            </p>
          )}
          <nav aria-label="Admin navigation" className="space-y-0.5">
            {[
              { name: "Dashboard", icon: LayoutDashboard },
              { name: "Reports", icon: FileText },
              { name: "Users", icon: Users },
              { name: "Statistics", icon: BarChart3 },
              { name: "Audit Logs", icon: FileText },
              { name: "Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleNavigation(item.name)}
                  aria-current={activePage === item.name ? "page" : undefined}
                  className={`flex items-center gap-3 w-full ${sidebarCollapsed ? "px-3 justify-center" : "px-5 justify-start"} py-3 text-sm transition-colors rounded-lg ${activePage === item.name ? "bg-white/10 text-white" : "text-[#d5dfd2] hover:bg-white/5 hover:text-white"}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${activePage === item.name ? "text-white" : "text-[#c4d3bf]"}`} />
                  {!sidebarCollapsed && (
                    <span className={`truncate ${activePage === item.name ? "text-white" : "text-[#d5dfd2]"}`}>
                      {item.name}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/15 p-4 pb-6">
          <div className={`flex flex-col items-center gap-2 px-3 py-3 ${!sidebarCollapsed ? "flex-row justify-between items-center gap-3 px-3 py-2" : ""}`}>
            <div className="flex size-8 items-center justify-center rounded-full bg-[#dce5d8] text-[#244637] text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-tight text-white">
                  {user?.name || user?.email}
                </p>
                <p className="mt-0.5 text-[10px] text-[#d1d5db] leading-none truncate">
                  {user?.email}
                </p>
                <p className="mt-0.5 text-[9px] text-[#bdcdbd] leading-none truncate uppercase">
                  {String(user?.role || "").replace(/_/g, " ")}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div
        id="main-content"
        className={`min-h-screen min-w-0 w-full transition-all duration-300 ${mainContentMargin}`}
      >
        <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-[#dce2d8] bg-[#fdfdf9] px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="p-1.5 rounded-lg border border-[#dce2d8] text-[#687468] hover:bg-[#f5f8f5] hover:text-[#244637] transition-colors hidden lg:flex"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 rounded-lg border border-[#dce2d8] text-[#687468] hover:bg-[#f5f8f5] hover:text-[#244637] transition-colors lg:hidden"
            >
              <Menu className="w-4 h-4" aria-hidden="true" />
            </button>
            <div className="h-4 w-px bg-[#dce2d8] mx-2" />
            <div>
              <p className="text-xs font-medium text-[#788277] leading-none">
                Admin workspace
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[#173c32] leading-none">
                {activePage}
              </h1>
              {adminWelcome.subtitle && (
                <p className="mt-0.5 text-xs text-[#687468] leading-none">
                  {adminWelcome.subtitle}
                </p>
              )}
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-medium ${adminScope.level === "platform" ? "border-[#187a58] text-[#187a58] bg-[#e6f3eb]" : "border-[#55745c] text-[#55745c] bg-[#e8eee3]"}`}>
              {adminScope.label}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setLoading(true);
                setError("");
                loadReports();
              }}
              disabled={loading}
              className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f5f8f5] disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh Data"}
            </button>
            <Link
              href="/users"
              onClick={() => setActivePage("Users")}
              className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f5f8f5] text-[#244637]"
            >
              Manage Officers
            </Link>
            <AdminProfilePill user={user} onProfileClick={() => setActivePage("Dashboard")} />
          </div>
        </header>

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

        <div className="space-y-8 p-5 md:p-8">
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
                            width: `${
                              reports.length
                                ? (count / reports.length) * 100
                                : 0
                            }%`,
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
                onClick={() => handleNavigation("Reports")}
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
      </div>
    </div>
  );
}