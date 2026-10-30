"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GovernmentMapLoader from "../../components/GovernmentMapLoader";
import BrandLogo from "../../components/BrandLogo";
import { X } from "lucide-react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

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
  status: ReportStatus;
  description: string;
  latitude: number | null;
  longitude: number | null;
  mediaUrls: string[];
};

type GovernmentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "GOVERNOR", "CECM", "CHIEF_OFFICER"]);
const WARD_SCOPED_ROLES = new Set(["OFFICER", "FIELD_OFFICER", "TECHNICAL_SUPERVISOR", "WARD_ADMIN", "SUBCOUNTY_ADMIN"]);
const DEPARTMENT_SCOPED_ROLES = new Set(["CHIEF_OFFICER", "TECHNICAL_HEAD", "CECM"]);
const STATUS_CHANGE_ROLES = new Set(["OFFICER", "FIELD_OFFICER", "TECHNICAL_SUPERVISOR", "ADMIN", "SUPER_ADMIN"]);

// Menu items visible per role. WARD_ADMIN and SUBCOUNTY_ADMIN see monitoring-only views.
const MENU_BY_ROLE: Record<string, string[]> = {
  GOVERNOR: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
  CECM: ["Dashboard", "Reports", "Departments", "Statistics"],
  CHIEF_OFFICER: ["Dashboard", "Reports", "Departments", "Statistics"],
  TECHNICAL_HEAD: ["Dashboard", "Reports", "Departments"],
  TECHNICAL_SUPERVISOR: ["Dashboard", "Reports"],
  FIELD_OFFICER: ["Dashboard", "Reports"],
  WARD_ADMIN: ["Dashboard", "Reports"],
  SUBCOUNTY_ADMIN: ["Dashboard", "Reports"],
  ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
  SUPER_ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
};

const DEFAULT_MENU = ["Dashboard", "Reports"];

const baseDepartments = ["Public Works", "Water and Sanitation", "Environment"];

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

