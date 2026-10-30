"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GovernmentMapLoader from "../../components/GovernmentMapLoader";
import BrandLogo from "../../components/BrandLogo";
import { X } from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type ApiRole =
  | "GOVERNOR"
  | "CECM"
  | "CHIEF_OFFICER"
  | "TECHNICAL_HEAD"
  | "TECHNICAL_SUPERVISOR"
  | "FIELD_OFFICER"
  | "WARD_ADMIN"
  | "SUBCOUNTY_ADMIN"
  | "DISASTER_MANAGER"
  | "ENFORCEMENT_OFFICER"
  | "OFFICER"
  | "ADMIN"
  | "SUPER_ADMIN";

type ReportStatus =
  | "Pending"
  | "Under Review"
  | "In Progress"
  | "Resolved"
  | "Rejected"
  | "Escalated";

type Report = {
  id: string;
  title: string;
  category: string;
  location: string;
  department: string;
  date: string;
  createdAt: string;
  status: ReportStatus;
  description: string;
  latitude: number | null;
  longitude: number | null;
  mediaUrls: string[];
};

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
  departmentId?: string | null;
  wardId?: string | null;
  subCountyId?: string | null;
  countyId?: string | null;
};

type DashboardScope = {
  label: string;
  level: "county" | "department" | "ward" | "system" | "none";
};

const statusStyles: Record<ReportStatus, string> = {
  Pending: "bg-[#f0ebd9] text-[#66572f]",
  "Under Review": "bg-[#e4e8dd] text-[#344338]",
  "In Progress": "bg-[#dce8d8] text-[#244637]",
  Resolved: "bg-[#dce8d8] text-[#244637]",
  Rejected: "bg-[#f2e2dc] text-[#7d4435]",
  Escalated: "bg-[#f0ebd9] text-[#66572f]",
};

const statusToApi: Record<ReportStatus, string> = {
  Pending: "SUBMITTED",
  "Under Review": "UNDER_REVIEW",
  "In Progress": "IN_PROGRESS",
  Resolved: "RESOLVED",
  Rejected: "REJECTED",
  Escalated: "ESCALATED",
};

const DEPARTMENT_LABELS: Record<string, string> = {
  INFRA: "Infrastructure, Roads & Public Works",
  WATER: "Water, Environment, Natural Resources, Energy & Climate Change",
  DISASTER: "Disaster Management",
  ENFORCEMENT: "Enforcement",
  PUBLIC_SERVICE: "Public Service, County Administration",
  TRADE: "Trade, Tourism, Industry & Marketing",
  YOUTH: "Youth, Sports, Culture, Arts & Social Services",
};

function normalizeStatus(value: unknown): ReportStatus {
  const status = String(value || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  switch (status) {
    case "PENDING":
    case "SUBMITTED":
      return "Pending";
    case "UNDER_REVIEW":
      return "Under Review";
    case "IN_PROGRESS":
      return "In Progress";
    case "RESOLVED":
      return "Resolved";
    case "REJECTED":
      return "Rejected";
    case "ESCALATED":
      return "Escalated";
    default:
      return "Pending";
  }
}

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function displayValue(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    for (const key of ["name", "title", "label", "address"]) {
      const result = object[key];
      if (typeof result === "string" && result.trim()) return result.trim();
    }
  }
  return fallback;
}

function normalizeReport(raw: any, index: number): Report {
  const rawDate = raw.createdAt || raw.date || raw.updatedAt || "";
  const department =
    displayValue(raw.department, "") ||
    displayValue(raw.departmentName, "") ||
    (raw.departmentId ? DEPARTMENT_LABELS[String(raw.departmentId)] : "Unassigned");
  const media = Array.isArray(raw.mediaUrls)
    ? raw.mediaUrls
    : Array.isArray(raw.media)
      ? raw.media
      : typeof raw.mediaUrls === "string"
        ? [raw.mediaUrls]
        : [];
  const mediaUrls = media
    .map((item: unknown) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const object = item as Record<string, unknown>;
        return String(object.url || object.path || object.mediaUrl || "");
      }
      return "";
    })
    .filter(Boolean);

  return {
    id: String(raw.id ?? raw._id ?? raw.reportId ?? `report-${index}`),
    title: displayValue(raw.title, "Untitled report"),
    category: displayValue(raw.category, "Other"),
    location: displayValue(raw.location, "Location not specified"),
    department,
    date: rawDate ? String(rawDate).slice(0, 10) : "Unknown date",
    createdAt: rawDate ? String(rawDate) : "",
    status: normalizeStatus(raw.status),
    description: displayValue(raw.description, "No description provided."),
    latitude: parseCoordinate(raw.latitude ?? raw.lat),
    longitude: parseCoordinate(raw.longitude ?? raw.lng),
    mediaUrls,
  };
}

