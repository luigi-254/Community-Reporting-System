"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GovernmentMapLoader from "../../components/GovernmentMapLoader";
import BrandLogo from "../../components/BrandLogo";
import { X, CheckCircle, Clock } from "lucide-react";
import { StatusBadge, StatCard, EmptyState, LoadingState, ErrorState } from "../../components";

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
  | "DEPARTMENTAL_ADMIN"
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
  subCategory?: string | null;
  location: string;
  department: string;
  departmentId?: string | null;
  date: string;
  createdAt: string;
  status: ReportStatus;
  priority?: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  mediaUrls: string[];
  ward?: string | null;
  subCounty?: string | null;
  county?: string | null;
  assignedOfficerId?: string | null;
  reporterId?: string | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
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
  level: "county" | "department" | "ward" | "subcounty" | "system" | "none";
};

const statusStyles: Record<ReportStatus, string> = {
  Pending: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  "Under Review": "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  "In Progress": "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  Resolved: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  Rejected: "bg-[#fff3f0] text-[#8b392f] border-[#f1c9c2]",
  Escalated: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
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
  PUBLIC_SERVICE: "Public Service, County Administration",
  TRADE: "Trade, Tourism, Industry & Marketing",
  YOUTH: "Youth, Sports, Culture, Arts & Social Services",
  DISASTER: "Disaster Management",
  ENFORCEMENT: "Enforcement",
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
    subCategory: raw.subCategory ?? null,
    location: displayValue(raw.location, "Location not specified"),
    department,
    departmentId: raw.departmentId ?? null,
    date: rawDate ? String(rawDate).slice(0, 10) : "Unknown date",
    createdAt: rawDate ? String(rawDate) : "",
    status: normalizeStatus(raw.status),
    priority: raw.priority ?? "MEDIUM",
    description: displayValue(raw.description, "No description provided."),
    latitude: parseCoordinate(raw.latitude ?? raw.lat),
    longitude: parseCoordinate(raw.longitude ?? raw.lng),
    mediaUrls,
    ward: raw.ward ?? null,
    subCounty: raw.subCounty ?? null,
    county: raw.county ?? null,
    assignedOfficerId: raw.assignedOfficerId ?? null,
    reporterId: raw.reporterId ?? null,
    resolutionNotes: raw.resolutionNotes ?? null,
    resolvedAt: raw.resolvedAt ?? null,
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

function formatDateTime(value: string): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
    "DEPARTMENTAL_ADMIN",
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
  TECHNICAL_SUPERVISOR: ["Dashboard", "Reports", "Inspections", "Work Updates"],
  FIELD_OFFICER: ["Dashboard", "Reports", "Inspections", "Work Updates", "Resolutions"],
  WARD_ADMIN: ["Dashboard", "Reports", "Follow-ups"],
  SUBCOUNTY_ADMIN: ["Dashboard", "Reports", "Follow-ups"],
  DISASTER_MANAGER: ["Dashboard", "Reports", "Departments"],
  ENFORCEMENT_OFFICER: ["Dashboard", "Reports", "Departments"],
  OFFICER: ["Dashboard", "Reports"],
  DEPARTMENTAL_ADMIN: ["Dashboard", "Reports", "Departments"],
  ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
  SUPER_ADMIN: ["Dashboard", "Reports", "GIS Map", "Departments", "Statistics"],
};

const DEFAULT_MENU = ["Dashboard", "Reports"];

const DEFAULT_PAGE_BY_ROLE: Record<ApiRole, string> = {
  GOVERNOR: "Dashboard",
  CECM: "Dashboard",
  CHIEF_OFFICER: "Dashboard",
  TECHNICAL_HEAD: "Dashboard",
  TECHNICAL_SUPERVISOR: "Inspections",
  FIELD_OFFICER: "Inspections",
  WARD_ADMIN: "Dashboard",
  SUBCOUNTY_ADMIN: "Dashboard",
  DISASTER_MANAGER: "Dashboard",
  ENFORCEMENT_OFFICER: "Dashboard",
  OFFICER: "Dashboard",
  DEPARTMENTAL_ADMIN: "Dashboard",
  ADMIN: "Dashboard",
  SUPER_ADMIN: "Dashboard",
};