function normalizeReport(raw: any, index: number): Report {
  const rawDate = raw.createdAt || raw.date || raw.updatedAt || "";
  const department =
    displayValue(raw.department, "") ||
    displayValue(raw.departmentName, "") ||
    (raw.departmentId ? "Assigned Department" : "Unassigned");
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

export default function GovernmentDashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  // Read the logged-in government user's role from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("crs_government_user");
      if (stored) {
        const parsed: GovernmentUser = JSON.parse(stored);
        setUserRole(parsed.role || "");
        setUserName(parsed.name || parsed.email || "Government Officer");
      }
    } catch {
      setUserRole("");
      setUserName("");
    }
  }, []);

  const menuItems = useMemo(() => {
    return MENU_BY_ROLE[userRole] || DEFAULT_MENU;
  }, [userRole]);

  const canChangeStatus = useMemo(() => STATUS_CHANGE_ROLES.has(userRole), [userRole]);

  const loadReports = useCallback(async (showLoading = true) => {
    if (showLoading) setReportsLoading(true);
    setReportsError("");
    try {
      const allReports: any[] = [];
      const limit = 100;
      let page = 1;
      let totalPages = 1;
      do {
        const response = await fetch(`${API_URL}/api/reports?page=${page}&limit=${limit}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || `Could not load reports. HTTP ${response.status}.`);
        }
        allReports.push(...extractReports(payload));
        const pages = Number(
          payload?.data?.totalPages ??
          payload?.data?.pagination?.totalPages ??
          payload?.pagination?.totalPages ??
          payload?.totalPages ??
          1,
        );
        totalPages = Number.isFinite(pages) ? Math.max(1, pages) : 1;
        page += 1;
      } while (page <= totalPages && page <= 100);
      setReports(
        allReports
          .filter((report) => report !== null && typeof report === "object" && !Array.isArray(report))
          .map((report, index) => normalizeReport(report, index)),
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
      const matchesSearch = !query || [report.id, report.title, report.category, report.location]
        .some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (statusFilter === "All" || report.status === statusFilter);
    });
  }, [reports, searchTerm, statusFilter]);

  const stats = useMemo(() => [
    { title: "Total Reports", value: reports.length, color: "bg-[#e2e9df] text-[#173c32]", icon: "ALL" },
    { title: "Pending", value: reports.filter((report) => report.status === "Pending").length, color: "bg-[#f0ebd9] text-[#66572f]", icon: "NEW" },
    { title: "In Progress", value: reports.filter((report) => report.status === "In Progress").length, color: "bg-[#dce8d8] text-[#244637]", icon: "WORK" },
    { title: "Resolved", value: reports.filter((report) => report.status === "Resolved").length, color: "bg-[#dce8d8] text-[#244637]", icon: "DONE" },
  ], [reports]);

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
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/reports/${encodeURIComponent(reportId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const reportDepartments = useMemo(() => {
    const fromReports = reports.map((r) => r.department).filter(Boolean);
    return Array.from(new Set([...baseDepartments, ...fromReports]));
  }, [reports]);

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
          <p className="text-sm text-[#bdcdbd]">Portal</p>
          <p className="mt-1 font-medium">{userRole.replace(/_/g, " ") || "Government Officer"}</p>
          {userName && <p className="mt-0.5 text-xs text-[#a3b8a8]">{userName}</p>}
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#173c32]">Government Dashboard</h2>
            <p className="mt-2 text-sm text-[#687468]">Monitor community issues and service delivery in Kisii County.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[#e6f3eb] px-4 py-2 text-sm font-medium text-[#187a58]">Government Portal</span>
            <button type="button" onClick={() => void loadReports()} disabled={reportsLoading} className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f5f8f5] disabled:opacity-60">
              {reportsLoading ? "Refreshing..." : "Refresh Reports"}
            </button>
          </div>
        </header>

        {reportsError && <div role="alert" className="mb-6 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm text-[#8b392f]"><p className="font-semibold">Could not load live reports</p><p className="mt-1">{reportsError}</p><button type="button" onClick={() => void loadReports()} className="mt-3 rounded-lg border border-[#cbd6c8] px-3 py-2 font-medium hover:bg-[#f5f8f5]">Try Again</button></div>}
        {actionMessage && <div role="status" className="mb-6 rounded-xl border border-[#cfe2d5] bg-[#f1f8f3] p-4 text-sm text-[#31584b]">{actionMessage}</div>}
        {actionError && <div role="alert" className="mb-6 rounded-xl border border-[#f1c9c2] bg-[#fff3f0] p-4 text-sm text-[#8b392f]">{actionError}</div>}

        {activePage === "Dashboard" && (
          <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold text-[#173c32]">Overview</h3>
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#687468]">{reportsLoading ? "Loading data from the backend..." : `${reports.length} live report(s) retrieved from the API`}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                  userRole === "GOVERNOR" || userRole === "ADMIN" || userRole === "SUPER_ADMIN"
                    ? "border-[#187a58] text-[#187a58] bg-[#e6f3eb]"
                    : userRole && WARD_SCOPED_ROLES.has(userRole)
                    ? "border-[#55745c] text-[#55745c] bg-[#e8eee3]"
                    : "border-[#687468] text-[#687468] bg-[#f0f2f1]"
                }`}>
                  {userRole === "GOVERNOR" ? "County-wide" : userRole === "ADMIN" || userRole === "SUPER_ADMIN" ? "System-wide" : userRole && DEPARTMENT_SCOPED_ROLES.has(userRole) ? "Department-scoped" : userRole && WARD_SCOPED_ROLES.has(userRole) ? "Ward/Sub-county-scoped" : "Monitoring only"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => <div key={stat.title} className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6"><div className="mb-4 flex items-center justify-between"><p className="text-sm text-[#687468]">{stat.title}</p><span className={`rounded-lg p-2 text-xs font-bold ${stat.color}`}>{stat.icon}</span></div><p className="text-3xl font-bold text-[#243329]">{reportsLoading ? "—" : stat.value}</p></div>)}
            </div>
            <section className="mt-8 rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-semibold text-[#173c32]">Recent Community Reports</h3><p className="mt-1 text-sm text-[#687468]">The latest reports retrieved from the shared database.</p></div><button type="button" onClick={() => setActivePage("Reports")} className="rounded-lg bg-[#187a58] px-4 py-2 text-white transition hover:bg-[#126448]">View All Reports</button></div>
              {reportsLoading ? <p className="py-6 text-sm text-[#687468]">Loading reports...</p> : reports.length === 0 ? <p className="py-6 text-sm text-[#687468]">No reports were returned by the backend.</p> : <div className="mt-5 space-y-3">{reports.slice(0, 5).map((report) => <div key={report.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce2d8] p-4"><div><p className="font-medium text-[#173c32]">{report.title}</p><p className="mt-1 text-sm text-[#687468]">{report.id} · {report.location}</p><p className="mt-1 text-xs text-[#7a8378]">{formatDate(report.date)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>{report.status}</span></div>)}</div>}
              <button type="button" onClick={() => setActivePage("GIS Map")} className="mt-5 rounded-lg border border-[#187a58] px-4 py-2 text-[#187a58] transition hover:bg-[#e6f3eb]">Open GIS Map</button>
            </section>
          </>
        )}

        {activePage === "Reports" && (
          <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
            <div className="mb-6"><h3 className="text-xl font-semibold text-[#173c32]">Reports Management</h3><p className="mt-1 text-sm text-[#687468]">Reports below are retrieved from your backend, not browser sample data.</p></div>
            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search title, ID, category or location..." aria-label="Search reports" className="rounded-lg border border-[#cbd6c8] px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10 md:col-span-2" />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter reports by status" className="rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 outline-none transition focus:border-[#187a58] focus:ring-4 focus:ring-[#187a58]/10"><option value="All">All statuses</option>{(["Pending", "Under Review", "In Progress", "Resolved", "Rejected", "Escalated"] as ReportStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}</select>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[#687468]">Showing {filteredReports.length} of {reports.length} reports</p><button type="button" onClick={exportReportsToCsv} disabled={filteredReports.length === 0} className="rounded-lg bg-[#187a58] px-4 py-2 font-medium text-white transition hover:bg-[#126448] disabled:cursor-not-allowed disabled:opacity-50">Export Reports to CSV</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[950px] border-collapse text-left text-sm"><thead><tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]"><th className="p-3 font-semibold">Report</th><th className="p-3 font-semibold">Category</th><th className="p-3 font-semibold">Location</th><th className="p-3 font-semibold">Department</th><th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold">Status</th><th className="p-3 font-semibold">Actions</th></tr></thead><tbody>
              {filteredReports.map((report) => <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"><td className="p-3"><p className="font-medium text-[#173c32]">{report.title}</p><p className="mt-1 text-xs text-[#7a8378]">{report.id}</p></td><td className="p-3 text-[#687468]">{report.category}</td><td className="p-3 text-[#687468]">{report.location}</td><td className="p-3 text-[#687468]">{report.department}</td><td className="whitespace-nowrap p-3">{formatDate(report.date)}</td><td className="p-3"><select value={report.status} disabled={!canChangeStatus || updatingReportId === report.id} onChange={canChangeStatus ? (event) => void updateReportStatus(report.id, event.target.value as ReportStatus) : undefined} aria-label={`Update status for ${report.id}`} className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ${!canChangeStatus ? "bg-[#e2e8ea] text-[#7a8378] cursor-not-allowed" : "disabled:opacity-60"} ${statusStyles[report.status]}`}>{(["Pending", "Under Review", "In Progress", "Resolved", "Rejected", "Escalated"] as ReportStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}</select>{updatingReportId === report.id && <span className="mt-1 block text-xs text-[#687468]">Saving...</span>}{!canChangeStatus && <span className="mt-1 block text-xs text-[#7a8378]">View only</span>}</td><td className="p-3"><button type="button" onClick={() => setSelectedReportId(report.id)} className="whitespace-nowrap rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]">View Details</button></td></tr>)}
              {!reportsLoading && filteredReports.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-[#687468]">{reportsError ? "Reports could not be loaded. Use Try Again above." : "No reports match your search or status filter."}</td></tr>}
              {reportsLoading && <tr><td colSpan={7} className="p-8 text-center text-[#687468]">Loading reports from the backend...</td></tr>}
            </tbody></table></div>
          </section>
        )}

        {activePage === "GIS Map" && <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6"><h3 className="mb-2 text-xl font-semibold text-[#173c32]">Kisii County GIS Map</h3><p className="mb-5 text-sm text-[#687468]">Report markers use saved GPS coordinates. Reports without coordinates cannot be placed precisely on the map.</p><GovernmentMapLoader /></section>}

        {activePage === "Departments" && <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6"><h3 className="mb-2 text-xl font-semibold text-[#173c32]">Government Departments</h3><p className="mb-5 text-sm text-[#687468]">Department counts are calculated from the reports returned by the backend.</p><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{reportDepartments.map((department) => <div key={department} className="rounded-lg border border-[#cbd6c8] p-5"><h4 className="mt-3 font-semibold text-[#173c32]">{department}</h4><p className="mt-2 text-sm text-[#687468]">{reports.filter((report) => report.department === department).length} report(s)</p></div>)}</div></section>}

        {activePage === "Statistics" && <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6"><h3 className="mb-2 text-xl font-semibold text-[#173c32]">Report Statistics</h3><p className="mb-6 text-sm text-[#687468]">Statistics based on reports currently returned by the backend.</p>{stats.map((stat) => { const percentage = reports.length > 0 ? Math.round((stat.value / reports.length) * 100) : 0; return <div key={stat.title} className="mb-5"><div className="mb-2 flex justify-between gap-3"><span className="text-sm font-medium text-[#173c32]">{stat.title}</span><span className="text-sm text-[#687468]">{reportsLoading ? "—" : `${stat.value} (${percentage}%)`}</span></div><div className="h-3 overflow-hidden rounded-full bg-[#eff1e9]" role="progressbar" aria-label={`${stat.title} percentage`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div className="h-full rounded-full bg-[#187a58] transition-all" style={{ width: `${percentage}%` }} /></div></div>; })}</section>}

        {selectedReport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="report-details-title"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"><div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-[#187a58]">{selectedReport.id}</p><h3 id="report-details-title" className="mt-1 text-2xl font-bold">Report Details</h3></div><button type="button" onClick={() => setSelectedReportId(null)} aria-label="Close report details" className="rounded-lg px-3 py-2 text-2xl text-[#687468] hover:bg-[#f5f8f5]"><X className="w-6 h-6" aria-hidden="true" /></button></div><h4 className="mb-5 text-lg font-semibold">{selectedReport.title}</h4><div className="grid grid-cols-1 gap-5 sm:grid-cols-2"><div><p className="text-sm text-[#687468]">Category</p><p className="mt-1 font-medium">{selectedReport.category}</p></div><div><p className="text-sm text-[#687468]">Location</p><p className="mt-1 font-medium">{selectedReport.location}</p></div><div><p className="text-sm text-[#687468]">Assigned Department</p><p className="mt-1 font-medium">{selectedReport.department}</p></div><div><p className="text-sm text-[#687468]">Date Reported</p><p className="mt-1 font-medium">{formatDate(selectedReport.date)}</p></div><div><p className="text-sm text-[#687468]">Current Status</p><span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[selectedReport.status]}`}>{selectedReport.status}</span></div><div><p className="text-sm text-[#687468]">GPS Coordinates</p><p className="mt-1 break-words font-mono text-xs">{selectedReport.latitude !== null && selectedReport.longitude !== null ? `${selectedReport.latitude}, ${selectedReport.longitude}` : "No coordinates saved for this report"}</p></div></div><div className="mt-6"><p className="text-sm font-semibold text-[#687468]">Description</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selectedReport.description}</p></div>{selectedReport.mediaUrls.length > 0 && <div className="mt-6 border-t border-gray-200 pt-5"><h4 className="mb-3 font-semibold">Report Photos</h4><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{selectedReport.mediaUrls.map((photo, index) => <a key={`${photo}-${index}`} href={resolvePhotoUrl(photo)} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 p-3 text-sm text-blue-700 underline">View photo {index + 1}</a>)}</div></div>}<div className="mt-8 border-t border-gray-200 pt-5"><label htmlFor="details-status" className="mb-2 block text-sm font-semibold">Update Report Status</label><select id="details-status" value={selectedReport.status} disabled={updatingReportId === selectedReport.id} onChange={(event) => void updateReportStatus(selectedReport.id, event.target.value as ReportStatus)} className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 disabled:opacity-60">{(["Pending", "Under Review", "In Progress", "Resolved", "Rejected", "Escalated"] as ReportStatus[]).map((status) => <option key={status} value={status}>{status}</option>)}</select><button type="button" onClick={() => setSelectedReportId(null)} className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">Done</button></div></div></div>}
      </main>
    </div>
  );
}