function extractReports(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data?.reports)) return payload.data.reports;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.reports)) return payload.reports;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function getGovernmentToken(): string {
  if (typeof window === "undefined") return "";
  return (
    localStorage.getItem("crs_government_access_token") ||
    localStorage.getItem("crs_admin_access_token") ||
    localStorage.getItem("crs_access_token") ||
    ""
  );
}

function resolvePhotoUrl(path: string): string {
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function formatDate(value: string): string {
  if (!value || value === "Unknown date") return value || "Unknown date";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function fetchJson(path: string): Promise<any> {
  const token = getGovernmentToken();
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

async function fetchDashboardUser(): Promise<DashboardUser | null> {
  try {
    const data = await fetchJson("/api/auth/me");
    const user = data?.data?.user || data?.user;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      departmentId: user.departmentId ?? null,
      wardId: user.wardId ?? null,
      subCountyId: user.subCountyId ?? null,
      countyId: user.countyId ?? null,
    };
  } catch {
    return null;
  }
}

function normalizeRole(role: unknown): ApiRole {
  const r = String(role || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  const valid: ApiRole[] = [
    "GOVERNOR",
    "CECM",
    "CHIEF_OFFICER",
    "TECHNICAL_HEAD",
    "TECHNICAL_SUPERVISOR",
    "FIELD_OFFICER",
    "WARD_ADMIN",
    "SUBCOUNTY_ADMIN",
    "DISASTER_MANAGER",
    "ENFORCEMENT_OFFICER",
    "OFFICER",
    "ADMIN",
    "SUPER_ADMIN",
  ];
  return valid.includes(r as ApiRole) ? (r as ApiRole) : "OFFICER";
}

const MENU_BY_ROLE: Record<ApiRole, string[]> = {
  GOVERNOR: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
  CECM: ["Dashboard", "Reports", "Departments", "Statistics"],
  CHIEF_OFFICER: ["Dashboard", "Reports", "Departments", "Statistics"],
  TECHNICAL_HEAD: ["Dashboard", "Reports", "Departments"],
  TECHNICAL_SUPERVISOR: ["Dashboard", "Reports"],
  FIELD_OFFICER: ["Dashboard", "Reports"],
  WARD_ADMIN: ["Dashboard", "Reports"],
  SUBCOUNTY_ADMIN: ["Dashboard", "Reports"],
  DISASTER_MANAGER: ["Dashboard", "Reports"],
  ENFORCEMENT_OFFICER: ["Dashboard", "Reports"],
  OFFICER: ["Dashboard", "Reports"],
  ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
  SUPER_ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
};

const DEFAULT_MENU = ["Dashboard", "Reports"];

export default function GovernmentDashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const scope = useMemo<DashboardScope>(() => {
    if (!user) return { label: "Unauthenticated", level: "none" };
    if (user.role === "GOVERNOR") return { label: "County-wide (Kisii)", level: "county" };
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN")
      return { label: "System-wide", level: "system" };
    if (
      user.role === "CECM" ||
      user.role === "CHIEF_OFFICER" ||
      user.role === "TECHNICAL_HEAD"
    )
      return { label: `Department: ${DEPARTMENT_LABELS[String(user.departmentId)] || user.departmentId || "unassigned"}`, level: "department" };
    return { label: `Ward: ${user.wardId || "unassigned"}`, level: "ward" };
  }, [user]);

  const menuItems = useMemo(() => MENU_BY_ROLE[user?.role ?? "OFFICER"] || DEFAULT_MENU, [user?.role]);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const currentUser = await fetchDashboardUser();
        if (!cancelled) setUser(currentUser);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReports = useCallback(async (showLoading = true) => {
    if (showLoading) setReportsLoading(true);
    setReportsError("");
    try {
      const response = await fetch(`${API_URL}/api/dashboard/reports?page=1&limit=100`, {
        cache: "no-store",
        headers: { ...(getGovernmentToken() ? { Authorization: `Bearer ${getGovernmentToken() }` } : {}) },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Could not load reports. HTTP ${response.status}.`);
      }
      const allReports = extractReports(payload);
      setReports(
        allReports
          .filter((report) => report !== null && typeof report === "object" && !Array.isArray(report))
          .map((report, index) => normalizeReport(report, index))
      );
    } catch (error) {
      setReportsError(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      if (showLoading) setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        !query ||
        [report.id, report.title, report.category, report.location].some((value) =>
          value.toLowerCase().includes(query)
        );
      return matchesSearch && (statusFilter === "All" || report.status === statusFilter);
    });
  }, [reports, searchTerm, statusFilter]);

  const canChangeStatus = useMemo(
    () =>
      ["OFFICER", "FIELD_OFFICER", "TECHNICAL_SUPERVISOR", "ADMIN", "SUPER_ADMIN"].includes(
        user?.role ?? ""
      ),
    [user?.role]
  );

  const stats = useMemo(() => {
    const total = reports.length;
    const open = reports.filter((r) => !["RESOLVED", "REJECTED"].includes(r.status)).length;
    const resolved = reports.filter((r) => r.status === "Resolved").length;
    const overdue = reports.filter((r) => {
      if (["RESOLVED", "REJECTED", "CLOSED", "CANCELLED"].includes(r.status)) return false;
      const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
      return ageDays > 7;
    }).length;
    return [
      { title: "Total Reports", value: total },
      { title: "Open", value: open },
      { title: "Overdue", value: overdue },
      { title: "Resolved", value: resolved },
    ];
  }, [reports]);

  const selectedReport = reports.find((report) => report.id === selectedReportId);

  async function updateReportStatus(reportId: string, status: ReportStatus) {
    if (!canChangeStatus) {
      setActionError("Your role does not have permission to change report status.");
      return;
    }
    setUpdatingReportId(reportId);
    setActionMessage("");
    setActionError("");
    try {
      const response = await fetch(`${API_URL}/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(getGovernmentToken() ? { Authorization: `Bearer ${getGovernmentToken() }` } : {}),
        },
        body: JSON.stringify({ status: statusToApi[status] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || `Could not update report status. HTTP ${response.status}.`);
      }
      setActionMessage("Report status updated successfully.");
      await loadReports(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update report status.");
    } finally {
      setUpdatingReportId(null);
    }
  }

  function exportReportsToCsv() {
    const headers = ["Report ID", "Title", "Category", "Location", "Department", "Date Reported", "Status", "Latitude", "Longitude"];
    const rows = filteredReports.map((r) => [r.id, r.title, r.category, r.location, r.department, r.date, r.status, r.latitude ?? "", r.longitude ?? ""]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["\uFEFF", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `community-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const reportDepartments = useMemo(() => {
    const fromReports = reports.map((r) => r.department).filter(Boolean);
    return Array.from(new Set(fromReports));
  }, [reports]);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329] md:flex">
      <aside className="w-full bg-[#244637] p-6 text-[#f7f7f2] md:min-h-screen md:w-64">
        <BrandLogo className="mb-4 h-10 w-10" />
        <h1 className="mb-2 text-2xl font-bold">Community Reports</h1>
        <p className="mb-8 text-sm text-[#c4d3bf]">Government Portal</p>
        <nav className="space-y-2" aria-label="Government dashboard navigation">
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActivePage(item)}
              aria-current={activePage === item ? "page" : undefined}
              className={`w-full rounded-lg px-4 py-3 text-left transition-colors ${
                activePage === item
                  ? "bg-[#187a58] text-white"
                  : "text-[#d5dfd2] hover:bg-white/5 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="mt-10 border-t border-white/15 pt-5">
          <p className="text-sm text-[#bdcdbd]">Jurisdiction</p>
          <p className="mt-1 font-medium">{scope.label}</p>
          {user && (
            <p className="mt-0.5 text-xs text-[#a3b8a8]">
              {user.role.replace(/_/g, " ")} · {user.email}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("crs_government_access_token");
              localStorage.removeItem("crs_government_user");
              window.location.href = "/login";
            }}
            className="mt-5 rounded-lg border border-[#cbd6c8] px-4 py-2 text-sm font-medium text-[#8b392f] hover:bg-[#fff3f0] transition"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#173c32]">Government Dashboard</h2>
            <p className="mt-2 text-sm text-[#687468]">
              Monitor community issues and service delivery in Kisii County.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {userLoading && <span className="text-xs text-[#687468]">Loading session…</span>}
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={reportsLoading}
              className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f5f8f5] disabled:opacity-60"
            >
              {reportsLoading ? "Refreshing…" : "Refresh Reports"}
            </button>
          </div>
        </header>

        {reportsError && (
          <div role="alert" className="mb-6 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm text-[#8b392f]">
            <p className="font-semibold">Could not load live reports</p>
            <p className="mt-1">{reportsError}</p>
            <button
              type="button"
              onClick={() => void loadReports()}
              className="mt-3 rounded-lg border border-[#cbd6c8] px-3 py-2 font-medium hover:bg-[#f5f8f5]"
            >
              Try Again
            </button>
          </div>
        )}
        {actionMessage && (
          <div role="status" className="mb-6 rounded-xl border border-[#cfe2d5] bg-[#f1f8f3] p-4 text-sm text-[#31584b]">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div role="alert" className="mb-6 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm text-[#8b392f]">
            {actionError}
          </div>
        )}

        {userLoading ? (
          <div className="mb-6 p-8 text-center text-sm text-[#687468]">
            Loading your government session…
          </div>
        ) : (
          <>

            {/* Role-specific overview */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[#173c32]">Overview</h3>
                <p className="mt-1 text-sm text-[#687468]">
                  {scope.level === "county"
                    ? "County-wide performance across all of Kisii County."
                    : scope.level === "department"
                      ? "Performance within your assigned department."
                      : scope.level === "ward"
                        ? "Performance within your assigned ward."
                        : scope.level === "system"
                          ? "System-wide platform oversight."
                          : "Your personal work queue."}
                </p>
              </div>
              <div className={`rounded-full border px-3 py-1 text-xs font-medium ${scope.level === "county" || scope.level === "system" ? "border-[#187a58] text-[#187a58] bg-[#e6f3eb]" : scope.level === "department" ? "border-[#55745c] text-[#55745c] bg-[#e8eee3]" : "border-[#687468] text-[#687468] bg-[#f0f2f1]"}`}>
                {scope.label}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.title} className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                  <p className="text-sm text-[#687468]">{stat.title}</p>
                  <p className="mt-4 text-3xl font-bold text-[#243329]">
                    {reportsLoading ? "—" : stat.value}
                  </p>
                </div>
              ))}
            </div>

            {activePage === "Dashboard" && (
              <section className="mt-8 rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#173c32]">Recent Reports</h3>
                    <p className="mt-1 text-sm text-[#687468]">
                      Reports within your jurisdiction.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivePage("Reports")}
                    className="rounded-lg bg-[#187a58] px-4 py-2 text-white transition hover:bg-[#126448]"
                  >
                    View All Reports
                  </button>
                </div>
                {reportsLoading ? (
                  <p className="py-6 text-sm text-[#687468]">Loading reports…</p>
                ) : reports.length === 0 ? (
                  <p className="py-6 text-sm text-[#687468]">
                    No reports found within your jurisdiction.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {reports.slice(0, 5).map((report) => (
                      <div
                        key={report.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce2d8] p-4"
                      >
                        <div>
                          <p className="font-medium text-[#173c32]">{report.title}</p>
                          <p className="mt-1 text-sm text-[#687468]">
                            {report.id} · {report.location}
                          </p>
                          <p className="mt-1 text-xs text-[#7a8378]">
                            {formatDate(report.date)}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}
                        >
                          {report.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setActivePage("GIS Map")}
                  className="mt-5 rounded-lg border border-[#187a58] px-4 py-2 text-[#187a58] transition hover:bg-[#e6f3eb]"
                >
                  Open GIS Map
                </button>
              </section>
            )}

            {activePage === "Reports" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-[#173c32]">Reports Management</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Reports below are retrieved from your backend, scoped to your jurisdiction.
                  </p>
                </div>
                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search title, ID, category or location…"
                    aria-label="Search reports"
                    className="rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10 md:col-span-2"
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter reports by status"
                    className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"
                  >
                    <option value="All">All statuses</option>
                    {["Pending", "Under Review", "In Progress", "Resolved", "Rejected", "Escalated"].map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[#687468]">
                    Showing {filteredReports.length} of {reports.length} reports
                  </p>
                  <button
                    type="button"
                    onClick={exportReportsToCsv}
                    disabled={filteredReports.length === 0}
                    className="rounded-lg bg-[#187a58] px-4 py-2 font-medium text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export Reports to CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                        <th className="p-3 font-semibold">Report</th>
                        <th className="p-3 font-semibold">Category</th>
                        <th className="p-3 font-semibold">Location</th>
                        <th className="p-3 font-semibold">Department</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Status</th>
                        <th className="p-3 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                        >
                          <td className="p-3">
                            <p className="font-medium text-[#173c32]">{report.title}</p>
                            <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                          </td>
                          <td className="p-3 text-[#687468]">{report.category}</td>
                          <td className="p-3 text-[#687468]">{report.location}</td>
                          <td className="p-3 text-[#687468]">{report.department}</td>
                          <td className="whitespace-nowrap p-3">{formatDate(report.date)}</td>
                          <td className="p-3">
                            <select
                              value={report.status}
                              disabled={!canChangeStatus || updatingReportId === report.id}
                              onChange={canChangeStatus ? (event) => void updateReportStatus(report.id, event.target.value as ReportStatus) : undefined}
                              aria-label={`Update status for ${report.id}`}
                              className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ${!canChangeStatus ? "bg-[#e2e8ea] text-[#7a8378] cursor-not-allowed" : "disabled:opacity-60"} ${statusStyles[report.status]}`}
                            >
                              {["Pending", "Under Review", "In Progress", "Resolved", "Rejected", "Escalated"].map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                            {updatingReportId === report.id && (
                              <span className="mt-1 block text-xs text-[#687468]">Saving…</span>
                            )}
                            {!canChangeStatus && (
                              <span className="mt-1 block text-xs text-[#7a8378]">View only</span>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setSelectedReportId(report.id)}
                              className="whitespace-nowrap rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!reportsLoading && filteredReports.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#687468]">
                            {reportsError
                              ? "Reports could not be loaded. Use Try Again above."
                              : "No reports match your search or status filter."}
                          </td>
                        </tr>
                      )}
                      {reportsLoading && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#687468]">
                            Loading reports from the backend…
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activePage === "GIS Map" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Kisii County GIS Map</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Report markers use saved GPS coordinates. Reports without coordinates cannot be placed precisely on the map.
                </p>
                <GovernmentMapLoader />
              </section>
            )}

            {activePage === "Departments" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Government Departments</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Department counts are calculated from the reports returned by the backend.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {reportDepartments.map((department) => (
                    <div key={department} className="rounded-lg border border-[#cbd6c8] p-5">
                      <h4 className="mt-3 font-semibold text-[#173c32]">{department}</h4>
                      <p className="mt-2 text-sm text-[#687468]">
                        {reports.filter((report) => report.department === department).length} report(s)
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activePage === "Statistics" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Report Statistics</h3>
                <p className="mb-6 text-sm text-[#687468]">
                  Statistics based on reports currently returned by the backend.
                </p>
                {stats.map((stat) => {
                  const percentage = reports.length > 0 ? Math.round((stat.value / reports.length) * 100) : 0;
                  return (
                    <div key={stat.title} className="mb-5">
                      <div className="mb-2 flex justify-between gap-3">
                        <span className="text-sm font-medium text-[#173c32]">{stat.title}</span>
                        <span className="text-sm text-[#687468]">
                          {reportsLoading ? "—" : `${stat.value} (${percentage}%)`}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[#eff1e9]" role="progressbar" aria-label={`${stat.title} percentage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
                        <div className="h-full rounded-full bg-[#187a58] transition-all" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

          </>
        )}

        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="report-details-title">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#187a58]">{selectedReport.id}</p>
                  <h3 id="report-details-title" className="mt-1 text-2xl font-bold">Report Details</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReportId(null)}
                  aria-label="Close report details"
                  className="rounded-lg px-3 py-2 text-2xl text-[#687468] hover:bg-[#f5f8f5]"
                >
                  <X className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>
              <h4 className="mb-5 text-lg font-semibold">{selectedReport.title}</h4>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-[#687468]">Category</p>
                  <p className="mt-1 font-medium">{selectedReport.category}</p>
                </div>
                <div>
                  <p className="text-sm text-[#687468]">Location</p>
                  <p className="mt-1 font-medium">{selectedReport.location}</p>
                </div>
                <div>
                  <p className="text-sm text-[#687468]">Assigned Department</p>
                  <p className="mt-1 font-medium">{selectedReport.department}</p>
                </div>
                <div>
                  <p className="text-sm text-[#687468]">Date Reported</p>
                  <p className="mt-1 font-medium">{formatDate(selectedReport.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-[#687468]">Current Status</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[selectedReport.status]}`}>
                    {selectedReport.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-[#687468]">GPS Coordinates</p>
                  <p className="mt-1 break-words font-mono text-xs">
                    {selectedReport.latitude !== null && selectedReport.longitude !== null ? `${selectedReport.latitude}, ${selectedReport.longitude}` : "No coordinates saved for this report"}
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <p className="text-sm font-semibold text-[#687468]">Description</p>
                <p className="mt-1 text-[#243329] whitespace-pre-wrap">{selectedReport.description}</p>
              </div>
              {selectedReport.mediaUrls.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#687468]">Evidence</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selectedReport.mediaUrls.map((url, index) => (
                      <img
                        key={index}
                        src={resolvePhotoUrl(url)}
                        alt={`Evidence ${index + 1}`}
                        className="rounded-lg border border-[#cbd6c8] w-32 h-24 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