const WELCOME_BY_ROLE: Record<ApiRole, { title: string; subtitle: string }> = {
  GOVERNOR: {
    title: "County Oversight — Kisii County",
    subtitle: "County-wide service delivery performance, escalated cases, and department accountability.",
  },
  CECM: {
    title: "Portfolio Oversight",
    subtitle: "Department-level reports, SLA compliance, and executive accountability for your portfolio.",
  },
  CHIEF_OFFICER: {
    title: "Department Management",
    subtitle: "Department report queues, officer assignments, overdue cases, and operational oversight.",
  },
  TECHNICAL_HEAD: {
    title: "Technical Operations",
    subtitle: "Technical assignments, quality assurance, resolution progress, and departmental technical oversight.",
  },
  TECHNICAL_SUPERVISOR: {
    title: "Field Team Supervision",
    subtitle: "Supervise field officers, review inspections, approve work updates, and manage technical assignments.",
  },
  FIELD_OFFICER: {
    title: "Field Operations",
    subtitle: "Your assigned cases, inspections, evidence capture, work updates, and resolution submissions.",
  },
  WARD_ADMIN: {
    title: "Ward Administration",
    subtitle: "Reports and follow-ups within your ward jurisdiction, local service delivery monitoring, and escalations.",
  },
  SUBCOUNTY_ADMIN: {
    title: "Sub-County Administration",
    subtitle: "Reports and escalations across wards in your sub-county, local follow-up, and administrative oversight.",
  },
  DISASTER_MANAGER: {
    title: "Disaster Management",
    subtitle: "Hazard reports, emergency incidents, disaster response coordination, and escalation oversight.",
  },
  ENFORCEMENT_OFFICER: {
    title: "Enforcement Operations",
    subtitle: "Enforcement cases, compliance violations, and enforcement actions within your department.",
  },
  OFFICER: {
    title: "Government Officer",
    subtitle: "Assigned reports and operational tasks within your jurisdiction.",
  },
  DEPARTMENTAL_ADMIN: {
    title: "Department Administration",
    subtitle: "Department records, officer management, categories, and administrative oversight.",
  },
  ADMIN: {
    title: "System Administration",
    subtitle: "Platform-wide oversight, user management, audit logs, and system configuration.",
  },
  SUPER_ADMIN: {
    title: "Super Administration",
    subtitle: "Full platform oversight, system administration, and global configuration.",
  },
};

