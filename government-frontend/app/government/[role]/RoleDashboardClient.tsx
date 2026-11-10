"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "../../../lib/auth-context";
import { apiFetch } from "../../../lib/api";
import { isValidRole, getRoleConfig } from "../../../lib/roles-config";
import { GovernmentShell } from "../../../components/GovernmentShell";
import { StatCard, EmptyState, LoadingState, ErrorState } from "../../../components";
import StatusBadge from "../../../components/StatusBadge";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

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
  status: string;
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
  role: string;
  departmentId?: string | null;
  wardId?: string | null;
  subCountyId?: string | null;
  countyId?: string | null;
};

function normalizeStatus(value: unknown): string {
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
    (raw.departmentId ? `Dept ${String(raw.departmentId)}` : "Unassigned");
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

const statusStyles: Record<string, string> = {
  Pending: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  "Under Review": "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  "In Progress": "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  Resolved: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  Rejected: "bg-[#fff3f0] text-[#8b392f] border-[#f1c9c2]",
  Escalated: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
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

export default function RoleDashboardClient() {
  const params = useParams();
  // URL route segments use hyphens (e.g. "chief-officer"), but role identifiers
  // use underscores (e.g. "CHIEF_OFFICER"). Normalise before comparison.
  const role = String((params as any)?.role ?? "")
    .replace(/-/g, "_")
    .toUpperCase();
  const { status: authStatus, user: sessionUser, sessionVersion } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (!isValidRole(role)) {
    return null;
  }

  const sessionRole = String(sessionUser?.role || "").toUpperCase();

  // Redirect to the correct role dashboard when the URL role doesn't match
  // the session user's role. Runs in an effect (not during render) to avoid
  // React's "Cannot update a component while rendering" error, and only after
  // the session is resolved so we don't redirect while still loading.
  useEffect(() => {
    if (!isValidRole(role) || !sessionUser) return;
    if (sessionRole !== role) {
      const config = getRoleConfig(sessionRole);
      router.replace(`/government/${config.route}`);
    }
  }, [role, sessionRole, sessionUser, router]);

  const user: DashboardUser | null = sessionUser
    ? {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        departmentId: sessionUser.departmentId ?? null,
        wardId: sessionUser.wardId ?? null,
        subCountyId: sessionUser.subCountyId ?? null,
        countyId: sessionUser.countyId ?? null,
      }
    : null;

  const roleConfig = getRoleConfig(role);
  const urlTab = searchParams.get("tab");
  const activeItem = (urlTab && roleConfig.sidebar.some((g: any) => g.items.includes(urlTab)))
    ? urlTab
    : roleConfig.defaultPage;

  const handleNavItem = (item: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", item);
    router.replace(`${pathname}?${params.toString()}`);
  };
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Section-specific data (loaded on demand when the corresponding sidebar
  // item is selected, so each tab shows real, distinct content).
  const [inspections, setInspections] = useState<any[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [workUpdates, setWorkUpdates] = useState<any[]>([]);
  const [workUpdatesLoading, setWorkUpdatesLoading] = useState(false);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [resolutionsLoading, setResolutionsLoading] = useState(false);
  const [escalations, setEscalations] = useState<any[]>([]);
  const [escalationsLoading, setEscalationsLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const payload = await apiFetch("/api/dashboard/overview", {
        cache: "no-store",
      });
      setOverview(payload?.data ?? payload ?? {});
    } catch {
      setOverview(null);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError("");
    try {
      const payload = await apiFetch("/api/dashboard/reports?page=1&limit=100", {
        cache: "no-store",
      });
      const allReports = extractReports(payload);
      setReports(
        allReports
          .filter((report) => report !== null && typeof report === "object" && !Array.isArray(report))
          .map((report, index) => normalizeReport(report, index))
      );
    } catch (error) {
      setReportsError(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const loadInspections = useCallback(async () => {
    setInspectionsLoading(true);
    try {
      const payload = await apiFetch("/api/inspections?page=1&limit=20", {
        cache: "no-store",
      });
      const items = extractReports(payload);
      setInspections(items);
    } catch {
      setInspections([]);
    } finally {
      setInspectionsLoading(false);
    }
  }, []);

  const loadWorkUpdates = useCallback(async () => {
    setWorkUpdatesLoading(true);
    try {
      const payload = await apiFetch("/api/work-updates?page=1&limit=20", {
        cache: "no-store",
      });
      const items = extractReports(payload);
      setWorkUpdates(items);
    } catch {
      setWorkUpdates([]);
    } finally {
      setWorkUpdatesLoading(false);
    }
  }, []);

  const loadFollowUps = useCallback(async () => {
    setFollowUpsLoading(true);
    try {
      const payload = await apiFetch("/api/follow-ups?page=1&limit=20", {
        cache: "no-store",
      });
      const items = extractReports(payload);
      setFollowUps(items);
    } catch {
      setFollowUps([]);
    } finally {
      setFollowUpsLoading(false);
    }
  }, []);

  const loadResolutions = useCallback(async () => {
    setResolutionsLoading(true);
    try {
      const payload = await apiFetch("/api/resolutions?page=1&limit=20", {
        cache: "no-store",
      });
      const items = extractReports(payload);
      setResolutions(items);
    } catch {
      setResolutions([]);
    } finally {
      setResolutionsLoading(false);
    }
  }, []);

  const loadEscalations = useCallback(async () => {
    setEscalationsLoading(true);
    try {
      const payload = await apiFetch("/api/escalations?page=1&limit=20", {
        cache: "no-store",
      });
      const items = extractReports(payload);
      setEscalations(items);
    } catch {
      setEscalations([]);
    } finally {
      setEscalationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void loadOverview();
    void loadReports();
  }, [authStatus, sessionVersion, loadOverview, loadReports]);

  // Load section-specific data when the corresponding sidebar item becomes
  // active. Each tab loads its own data so every sidebar destination shows
  // distinct, real content rather than the same dashboard shell.
  useEffect(() => {
    const item = activeItem.toLowerCase();
    if (item.includes("inspection")) {
      void loadInspections();
    } else if (item.includes("work update") || item.includes("progress update") || item.includes("submit findings")) {
      void loadWorkUpdates();
    } else if (item.includes("follow-up") || item.includes("followup") || item.includes("awaiting action")) {
      void loadFollowUps();
    } else if (item.includes("resolution") || item.includes("resolved")) {
      void loadResolutions();
    } else if (item.includes("escalat")) {
      void loadEscalations();
    }
  }, [activeItem, loadInspections, loadWorkUpdates, loadFollowUps, loadResolutions, loadEscalations]);

  const filteredReports = useMemo(() => reports, [reports]);

  const canChangeStatus = [
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
  ].includes(role);

  const total = overview?.totalReports ?? reports.length;
  const open = overview?.openReports ?? reports.filter((r) => !["Resolved", "Rejected"].includes(r.status)).length;
  const resolved = overview?.resolvedReports ?? reports.filter((r) => r.status === "Resolved").length;
  const overdue = overview?.overdueReports ?? reports.filter((r) => {
    if (["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)) return false;
    const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
    return ageDays > 7;
  }).length;
  const escalated = overview?.openEscalations ?? 0;
  const resolutionRate = overview?.resolutionRate ?? (total > 0 ? Math.round((resolved / total) * 100) : 0);
  const assignedToMe = overview?.assignedToMe ?? reports.filter((r) => r.assignedOfficerId === user?.id).length;

  const roleStats = useMemo(() => {
    if (role === "GOVERNOR") {
      return [
        { title: "Total Reports", value: total, color: "text-[#173c32]" },
        { title: "Open", value: open, color: "text-[#66572f]" },
        { title: "Overdue", value: overdue, color: "text-[#8b392f]" },
        { title: "Resolved", value: resolved, color: "text-[#187a58]" },
        { title: "Escalated", value: escalated, color: "text-[#66572f]" },
        { title: "Resolution Rate", value: `${resolutionRate}%`, color: "text-[#187a58]" },
      ];
    }
    if (
      role === "CECM" ||
      role === "CHIEF_OFFICER" ||
      role === "TECHNICAL_HEAD" ||
      role === "DISASTER_MANAGER" ||
      role === "ENFORCEMENT_OFFICER"
    ) {
      return [
        { title: "Total Reports", value: total, color: "text-[#173c32]" },
        { title: "Open", value: open, color: "text-[#66572f]" },
        { title: "Overdue", value: overdue, color: "text-[#8b392f]" },
        { title: "Resolved", value: resolved, color: "text-[#187a58]" },
        { title: "Escalated", value: escalated, color: "text-[#66572f]" },
      ];
    }
    if (role === "TECHNICAL_SUPERVISOR" || role === "FIELD_OFFICER" || role === "OFFICER") {
      return [
        { title: "Total Reports", value: total, color: "text-[#173c32]" },
        { title: "Assigned to Me", value: assignedToMe, color: "text-[#173c32]" },
        { title: "Open", value: open, color: "text-[#66572f]" },
        { title: "Overdue", value: overdue, color: "text-[#8b392f]" },
        { title: "Resolved", value: resolved, color: "text-[#187a58]" },
      ];
    }
    return [
      { title: "Total Reports", value: total, color: "text-[#173c32]" },
      { title: "Open", value: open, color: "text-[#66572f]" },
      { title: "Overdue", value: overdue, color: "text-[#8b392f]" },
      { title: "Resolved", value: resolved, color: "text-[#187a58]" },
      { title: "Escalated", value: escalated, color: "text-[#66572f]" },
    ];
  }, [overview, reports, role, user]);

  const formatDate = (value: string): string => {
    if (!value || value === "Unknown date") return value || "Unknown date";
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const scopeLabel = useMemo(() => {
    if (!user) return "Unauthenticated";
    if (role === "GOVERNOR") return "County-wide (Kisii)";
    if (role === "ADMIN" || role === "SUPER_ADMIN") return "System-wide";
    if (
      role === "CECM" ||
      role === "CHIEF_OFFICER" ||
      role === "TECHNICAL_HEAD" ||
      role === "DEPARTMENTAL_ADMIN" ||
      role === "DISASTER_MANAGER" ||
      role === "ENFORCEMENT_OFFICER"
    )
      return `Department: ${DEPARTMENT_LABELS[String(user.departmentId)] || user.departmentId || "unassigned"}`;
    if (role === "SUBCOUNTY_ADMIN")
      return `Sub-County: ${user.subCountyId || "unassigned"}`;
    if (role === "FIELD_OFFICER" || role === "OFFICER")
      return "Personal:";
    return `Ward: ${user.wardId || "unassigned"}`;
  }, [user, role]);

  const content = (
    <div className="space-y-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-[#173c32]">{roleConfig.welcome.title}</h3>
          <p className="mt-1 text-sm text-[#687468]">{roleConfig.welcome.subtitle}</p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-xs font-medium ${
          role === "GOVERNOR" || role === "ADMIN" || role === "SUPER_ADMIN"
            ? "border-[#187a58] text-[#187a58] bg-[#e6f3eb]"
            : role === "CECM" || role === "CHIEF_OFFICER" || role === "TECHNICAL_HEAD" || role === "DISASTER_MANAGER" || role === "ENFORCEMENT_OFFICER"
              ? "border-[#55745c] text-[#55745c] bg-[#e8eee3]"
              : "border-[#687468] text-[#687468] bg-[#f0f2f1]"
        }`}>
          {scopeLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {roleStats.map((stat) => (
          <StatCard
            key={stat.title}
            label={stat.title}
            value={reportsLoading ? "—" : stat.value}
            color={stat.color}
          />
        ))}
      </div>

      {overviewLoading ? null : (
        <>
          {role === "GOVERNOR" && (
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">County Oversight</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    County-wide service delivery performance across all departments and sub-counties.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Departments Reporting</p>
                  <p className="mt-1 text-2xl font-bold text-[#173c32]">
                    {new Set(filteredReports.map((r) => r.department)).size}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Open Escalations</p>
                  <p className="mt-1 text-2xl font-bold text-[#8b392f]">
                    {overview.openEscalations ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Resolution Rate</p>
                  <p className="mt-1 text-2xl font-bold text-[#187a58]">
                    {overview.resolutionRate ?? 0}%
                  </p>
                </div>
              </div>
            </section>
          )}

          {[
            "CECM",
            "CHIEF_OFFICER",
            "TECHNICAL_HEAD",
          ].includes(role) && (
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">Department Performance</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Performance within your assigned department.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Total Reports</p>
                  <p className="mt-1 text-2xl font-bold text-[#173c32]">
                    {overview.totalReports ?? reports.length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Open</p>
                  <p className="mt-1 text-2xl font-bold text-[#66572f]">
                    {overview.openReports ?? filteredReports.filter((r) => !["Resolved", "Rejected"].includes(r.status)).length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Resolution Rate</p>
                  <p className="mt-1 text-2xl font-bold text-[#187a58]">
                    {overview.resolutionRate ?? resolutionRate}%
                  </p>
                </div>
              </div>
            </section>
          )}

          {role === "TECHNICAL_SUPERVISOR" && (
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">Team Overview</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Supervise field officers and review technical work within your jurisdiction.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Pending Inspections</p>
                  <p className="mt-1 text-2xl font-bold text-[#66572f]">
                    {filteredReports.filter((r) => ["Pending", "Under Review", "Assigned"].includes(r.status)).length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Work in Progress</p>
                  <p className="mt-1 text-2xl font-bold text-[#244637]">
                    {filteredReports.filter((r) => r.status === "In Progress").length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Awaiting Review</p>
                  <p className="mt-1 text-2xl font-bold text-[#66572f]">
                    {filteredReports.filter((r) => r.status === "Pending").length}
                  </p>
                </div>
              </div>
            </section>
          )}

          {["FIELD_OFFICER", "OFFICER"].includes(role) && (
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">My Assigned Tasks</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Reports personally assigned to you within your jurisdiction.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Assigned to Me</p>
                  <p className="mt-1 text-2xl font-bold text-[#173c32]">
                    {overview.assignedToMe ?? filteredReports.filter((r) => r.assignedOfficerId === user?.id).length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Pending Field Work</p>
                  <p className="mt-1 text-2xl font-bold text-[#66572f]">
                    {filteredReports.filter((r) => r.assignedOfficerId === user?.id && !["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)).length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Completed</p>
                  <p className="mt-1 text-2xl font-bold text-[#187a58]">
                    {filteredReports.filter((r) => r.assignedOfficerId === user?.id && r.status === "Resolved").length}
                  </p>
                </div>
              </div>
            </section>
          )}

          {["WARD_ADMIN", "SUBCOUNTY_ADMIN"].includes(role) && (
            <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] pb-5 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#173c32]">Jurisdiction Overview</h3>
                  <p className="mt-1 text-sm text-[#687468]">
                    Monitor service delivery within your assigned geographic area.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Reports in Jurisdiction</p>
                  <p className="mt-1 text-2xl font-bold text-[#173c32]">
                    {overview.totalReports ?? reports.length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Pending Follow-ups</p>
                  <p className="mt-1 text-2xl font-bold text-[#66572f]">
                    {filteredReports.filter((r) => !["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)).length}
                  </p>
                </div>
                <div className="rounded-lg border border-[#dce2d8] p-4">
                  <p className="text-sm text-[#687468]">Escalated</p>
                  <p className="mt-1 text-2xl font-bold text-[#8b392f]">
                    {overview.openEscalations ?? 0}
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}

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
                className="mt-4 text-sm font-semibold text-[#187a58] hover:underline"
              >
                View all {filteredReports.length} reports
              </button>
            )}
          </div>
        )}
      </section>

      {activeItem === "Reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Reports Management</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Reports below are retrieved from your backend, scoped to your jurisdiction.
            </p>
          </div>
          {reportsLoading ? (
            <LoadingState message="Loading reports…" />
          ) : filteredReports.length === 0 ? (
            <EmptyState type="reports" />
          ) : (
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
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Inspections section */}
      {((activeItem.toLowerCase().includes("inspection") || activeItem.includes("Scheduled Inspections") || activeItem.includes("Inspection Requests") || activeItem.includes("Inspection Results") || activeItem.includes("Inspection Evidence") || activeItem.includes("My Inspection History")) && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Field Inspections</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Inspection records scoped to your jurisdiction and assignments.
            </p>
          </div>
          {inspectionsLoading ? (
            <LoadingState message="Loading inspections…" />
          ) : inspections.length === 0 ? (
            <EmptyState type="general" title="No inspections" description="There are no inspection records available for your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Report</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Officer</th>
                    <th className="p-3 font-semibold">Findings</th>
                    <th className="p-3 font-semibold">Action Taken</th>
                    <th className="p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((insp: any, index: number) => (
                    <tr
                      key={insp.id || `inspection-${index}`}
                      className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">
                          {insp.reportId || `INS-${String(index + 1).padStart(3, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {insp.reportTitle || "Field inspection"}
                        </p>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[String(insp.status || "PENDING").toUpperCase()] ||
                          statusStyles.PENDING
                        }`}>
                          {insp.status || "Pending"}
                        </span>
                      </td>
                      <td className="p-3 text-[#687468]">
                        {insp.officerName || insp.officerId || "—"}
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {insp.findings || "No findings recorded"}
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {insp.actionTaken || "—"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#687468]">
                        {insp.createdAt ? formatDate(String(insp.createdAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Work Updates section */}
      {((activeItem.toLowerCase().includes("work update") || activeItem.includes("progress update") || activeItem.includes("submit findings") || activeItem.includes("Work Updates")) && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Work Updates</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Progress updates and evidence submissions for assigned field work.
            </p>
          </div>
          {workUpdatesLoading ? (
            <LoadingState message="Loading work updates…" />
          ) : workUpdates.length === 0 ? (
            <EmptyState type="general" title="No work updates" description="There are no work update records available for your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Report</th>
                    <th className="p-3 font-semibold">Officer</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Note</th>
                    <th className="p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workUpdates.map((wu: any, index: number) => (
                    <tr
                      key={wu.id || `work-update-${index}`}
                      className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">
                          {wu.reportId || `WU-${String(index + 1).padStart(3, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {wu.reportTitle || "Work update"}
                        </p>
                      </td>
                      <td className="p-3 text-[#687468]">
                        {wu.officerName || wu.officerId || "—"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[String(wu.status || "IN_PROGRESS").toUpperCase()] ||
                          statusStyles["IN_PROGRESS"]
                        }`}>
                          {wu.status || "In Progress"}
                        </span>
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {wu.note || "No note recorded"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#687468]">
                        {wu.createdAt ? formatDate(String(wu.createdAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Follow-ups section */}
      {((activeItem.toLowerCase().includes("follow-up") || activeItem.includes("followup") || activeItem.includes("awaiting action") || activeItem.includes("Follow-ups")) && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Follow-ups</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Follow-up notes and escalation requests for reports in your jurisdiction.
            </p>
          </div>
          {followUpsLoading ? (
            <LoadingState message="Loading follow-ups…" />
          ) : followUps.length === 0 ? (
            <EmptyState type="general" title="No follow-ups" description="There are no follow-up records available for your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Report</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Note</th>
                    <th className="p-3 font-semibold">Created By</th>
                    <th className="p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {followUps.map((fu: any, index: number) => (
                    <tr
                      key={fu.id || `follow-up-${index}`}
                      className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">
                          {fu.reportId || `FU-${String(index + 1).padStart(3, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {fu.reportTitle || "Follow-up"}
                        </p>
                      </td>
                      <td className="p-3 text-[#687468] capitalize">
                        {fu.type || "note"}
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {fu.note || "No note recorded"}
                      </td>
                      <td className="p-3 text-[#687468]">
                        {fu.createdByName || fu.createdById || "—"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#687468]">
                        {fu.createdAt ? formatDate(String(fu.createdAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Resolutions section */}
      {((activeItem.toLowerCase().includes("resolution") || activeItem.includes("resolved") || activeItem.includes("submit findings") || activeItem.includes("Completed")) && !activeItem.toLowerCase().includes("reports") && !activeItem.toLowerCase().includes("inspection") && !activeItem.toLowerCase().includes("follow-up") && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Resolutions</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Resolution submissions and their approval status for reports in your jurisdiction.
            </p>
          </div>
          {resolutionsLoading ? (
            <LoadingState message="Loading resolutions…" />
          ) : resolutions.length === 0 ? (
            <EmptyState type="general" title="No resolutions" description="There are no resolution records available for your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Report</th>
                    <th className="p-3 font-semibold">Submitted By</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Notes</th>
                    <th className="p-3 font-semibold">Resolved At</th>
                  </tr>
                </thead>
                <tbody>
                  {resolutions.map((res: any, index: number) => (
                    <tr
                      key={res.id || `resolution-${index}`}
                      className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">
                          {res.reportId || `RES-${String(index + 1).padStart(3, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {res.reportTitle || "Resolution"}
                        </p>
                      </td>
                      <td className="p-3 text-[#687468]">
                        {res.submittedByName || res.submittedById || "—"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[String(res.status || "PENDING").toUpperCase()] ||
                          statusStyles.PENDING
                        }`}>
                          {res.status || "Pending"}
                        </span>
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {res.notes || "No notes recorded"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#687468]">
                        {res.resolvedAt ? formatDate(String(res.resolvedAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}

      {/* Escalations section */}
      {((activeItem.toLowerCase().includes("escalat") || activeItem.includes("Escalated") || activeItem.includes("Pending Approvals") || activeItem.includes("Escalated Issues")) && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-[#173c32]">Escalations</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Escalated cases requiring attention within your jurisdiction.
            </p>
          </div>
          {escalationsLoading ? (
            <LoadingState message="Loading escalations…" />
          ) : escalations.length === 0 ? (
            <EmptyState type="general" title="No escalations" description="There are no escalated cases available for your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Report</th>
                    <th className="p-3 font-semibold">Reason</th>
                    <th className="p-3 font-semibold">Priority</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Escalated By</th>
                    <th className="p-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {escalations.map((esc: any, index: number) => (
                    <tr
                      key={esc.id || `escalation-${index}`}
                      className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]"
                    >
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">
                          {esc.reportId || `ESC-${String(index + 1).padStart(3, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#7a8378]">
                          {esc.reportTitle || "Escalation"}
                        </p>
                      </td>
                      <td className="p-3 text-[#687468] max-w-[200px] truncate">
                        {esc.reason || "No reason recorded"}
                      </td>
                      <td className="p-3 text-[#687468]">
                        {esc.priority || "MEDIUM"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          statusStyles[String(esc.status || "OPEN").toUpperCase()] ||
                          statusStyles.PENDING
                        }`}>
                          {esc.status || "Open"}
                        </span>
                      </td>
                      <td className="p-3 text-[#687468]">
                        {esc.escalatedByName || esc.escalatedById || "—"}
                      </td>
                      <td className="whitespace-nowrap p-3 text-[#687468]">
                        {esc.createdAt ? formatDate(String(esc.createdAt)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );

  return (
    <GovernmentShell
      user={user}
      roleConfig={roleConfig}
      pageTitle={roleConfig.welcome.title}
      activeItem={activeItem}
      onNavItemClick={handleNavItem}
    >
      {content}
    </GovernmentShell>
  );
}