const CAN_CHANGE_STATUS: ApiRole[] = [
  "OFFICER",
  "FIELD_OFFICER",
  "TECHNICAL_SUPERVISOR",
  "TECHNICAL_HEAD",
  "CHIEF_OFFICER",
  "CECM",
  "GOVERNOR",
  "ADMIN",
  "SUPER_ADMIN",
  "DISASTER_MANAGER",
  "ENFORCEMENT_OFFICER",
];

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
      user.role === "TECHNICAL_HEAD" ||
      user.role === "DISASTER_MANAGER" ||
      user.role === "ENFORCEMENT_OFFICER"
    )
      return {
        label: `Department: ${DEPARTMENT_LABELS[String(user.departmentId)] || user.departmentId || "unassigned"}`,
        level: "department",
      };
    if (user.role === "SUBCOUNTY_ADMIN")
      return { label: `Sub-County: ${user.subCountyId || "unassigned"}`, level: "subcounty" };
    return { label: `Ward: ${user.wardId || "unassigned"}`, level: "ward" };
  }, [user]);

  const menuItems = useMemo(() => MENU_BY_ROLE[user?.role ?? "OFFICER"] || DEFAULT_MENU, [user?.role]);
  const welcome = useMemo(() => WELCOME_BY_ROLE[user?.role ?? "OFFICER"] || WELCOME_BY_ROLE.OFFICER, [user?.role]);

  const canChangeStatus = useMemo(
    () => CAN_CHANGE_STATUS.includes(user?.role ?? "OFFICER"),
    [user?.role]
  );

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
      { title: "Total Reports", value: total, color: "text-[#173c32]" },
      { title: "Open", value: open, color: "text-[#66572f]" },
      { title: "Overdue", value: overdue, color: "text-[#8b392f]" },
      { title: "Resolved", value: resolved, color: "text-[#187a58]" },
    ];
  }, [reports]);

  const reportDepartments = useMemo(() => {
    const fromReports = reports.map((r) => r.department).filter(Boolean);
    return Array.from(new Set(fromReports));
  }, [reports]);

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
    const headers = ["Report ID", "Title", "Category", "Location", "Department", "Date Reported", "Status"];
    const rows = filteredReports.map((r) => [r.id, r.title, r.category, r.location, r.department, r.date, r.status]);
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

  const selectedReport = reports.find((report) => report.id === selectedReportId);

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329] md:flex">
      <aside className="w-full bg-[#244637] p-6 text-[#f7f7f2] md:min-h-screen md:w-64">
        <div className="mb-6">
          <BrandLogo className="mb-3 h-10 w-10" />
          <h1 className="text-xl font-bold">Community Reports</h1>
          <p className="mt-1 text-sm text-[#c4d3bf]">Government Portal</p>
        </div>

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
          <p className="text-sm text-[#bdcdbf]">Jurisdiction</p>
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
            <h2 className="text-3xl font-bold text-[#173c32]">{welcome.title}</h2>
            <p className="mt-2 text-sm text-[#687468]">{welcome.subtitle}</p>
            <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              scope.level === "county" || scope.level === "system"
                ? "border-[#187a58] text-[#187a58] bg-[#e6f3eb]"
                : scope.level === "department"
                  ? "border-[#55745c] text-[#55745c] bg-[#e8eee3]"
                  : "border-[#687468] text-[#687468] bg-[#f0f2f1]"
            }`}>
              {scope.label}
            </div>
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
          <ErrorState message={reportsError} onRetry={() => void loadReports()} />
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
          <div className="space-y-8">
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
                        : scope.level === "subcounty"
                          ? "Performance within your assigned sub-county."
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
                <StatCard key={stat.title} label={stat.title} value={reportsLoading ? "—" : stat.value} color={stat.color} />
              ))}
            </div>

            {/* Action Required Section */}
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">Action Required</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Reports requiring your attention within your jurisdiction.
                  </p>
                </div>
              </div>
              {reportsLoading ? (
                <LoadingState message="Loading reports…" />
              ) : filteredReports.length === 0 ? (
                <EmptyState type="general" title="No reports requiring action" description="All reports within your jurisdiction are up to date." />
              ) : (
                <div className="mt-4 space-y-3">
                  {filteredReports.slice(0, 5).map((report) => (
                    <div
                      key={report.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce2d8] p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[#173c32]">{report.title}</p>
                        <p className="mt-1 text-xs text-[#687468]">
                          {report.id} · {report.location}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">{formatDate(report.date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.status} size="sm" />
                        {canChangeStatus && (
                          <button
                            type="button"
                            onClick={() => setSelectedReportId(report.id)}
                            className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                          >
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredReports.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setActivePage("Reports")}
                      className="mt-4 text-sm font-semibold text-[#187a58] hover:underline"
                    >
                      View all {filteredReports.length} reports
                    </button>
                  )}
                </div>
              )}
            </section>

            {activePage === "Dashboard" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5">
                  <div>
                    <h3 className="text-lg font-semibold text-[#173c32]">Recent Reports</h3>
                    <p className="mt-1 text-sm text-[#687468]">
                      Latest reports within your jurisdiction.
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
                  <EmptyState type="reports" />
                ) : (
                  <div className="mt-5 space-y-3">
                    {reports.slice(0, 5).map((report) => (
                      <div
                        key={report.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#dce2d8] p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[#173c32]">{report.title}</p>
                          <p className="mt-1 text-xs text-[#687468]">
                            {report.id} · {report.location}
                          </p>
                          <p className="mt-1 text-xs text-[#7a8378]">{formatDate(report.date)}</p>
                        </div>
                        <StatusBadge status={report.status} />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setActivePage("GIS Map")}
                      className="mt-4 rounded-lg border border-[#187a58] px-4 py-2 text-[#187a58] transition hover:bg-[#e6f3eb]"
                    >
                      Open GIS Map
                    </button>
                  </div>
                )}
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
                      <option key={status} value={status}>{status}</option>
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

            {activePage === "Inspections" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Field Inspections</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Record inspection findings for assigned reports within your jurisdiction.
                </p>
                <InspectionsWorkspace user={user} reports={filteredReports} />
              </section>
            )}

            {activePage === "Work Updates" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Work Updates</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Submit progress updates on assigned field work within your jurisdiction.
                </p>
                <WorkUpdatesWorkspace user={user} reports={filteredReports} />
              </section>
            )}

            {activePage === "Resolutions" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Resolution Submissions</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Submit resolution proposals for review by your supervisor within your assigned cases.
                </p>
                <ResolutionsWorkspace user={user} reports={filteredReports} />
              </section>
            )}

            {activePage === "Follow-ups" && (
              <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <h3 className="mb-2 text-xl font-semibold text-[#173c32]">Administrative Follow-ups</h3>
                <p className="mb-5 text-sm text-[#687468]">
                  Track follow-up actions, escalations, and local service delivery within your geographic jurisdiction.
                </p>
                <FollowUpsWorkspace user={user} reports={filteredReports} />
              </section>
            )}
          </div>
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

function InspectionsWorkspace({ user, reports }: { user: DashboardUser | null; reports: Report[] }) {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    reportId: "",
    findings: "",
    actionTaken: "",
    status: "PENDING",
  });

  useEffect(() => {
    loadInspections();
  }, []);

  async function loadInspections() {
    setLoading(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/inspections`, {
        cache: "no-store",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error(`Failed to load inspections (${response.status})`);
      const data = await response.json();
      setInspections(data?.data?.inspections ?? data?.inspections ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inspections.");
    } finally {
      setLoading(false);
    }
  }

  const isFieldOfficer = user?.role === "FIELD_OFFICER";
  const fieldOfficerReports = reports.filter(
    (r) => r.assignedOfficerId === user?.id && r.status !== "Resolved"
  );

  async function handleCreateInspection(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/inspections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId: formData.reportId,
          findings: formData.findings,
          actionTaken: formData.actionTaken,
          status: formData.status,
          mediaUrls: [],
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create inspection.");
      }
      setFormOpen(false);
      setFormData({ reportId: "", findings: "", actionTaken: "", status: "PENDING" });
      await loadInspections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create inspection.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState message="Loading inspections…" />;
  if (error) return <ErrorState message={error} onRetry={loadInspections} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
            Field Inspections
          </p>
          <h3 className="mt-1 text-lg font-semibold">Record Inspection Findings</h3>
        </div>
        {isFieldOfficer && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-[#187a58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#126448]"
          >
            Record Inspection
          </button>
        )}
      </div>

      {isFieldOfficer && fieldOfficerReports.length === 0 && (
        <EmptyState
          type="general"
          title="No assigned reports available"
          description="You have no assigned reports that require inspection. Inspections can only be recorded for reports assigned to you."
        />
      )}

      {!isFieldOfficer && inspections.length === 0 && (
        <EmptyState
          type="general"
          title="No inspections recorded"
          description="No field inspections have been recorded yet."
        />
      )}

      {isFieldOfficer && fieldOfficerReports.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <form onSubmit={handleCreateInspection} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="inspection-report" className="mb-2 block text-sm font-medium">
                  Report *
                </label>
                <select
                  id="inspection-report"
                  value={formData.reportId}
                  onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="">Select an assigned report</option>
                  {fieldOfficerReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} — {r.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="inspection-status" className="mb-2 block text-sm font-medium">
                  Inspection Status *
                </label>
                <select
                  id="inspection-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="inspection-findings" className="mb-2 block text-sm font-medium">
                Findings *
              </label>
              <textarea
                id="inspection-findings"
                value={formData.findings}
                onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
              />
            </div>
            <div>
              <label htmlFor="inspection-action" className="mb-2 block text-sm font-medium">
                Action Taken *
              </label>
              <textarea
                id="inspection-action"
                value={formData.actionTaken}
                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:opacity-60"
              >
                {creating ? "Recording…" : "Record Inspection"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-lg border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!isFieldOfficer && inspections.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Officer</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Findings</th>
                  <th className="p-3 font-semibold">Action Taken</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp) => (
                  <tr key={insp.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3">
                      <p className="font-medium text-[#173c32]">{insp.reportId}</p>
                    </td>
                    <td className="p-3 text-[#687468]">{insp.officerName || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={insp.status || "PENDING"} size="sm" />
                    </td>
                    <td className="p-3 text-[#687468]">{insp.findings || "—"}</td>
                    <td className="p-3 text-[#687468]">{insp.actionTaken || "—"}</td>
                    <td className="p-3 text-[#687468]">{insp.createdAt ? formatDate(insp.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkUpdatesWorkspace({ user, reports }: { user: DashboardUser | null; reports: Report[] }) {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    reportId: "",
    note: "",
    status: "IN_PROGRESS",
  });

  useEffect(() => {
    loadUpdates();
  }, []);

  async function loadUpdates() {
    setLoading(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/work-updates`, {
        cache: "no-store",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error(`Failed to load work updates (${response.status})`);
      const data = await response.json();
      setUpdates(data?.data?.workUpdates ?? data?.workUpdates ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load work updates.");
    } finally {
      setLoading(false);
    }
  }

  const isFieldOfficer = user?.role === "FIELD_OFFICER";
  const fieldOfficerReports = reports.filter(
    (r) => r.assignedOfficerId === user?.id && r.status !== "Resolved"
  );

  async function handleCreateUpdate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/work-updates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId: formData.reportId,
          note: formData.note,
          status: formData.status,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create work update.");
      }
      setFormOpen(false);
      setFormData({ reportId: "", note: "", status: "IN_PROGRESS" });
      await loadUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create work update.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState message="Loading work updates…" />;
  if (error) return <ErrorState message={error} onRetry={loadUpdates} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
            Work Updates
          </p>
          <h3 className="mt-1 text-lg font-semibold">Submit Work Progress</h3>
        </div>
        {isFieldOfficer && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-[#187a58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#126448]"
          >
            Add Work Update
          </button>
        )}
      </div>

      {isFieldOfficer && fieldOfficerReports.length === 0 && (
        <EmptyState
          type="general"
          title="No assigned reports available"
          description="You have no assigned reports that require work updates. Updates can only be submitted for reports assigned to you."
        />
      )}

      {!isFieldOfficer && updates.length === 0 && (
        <EmptyState
          type="general"
          title="No work updates recorded"
          description="No work updates have been recorded yet."
        />
      )}

      {isFieldOfficer && fieldOfficerReports.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <form onSubmit={handleCreateUpdate} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="update-report" className="mb-2 block text-sm font-medium">
                  Report *
                </label>
                <select
                  id="update-report"
                  value={formData.reportId}
                  onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="">Select an assigned report</option>
                  {fieldOfficerReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} — {r.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="update-status" className="mb-2 block text-sm font-medium">
                  Work Status *
                </label>
                <select
                  id="update-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="update-note" className="mb-2 block text-sm font-medium">
                Work Note *
              </label>
              <textarea
                id="update-note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:opacity-60"
              >
                {creating ? "Submitting…" : "Submit Update"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-lg border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!isFieldOfficer && updates.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Officer</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Note</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {updates.map((upd) => (
                  <tr key={upd.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3">
                      <p className="font-medium text-[#173c32]">{upd.reportId}</p>
                    </td>
                    <td className="p-3 text-[#687468]">{upd.officerName || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={upd.status || "IN_PROGRESS"} size="sm" />
                    </td>
                    <td className="p-3 text-[#687468]">{upd.note || "—"}</td>
                    <td className="p-3 text-[#687468]">{upd.createdAt ? formatDate(upd.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ResolutionsWorkspace({ user, reports }: { user: DashboardUser | null; reports: Report[] }) {
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    reportId: "",
    status: "PENDING",
    notes: "",
  });

  useEffect(() => {
    loadResolutions();
  }, []);

  async function loadResolutions() {
    setLoading(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/resolutions`, {
        cache: "no-store",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error(`Failed to load resolutions (${response.status})`);
      const data = await response.json();
      setResolutions(data?.data?.resolutions ?? data?.resolutions ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resolutions.");
    } finally {
      setLoading(false);
    }
  }

  const isFieldOfficer = user?.role === "FIELD_OFFICER";
  const isSupervisor = ["TECHNICAL_SUPERVISOR", "TECHNICAL_HEAD", "CHIEF_OFFICER"].includes(user?.role ?? "");
  const fieldOfficerReports = reports.filter((r) => r.assignedOfficerId === user?.id && r.status === "Resolved");

  async function handleCreateResolution(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/resolutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId: formData.reportId,
          status: formData.status,
          notes: formData.notes,
          mediaUrls: [],
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit resolution.");
      }
      setFormOpen(false);
      setFormData({ reportId: "", status: "PENDING", notes: "" });
      await loadResolutions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit resolution.");
    } finally {
      setCreating(false);
    }
  }

  async function handleReviewResolution(resolutionId: string, approve: boolean) {
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/resolutions/${encodeURIComponent(resolutionId)}/${approve ? "approve" : "reject"}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || `Failed to ${approve ? "approve" : "reject"} resolution.`);
      }
      await loadResolutions();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${approve ? "approve" : "reject"} resolution.`);
    }
  }

  if (loading) return <LoadingState message="Loading resolutions…" />;
  if (error) return <ErrorState message={error} onRetry={loadResolutions} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
            Resolution Submissions
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {isFieldOfficer ? "Submit Resolution Proposal" : "Review Resolutions"}
          </h3>
        </div>
        {isFieldOfficer && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-[#187a58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#126448]"
          >
            Submit Resolution
          </button>
        )}
      </div>

      {isFieldOfficer && fieldOfficerReports.length === 0 && (
        <EmptyState
          type="general"
          title="No resolved reports available"
          description="You have no reports in Resolved status that need a resolution proposal. Resolution proposals can only be submitted for reports marked as Resolved."
        />
      )}

      {!isFieldOfficer && resolutions.length === 0 && (
        <EmptyState
          type="general"
          title="No resolutions to review"
          description="There are no resolution submissions pending review."
        />
      )}

      {isFieldOfficer && fieldOfficerReports.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <form onSubmit={handleCreateResolution} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="resolution-report" className="mb-2 block text-sm font-medium">
                  Report *
                </label>
                <select
                  id="resolution-report"
                  value={formData.reportId}
                  onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="">Select a resolved report</option>
                  {fieldOfficerReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} — {r.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="resolution-status" className="mb-2 block text-sm font-medium">
                  Resolution Status *
                </label>
                <select
                  id="resolution-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="PENDING">Pending Review</option>
                  <option value="PARTIAL">Partial Completion</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="resolution-notes" className="mb-2 block text-sm font-medium">
                Resolution Notes *
              </label>
              <textarea
                id="resolution-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:opacity-60"
              >
                {creating ? "Submitting…" : "Submit Resolution"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-lg border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!isFieldOfficer && resolutions.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Notes</th>
                  <th className="p-3 font-semibold">Date</th>
                  {isSupervisor && <th className="p-3 font-semibold">Action</th>}
                </tr>
              </thead>
              <tbody>
                {resolutions.map((res) => (
                  <tr key={res.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3">
                      <p className="font-medium text-[#173c32]">{res.reportId}</p>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={res.status || "PENDING"} size="sm" />
                    </td>
                    <td className="p-3 text-[#687468]">{res.notes || "—"}</td>
                    <td className="p-3 text-[#687468]">{res.createdAt ? formatDate(res.createdAt) : "—"}</td>
                    {isSupervisor && (
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewResolution(res.id, true)}
                            disabled={res.status !== "PENDING"}
                            className="rounded-lg bg-[#187a58] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#126448] disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewResolution(res.id, false)}
                            disabled={res.status !== "PENDING"}
                            className="rounded-lg bg-[#fff3f0] px-3 py-2 text-xs font-semibold text-[#8b392f] transition hover:bg-[#f5e9df] disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function FollowUpsWorkspace({ user, reports }: { user: DashboardUser | null; reports: Report[] }) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    reportId: "",
    type: "NOTE",
    note: "",
  });

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function loadFollowUps() {
    setLoading(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/follow-ups`, {
        cache: "no-store",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error(`Failed to load follow-ups (${response.status})`);
      const data = await response.json();
      setFollowUps(data?.data?.followUps ?? data?.followUps ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load follow-ups.");
    } finally {
      setLoading(false);
    }
  }

  const isGeoRole = ["WARD_ADMIN", "SUBCOUNTY_ADMIN"].includes(user?.role ?? "");
  const jurisdictionalReports = reports;

  async function handleCreateFollowUp(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const token = getGovernmentToken();
      const response = await fetch(`${API_URL}/api/follow-ups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reportId: formData.reportId,
          type: formData.type,
          note: formData.note,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to create follow-up.");
      }
      setFormOpen(false);
      setFormData({ reportId: "", type: "NOTE", note: "" });
      await loadFollowUps();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState message="Loading follow-ups…" />;
  if (error) return <ErrorState message={error} onRetry={loadFollowUps} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
            Administrative Follow-ups
          </p>
          <h3 className="mt-1 text-lg font-semibold">
            {isGeoRole ? "Jurisdiction Follow-ups" : "Follow-up Records"}
          </h3>
        </div>
        {isGeoRole && (
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-[#187a58] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#126448]"
          >
            Add Follow-up
          </button>
        )}
      </div>

      {isGeoRole && jurisdictionalReports.length === 0 && (
        <EmptyState
          type="general"
          title="No reports in your jurisdiction"
          description="There are no reports within your assigned ward or sub-county that require follow-up."
        />
      )}

      {!isGeoRole && followUps.length === 0 && (
        <EmptyState
          type="general"
          title="No follow-up records"
          description="No follow-up records have been created yet."
        />
      )}

      {isGeoRole && jurisdictionalReports.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <form onSubmit={handleCreateFollowUp} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="followup-report" className="mb-2 block text-sm font-medium">
                  Report *
                </label>
                <select
                  id="followup-report"
                  value={formData.reportId}
                  onChange={(e) => setFormData({ ...formData, reportId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="">Select a report</option>
                  {jurisdictionalReports.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} — {r.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="followup-type" className="mb-2 block text-sm font-medium">
                  Follow-up Type *
                </label>
                <select
                  id="followup-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
                >
                  <option value="NOTE">General Note</option>
                  <option value="FLAG_INACTIVITY">Flag Inactivity</option>
                  <option value="FLAG_ROUTING">Flag Routing Issue</option>
                  <option value="FLAG_DEADLINE">Flag Deadline Concern</option>
                  <option value="ESCALATION_REQUEST">Request Escalation</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="followup-note" className="mb-2 block text-sm font-medium">
                Follow-up Note *
              </label>
              <textarea
                id="followup-note"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                rows={3}
                required
                className="w-full rounded-lg border border-[#cbd6c8] bg-white px-4 py-3 text-sm outline-none focus:border-[#187a58]"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 rounded-lg bg-[#244637] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#19372a] disabled:opacity-60"
              >
                {creating ? "Submitting…" : "Submit Follow-up"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 rounded-lg border border-[#cbd6c8] px-5 py-3 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {!isGeoRole && followUps.length > 0 && (
        <div className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Note</th>
                  <th className="p-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fu) => (
                  <tr key={fu.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3">
                      <p className="font-medium text-[#173c32]">{fu.reportId}</p>
                    </td>
                    <td className="p-3 text-[#687468]">{fu.type}</td>
                    <td className="p-3 text-[#687468]">{fu.note || "—"}</td>
                    <td className="p-3 text-[#687468]">{fu.createdAt ? formatDate(fu.createdAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
