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

  // Status change dialog state
  const [dialogReport, setDialogReport] = useState<Report | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusDialogLoading, setStatusDialogLoading] = useState(false);

  // Work update / evidence upload dialog state
  const [workUpdateReport, setWorkUpdateReport] = useState<Report | null>(null);
  const [showWorkUpdateDialog, setShowWorkUpdateDialog] = useState(false);
  const [workUpdateDialogLoading, setWorkUpdateDialogLoading] = useState(false);
  const [workUpdateImageUrl, setWorkUpdateImageUrl] = useState<string | null>(null);

  const openWorkUpdateDialog = (report: Report) => {
    setWorkUpdateReport(report);
    setWorkUpdateImageUrl(null);
    setShowWorkUpdateDialog(true);
  };

  const closeWorkUpdateDialog = () => {
    setWorkUpdateReport(null);
    setWorkUpdateImageUrl(null);
    setShowWorkUpdateDialog(false);
  };

  const handleImageUpload = async (file: File) => {
    setWorkUpdateDialogLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await apiFetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });
      const url = res?.data?.url;
      if (url) {
        setWorkUpdateImageUrl(url);
      }
    } catch (error) {
      alert(`Image upload failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setWorkUpdateDialogLoading(false);
    }
  };

  const handleWorkUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workUpdateReport) return;
    setWorkUpdateDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const note = formData.get("note") as string;
      const status = formData.get("status") as string;
      const payload: Record<string, unknown> = {
        reportId: workUpdateReport.id,
        note,
        status,
      };
      await apiFetch('/api/work-updates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeWorkUpdateDialog();
      void loadWorkUpdates();
      void loadReports();
    } catch (error) {
      setWorkUpdateDialogLoading(false);
      alert(`Work update failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showWorkUpdateDialog) setWorkUpdateDialogLoading(false);
    }
  };

  // Escalation dialog state
  const [escalateReport, setEscalateReport] = useState<Report | null>(null);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [escalateDialogLoading, setEscalateDialogLoading] = useState(false);

  const openEscalateDialog = (report: Report) => {
    setEscalateReport(report);
    setShowEscalateDialog(true);
  };

  const closeEscalateDialog = () => {
    setEscalateReport(null);
    setShowEscalateDialog(false);
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateReport) return;
    setEscalateDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const reason = formData.get("reason") as string;
      const priority = formData.get("priority") as string;
      const payload: Record<string, unknown> = {
        reportId: escalateReport.id,
        reason,
        priority,
      };
      await apiFetch('/api/escalations', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeEscalateDialog();
      void loadEscalations();
      void loadReports();
    } catch (error) {
      setEscalateDialogLoading(false);
      alert(`Escalation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showEscalateDialog) setEscalateDialogLoading(false);
    }
  };

  const openStatusDialog = (report: Report) => {
    setDialogReport(report);
    setShowStatusDialog(true);
  };

  const closeStatusDialog = () => {
    setDialogReport(null);
    setShowStatusDialog(false);
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialogReport) return;
    setStatusDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const status = formData.get("status") as string;
      const notes = formData.get("notes") as string;
      const payload: Record<string, unknown> = { status };
      if (notes) payload.notes = notes;
      await apiFetch(`/api/reports/${dialogReport.id}/status`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      closeStatusDialog();
      // Refresh reports to reflect the status change
      void loadReports();
      void loadOverview();
    } catch (error) {
      setStatusDialogLoading(false);
      alert(`Failed to change status: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showStatusDialog) setStatusDialogLoading(false);
    }
  };

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "SUBMITTED", label: "Submitted" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "ACKNOWLEDGED", label: "Acknowledged" },
    { value: "INSPECTION_IN_PROGRESS", label: "Inspection in Progress" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "RESOLUTION_SUBMITTED", label: "Resolution Submitted" },
    { value: "AWAITING_CITIZEN_VERIFICATION", label: "Awaiting Citizen Verification" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "REJECTED", label: "Rejected" },
    { value: "CLOSED", label: "Closed" },
    { value: "REOPENED", label: "Reopened" },
    { value: "ESCALATED", label: "Escalated" },
    { value: "DUPLICATE", label: "Duplicate" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  // Assignment dialog state
  const [assignReport, setAssignReport] = useState<Report | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [assignDialogLoading, setAssignDialogLoading] = useState(false);
  const [availableOfficers, setAvailableOfficers] = useState<any[]>([]);
  const [officersLoading, setOfficersLoading] = useState(false);

  const openAssignDialog = (report: Report) => {
    setAssignReport(report);
    setShowAssignDialog(true);
    void loadAvailableOfficers();
  };

  const closeAssignDialog = () => {
    setAssignReport(null);
    setAvailableOfficers([]);
    setShowAssignDialog(false);
  };

  const loadAvailableOfficers = useCallback(async () => {
    setOfficersLoading(true);
    try {
      const res = await apiFetch('/api/users/officers', { cache: 'no-store' });
      const officers = res?.data?.officers ?? res?.data?.users ?? [];
      setAvailableOfficers(officers);
    } catch {
      setAvailableOfficers([]);
    } finally {
      setOfficersLoading(false);
    }
  }, []);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignReport) return;
    setAssignDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const officerId = formData.get("officerId") as string;
      const reason = formData.get("reason") as string;
      const payload: Record<string, unknown> = {
        reportId: assignReport.id,
        officerId,
      };
      if (reason) payload.reason = reason;
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      closeAssignDialog();
      void loadReports();
      void loadOverview();
    } catch (error) {
      setAssignDialogLoading(false);
      alert(`Assignment failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showAssignDialog) setAssignDialogLoading(false);
    }
  };

  // Platform Admin: User Management state
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [userDialogLoading, setUserDialogLoading] = useState(false);
  const [deactivateUserId, setDeactivateUserId] = useState<string | null>(null);
  const [deactivateDialogLoading, setDeactivateDialogLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await apiFetch('/api/users?role=&isActive=&departmentId=&search=', { cache: 'no-store' });
      const userList = res?.data?.users ?? res?.data ?? [];
      setUsers(userList);
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const openEditUserDialog = (user: any) => {
    setEditUser(user);
    setShowEditUserDialog(true);
  };

  const closeEditUserDialog = () => {
    setEditUser(null);
    setShowEditUserDialog(false);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const payload: Record<string, unknown> = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role'),
        phone: formData.get('phone') || undefined,
        county: formData.get('county') || undefined,
        subCounty: formData.get('subCounty') || undefined,
        ward: formData.get('ward') || undefined,
        departmentId: formData.get('departmentId') || undefined,
      };
      await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });
      setShowCreateUserDialog(false);
      void loadUsers();
    } catch (error) {
      setUserDialogLoading(false);
      alert(`Create user failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showCreateUserDialog) setUserDialogLoading(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setUserDialogLoading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const payload: Record<string, unknown> = {};
      const name = formData.get('name');
      const phone = formData.get('phone');
      const county = formData.get('county');
      const subCounty = formData.get('subCounty');
      const ward = formData.get('ward');
      const departmentId = formData.get('departmentId');
      const isActive = formData.get('isActive');
      if (name) payload.name = name;
      if (phone) payload.phone = phone;
      if (county) payload.county = county;
      if (subCounty) payload.subCounty = subCounty;
      if (ward) payload.ward = ward;
      if (departmentId) payload.departmentId = departmentId;
      if (isActive !== undefined) payload.isActive = isActive === 'true';
      await apiFetch(`/api/users/${editUser.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      closeEditUserDialog();
      void loadUsers();
    } catch (error) {
      setUserDialogLoading(false);
      alert(`Update user failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (showEditUserDialog) setUserDialogLoading(false);
    }
  };

  const handleDeactivateUser = async (id: string, isActive: boolean) => {
    setDeactivateUserId(id);
    setDeactivateDialogLoading(true);
    try {
      await apiFetch(`/api/users/${id}/${isActive ? 'activate' : 'deactivate'}`, { method: 'PUT' });
      setDeactivateUserId(null);
      void loadUsers();
    } catch (error) {
      setDeactivateDialogLoading(false);
      alert(`User status update failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeactivateDialogLoading(false);
    }
  };

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
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      void loadUsers();
    }
  }, [authStatus, sessionVersion, loadOverview, loadReports, loadUsers, user]);

  // Load section-specific data when the corresponding sidebar item becomes
  // active. Each tab loads its own data so every sidebar destination shows
  // distinct, real content rather than the same dashboard shell.
  useEffect(() => {
    const item = activeItem.toLowerCase();
    if (item.includes("inspection")) {
      void loadInspections();
    } else if (item.includes("work update") || item.includes("progress update") || item.includes("submit findings") || item.includes("upload evidence")) {
      void loadWorkUpdates();
    } else if (item.includes("follow-up") || item.includes("followup") || item.includes("awaiting action")) {
      void loadFollowUps();
    } else if (item.includes("resolution") || item.includes("resolved")) {
      void loadResolutions();
    } else if (item.includes("escalat")) {
      void loadEscalations();
    }
  }, [activeItem, loadInspections, loadWorkUpdates, loadFollowUps, loadResolutions, loadEscalations]);

  const activeLower = activeItem.toLowerCase();
  const isOverviewPage = activeItem === roleConfig.defaultPage;
  const filteredReports = useMemo(() => {
    if (!activeLower) return reports;

    // Status-based filters
    if (activeLower.includes("critical") || activeLower.includes("high")) {
      return reports.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH");
    }
    if (activeLower.includes("unresolved") || activeLower.includes("open")) {
      return reports.filter((r) => !["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status));
    }
    if (activeLower.includes("resolved")) {
      return reports.filter((r) => r.status === "Resolved");
    }
    if (activeLower.includes("pending")) {
      return reports.filter((r) => r.status === "Pending" || r.status === "SUBMITTED");
    }
    if (activeLower.includes("in progress")) {
      return reports.filter((r) => r.status === "In Progress");
    }
    if (activeLower.includes("overdue")) {
      return reports.filter((r) => {
        if (["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)) return false;
        const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
        return ageDays > 7;
      });
    }
    if (activeLower.includes("escalat")) {
      return reports.filter((r) => r.status === "Escalated");
    }
    if (activeLower.includes("assigned") && !activeLower.includes("unassigned")) {
      return reports.filter((r) => r.assignedOfficerId === user?.id);
    }
    if (activeLower.includes("unassigned")) {
      return reports.filter((r) => !r.assignedOfficerId);
    }

    // Category-based filters
    const categoryMap: Record<string, string> = {
      roads: "Roads, Traffic & Mobility",
      water: "Water & Sewerage",
      sewerage: "Water & Sewerage",
      drainage: "Drainage & Flood Control",
      waste: "Solid Waste & Environment",
      lighting: "Street Lighting & Power",
      facilities: "Public Facilities, Markets & Parks",
      safety: "Public Safety & Hazards",
    };
    for (const [key, catName] of Object.entries(categoryMap)) {
      if (activeLower.includes(key)) {
        return reports.filter((r) => r.category === catName);
      }
    }

    // "all reports" variants — show everything
    return reports;
  }, [reports, activeLower, user]);

  // Derived datasets for dedicated pages (computed from already-loaded backend data).
  const reportsByDepartment = useMemo(() => {
    const grouped: Record<string, Report[]> = {};
    filteredReports.forEach((r) => {
      const dept = r.department || "Unassigned";
      if (!grouped[dept]) grouped[dept] = [];
      grouped[dept].push(r);
    });
    return grouped;
  }, [filteredReports]);

  const reportsBySubCounty = useMemo(() => {
    const grouped: Record<string, Report[]> = {};
    filteredReports.forEach((r) => {
      const sc = r.subCounty || "Unassigned";
      if (!grouped[sc]) grouped[sc] = [];
      grouped[sc].push(r);
    });
    return grouped;
  }, [filteredReports]);

  const reportsByWard = useMemo(() => {
    const grouped: Record<string, Report[]> = {};
    filteredReports.forEach((r) => {
      const w = r.ward || "Unassigned";
      if (!grouped[w]) grouped[w] = [];
      grouped[w].push(r);
    });
    return grouped;
  }, [filteredReports]);

  const criticalReports = useMemo(
    () => filteredReports.filter((r) => r.priority === "CRITICAL" || r.priority === "HIGH"),
    [filteredReports]
  );

  const unresolvedReports = useMemo(
    () => filteredReports.filter((r) => !["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)),
    [filteredReports]
  );

  const resolvedReports = useMemo(
    () => filteredReports.filter((r) => r.status === "Resolved"),
    [filteredReports]
  );

  const monthlyStats = useMemo(() => {
    const grouped: Record<string, { total: number; resolved: number }> = {};
    filteredReports.forEach((r) => {
      const month = r.date ? r.date.slice(0, 7) : "unknown";
      if (!grouped[month]) grouped[month] = { total: 0, resolved: 0 };
      grouped[month].total += 1;
      if (r.status === "Resolved") grouped[month].resolved += 1;
    });
    return Object.entries(grouped).map(([month, stats]) => ({ month, ...stats }));
  }, [filteredReports]);

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
          {isOverviewPage && role === "GOVERNOR" && (
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

          {isOverviewPage && [
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

      {/* Sub-County Performance */}
      {role === "GOVERNOR" && activeLower === "sub-county performance" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Sub-County Performance</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Compare service delivery performance across all sub-counties.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Sub-County</th>
                  <th className="p-3 font-semibold">Reports Received</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Outstanding</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsBySubCounty).map(([subCounty, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  const rate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;
                  return (
                    <tr key={subCounty} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{subCounty}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ward Performance */}
      {role === "GOVERNOR" && activeLower === "ward performance" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Ward Performance</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Compare service delivery performance across all wards.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Ward</th>
                  <th className="p-3 font-semibold">Reports Received</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Outstanding</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByWard).map(([ward, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  const rate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;
                  return (
                    <tr key={ward} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{ward}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Departmental Performance */}
      {role === "GOVERNOR" && activeLower === "departmental performance" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Departmental Performance</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Compare performance across all county departments.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Reports Assigned</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Outstanding</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByDepartment).map(([department, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  const rate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;
                  return (
                    <tr key={department} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{department}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Department Performance (Departments group) */}
      {role === "GOVERNOR" && activeLower === "department performance" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Department Performance</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Performance breakdown for the selected department within your county.
              </p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Departments</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">
                {Object.keys(reportsByDepartment).length}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Reports Assigned</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Open</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByDepartment).map(([department, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  const rate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;
                  return (
                    <tr key={department} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{department}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Resolution Statistics */}
      {role === "GOVERNOR" && activeLower === "resolution statistics" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Resolution Statistics</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Resolution trends and time-to-resolution analytics across reporting periods.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Total Reports</p>
                <p className="mt-1 text-2xl font-bold text-[#173c32]">{total}</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolved}</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Resolution Rate</p>
                <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolutionRate}%</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Open</p>
                <p className="mt-1 text-2xl font-bold text-[#66572f]">{open}</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Reporting Period</th>
                  <th className="p-3 font-semibold">Reports Received</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.slice().reverse().map((stat) => {
                  const rate = stat.total > 0 ? Math.round((stat.resolved / stat.total) * 100) : 0;
                  return (
                    <tr key={stat.month} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{stat.month}</td>
                      <td className="p-3 text-[#687468]">{stat.total}</td>
                      <td className="p-3 text-[#687468]">{stat.resolved}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

          {isOverviewPage && role === "TECHNICAL_SUPERVISOR" && (
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

      {/* Department Directory */}
      {role === "GOVERNOR" && activeLower === "department directory" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Department Directory</h3>
              <p className="mt-1 text-sm text-[#687468]">
                County departments, leadership, and responsible officers.
              </p>
            </div>
            <div className="rounded-lg border border-[#187a58] bg-[#e6f3eb] p-4">
              <p className="text-sm text-[#687468]">Departments</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{Object.keys(reportsByDepartment).length}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Reports Assigned</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByDepartment).map(([department, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  return (
                    <tr key={department} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{department}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Department Issues */}
      {role === "GOVERNOR" && activeLower === "department issues" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Department Issues</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Open, overdue, and escalated issues grouped by department.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Open Issues</th>
                  <th className="p-3 font-semibold">Overdue</th>
                  <th className="p-3 font-semibold">Escalated</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByDepartment).map(([department, reports]) => {
                  const openCount = reports.filter((r) => !["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)).length;
                  const overdueCount = reports.filter((r) => {
                    if (["Resolved", "Rejected", "Closed", "Cancelled"].includes(r.status)) return false;
                    const ageDays = (Date.now() - new Date(r.createdAt).getTime()) / 86400000;
                    return ageDays > 7;
                  }).length;
                  const escalatedCount = reports.filter((r) => r.status === "Escalated").length;
                  return (
                    <tr key={department} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{department}</td>
                      <td className="p-3 text-[#687468]">{openCount}</td>
                      <td className="p-3 text-[#687468]">{overdueCount}</td>
                      <td className="p-3 text-[#687468]">{escalatedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* County Map */}
      {role === "GOVERNOR" && activeLower === "county map" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">County Map</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Geographical overview of reports across Kisii County.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#dce2d8] bg-[#eef4f1] h-[500px] flex items-center justify-center">
            <p className="text-[#687468] text-sm">
              Map visualization would render here using existing county boundary
              and report-location data from the GIS service.
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Sub-Counties</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{Object.keys(reportsBySubCounty).length}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Wards</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{Object.keys(reportsByWard).length}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Departments</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{Object.keys(reportsByDepartment).length}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Total Reports</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{total}</p>
            </div>
          </div>
        </section>
      )}

      {/* Reports by Sub-County */}
      {role === "GOVERNOR" && activeLower === "reports by sub-county" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Reports by Sub-County</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Reports grouped and filtered by sub-county.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Sub-County</th>
                  <th className="p-3 font-semibold">Reports</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsBySubCounty).map(([subCounty, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  return (
                    <tr key={subCounty} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{subCounty}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reports by Ward */}
      {role === "GOVERNOR" && activeLower === "reports by ward" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Reports by Ward</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Reports grouped and filtered by ward.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Ward</th>
                  <th className="p-3 font-semibold">Reports</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Open</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByWard).map(([ward, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  return (
                    <tr key={ward} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{ward}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Executive Approvals */}
      {role === "GOVERNOR" && activeLower === "executive approvals" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Executive Approvals</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Cases requiring executive approval within your authority.
              </p>
            </div>
            <div className="rounded-lg border border-[#187a58] bg-[#e6f3eb] p-4">
              <p className="text-sm text-[#687468]">Pending Approvals</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{escalated}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Location</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.filter((r) => r.status === "Escalated").map((report) => (
                  <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3">
                      <p className="font-medium text-[#173c32]">{report.title}</p>
                      <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                    </td>
                    <td className="p-3 text-[#687468]">{report.category}</td>
                    <td className="p-3 text-[#687468]">{report.department}</td>
                    <td className="p-3 text-[#687468]">{report.location}</td>
                    <td className="p-3">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[#f0ebd9] text-[#66572f]">
                        Escalated
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                          type="button"
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                        Approve Action
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReports.filter((r) => r.status === "Escalated").length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-[#687468]">
                      No cases requiring executive approval at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

          {isOverviewPage && ["FIELD_OFFICER", "OFFICER"].includes(role) && (
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

          {isOverviewPage && ["WARD_ADMIN", "SUBCOUNTY_ADMIN"].includes(role) && (
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

      {/* All County Reports */}
      {activeLower === "all county reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">All County Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Comprehensive county-wide report management interface.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Total Reports</p>
                <p className="mt-1 text-2xl font-bold text-[#173c32]">{total}</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Open</p>
                <p className="mt-1 text-2xl font-bold text-[#66572f]">{open}</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Resolved</p>
                <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolved}</p>
              </div>
              <div className="rounded-lg border border-[#dce2d8] p-4">
                <p className="text-sm text-[#687468]">Escalated</p>
                <p className="mt-1 text-2xl font-bold text-[#8b392f]">{escalated}</p>
              </div>
            </div>
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
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold">Title</th>
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
                    <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
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
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => openEscalateDialog(report)}
                          className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                        >
                          Escalate
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openAssignDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Assign
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

      {/* Critical Reports */}
      {activeLower === "critical reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Critical Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                High-priority cases requiring executive attention.
              </p>
            </div>
            <div className="rounded-lg border border-[#8b392f] bg-[#fff3f0] p-4">
              <p className="text-sm text-[#687468]">Critical Cases</p>
              <p className="mt-1 text-2xl font-bold text-[#8b392f]">{criticalReports.length}</p>
            </div>
          </div>
          {criticalReports.length === 0 ? (
            <EmptyState type="general" title="No critical reports" description="There are no critical reports within your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Priority</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalReports.map((report) => (
                    <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">{report.title}</p>
                        <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                      </td>
                      <td className="p-3 text-[#687468]">{report.category}</td>
                      <td className="p-3 text-[#687468]">{report.location}</td>
                      <td className="p-3 text-[#687468]">{report.department}</td>
                      <td className="p-3 text-[#687468] capitalize">{report.priority}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => openEscalateDialog(report)}
                          className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                        >
                          Escalate
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openAssignDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Assign
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

      {/* Unresolved Reports */}
      {activeLower === "unresolved reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Unresolved Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Reports that remain open and require follow-up action.
              </p>
            </div>
            <div className="rounded-lg border border-[#66572f] bg-[#f0ebd9] p-4">
              <p className="text-sm text-[#687468]">Unresolved Cases</p>
              <p className="mt-1 text-2xl font-bold text-[#66572f]">{unresolvedReports.length}</p>
            </div>
          </div>
          {unresolvedReports.length === 0 ? (
            <EmptyState type="general" title="No unresolved reports" description="All reports within your jurisdiction are resolved." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Days Outstanding</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unresolvedReports.map((report) => {
                    const ageDays = report.createdAt
                      ? Math.floor((Date.now() - new Date(report.createdAt).getTime()) / 86400000)
                      : 0;
                    return (
                      <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                        <td className="p-3">
                          <p className="font-medium text-[#173c32]">{report.title}</p>
                          <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                        </td>
                        <td className="p-3 text-[#687468]">{report.category}</td>
                        <td className="p-3 text-[#687468]">{report.location}</td>
                        <td className="p-3 text-[#687468]">{report.department}</td>
                        <td className="whitespace-nowrap p-3">{ageDays} days</td>
                        <td className="p-3">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                          type="button"
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                            View Details
                          </button>
                          <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Resolved Reports */}
      {activeLower === "resolved reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Resolved Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Reports that have been resolved within your jurisdiction.
              </p>
            </div>
            <div className="rounded-lg border border-[#187a58] bg-[#e6f3eb] p-4">
              <p className="text-sm text-[#687468]">Resolved Cases</p>
              <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolvedReports.length}</p>
            </div>
          </div>
          {resolvedReports.length === 0 ? (
            <EmptyState type="general" title="No resolved reports" description="There are no resolved reports within your jurisdiction." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Resolution Date</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedReports.map((report) => (
                    <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">{report.title}</p>
                        <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                      </td>
                      <td className="p-3 text-[#687468]">{report.category}</td>
                      <td className="p-3 text-[#687468]">{report.department}</td>
                      <td className="whitespace-nowrap p-3">{formatDate(report.resolvedAt || report.date)}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => openEscalateDialog(report)}
                          className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                        >
                          Escalate
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openAssignDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Assign
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

      {/* Action Required (overview page only) */}
      {isOverviewPage && (
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
                    <>
                      <button
                        type="button"
                        onClick={() => openStatusDialog(report)}
                        className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => openWorkUpdateDialog(report)}
                        className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                      >
                        Upload Evidence
                      </button>
                      <button
                        type="button"
                        onClick={() => openEscalateDialog(report)}
                        className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                      >
                        Escalate
                      </button>
                      <button
                        type="button"
                        onClick={() => openAssignDialog(report)}
                        className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                      >
                        Assign
                      </button>
                    </>
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
      )}

      {activeLower === "reports" && (
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
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => openEscalateDialog(report)}
                          className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                        >
                          Escalate
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openAssignDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Assign
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
      {((activeLower.includes("inspection") || activeLower.includes("scheduled inspections") || activeLower.includes("inspection requests") || activeLower.includes("inspection results") || activeLower.includes("inspection evidence") || activeLower.includes("my inspection history")) && (
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
      {((activeLower.includes("work update") || activeLower.includes("progress update") || activeLower.includes("submit findings") || activeLower.includes("work updates") || activeLower.includes("upload evidence")) && (
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
      {((activeLower.includes("follow-up") || activeLower.includes("followup") || activeLower.includes("awaiting action") || activeLower.includes("follow-ups")) && (
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
      {((activeLower.includes("resolution") || activeLower.includes("resolved") || activeLower.includes("submit findings") || activeLower.includes("completed")) && !activeLower.includes("reports") && !activeLower.includes("inspection") && !activeLower.includes("follow-up") && (
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
      {((activeLower.includes("escalat") || activeLower.includes("escalated") || activeLower.includes("pending approvals") || activeLower.includes("escalated issues")) && (
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

      {/* Analytics & Reports - County Performance Reports */}
      {role === "GOVERNOR" && activeLower === "county performance reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">County Performance Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                County-wide performance reporting and analytics.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Total Reports</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{total}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Open</p>
              <p className="mt-1 text-2xl font-bold text-[#66572f]">{open}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolved}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Resolution Rate</p>
              <p className="mt-1 text-2xl font-bold text-[#187a58]">{resolutionRate}%</p>
            </div>
          </div>
          <div className="overflow-x-auto mt-6">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Metric</th>
                  <th className="p-3 font-semibold">Value</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#dce2d8]">
                  <td className="p-3 font-medium text-[#173c32]">Total Reports Submitted</td>
                  <td className="p-3 text-[#687468]">{total}</td>
                  <td className="p-3">
                    <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[#e6f3eb] text-[#187a58]">County-wide</span>
                  </td>
                </tr>
                <tr className="border-b border-[#dce2d8]">
                  <td className="p-3 font-medium text-[#173c32]">Reports Requiring Action</td>
                  <td className="p-3 text-[#687468]">{open}</td>
                  <td className="p-3">
                    <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[#f0ebd9] text-[#66572f]">Open</span>
                  </td>
                </tr>
                <tr className="border-b border-[#dce2d8]">
                  <td className="p-3 font-medium text-[#173c32]">Reports Resolved</td>
                  <td className="p-3 text-[#687468]">{resolved}</td>
                  <td className="p-3">
                    <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[#e6f3eb] text-[#187a58]">Resolved</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-[#173c32]">Reports Escalated</td>
                  <td className="p-3 text-[#687468]">{escalated}</td>
                  <td className="p-3">
                    <span className="inline-block rounded-full px-3 py-1 text-xs font-semibold bg-[#fff3f0] text-[#8b392f]">Escalated</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Monthly Reports */}
      {role === "GOVERNOR" && activeLower === "monthly reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Monthly Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Monthly reporting periods and historical performance information.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Reporting Period</th>
                  <th className="p-3 font-semibold">Reports Received</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyStats.slice().reverse().map((stat) => {
                  const rate = stat.total > 0 ? Math.round((stat.resolved / stat.total) * 100) : 0;
                  return (
                    <tr key={stat.month} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{stat.month}</td>
                      <td className="p-3 text-[#687468]">{stat.total}</td>
                      <td className="p-3 text-[#687468]">{stat.resolved}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Departmental Reports */}
      {role === "GOVERNOR" && activeLower === "departmental reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Departmental Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Department-level reporting across all county departments.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Reports</th>
                  <th className="p-3 font-semibold">Resolved</th>
                  <th className="p-3 font-semibold">Open</th>
                  <th className="p-3 font-semibold">Resolution Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(reportsByDepartment).map(([department, reports]) => {
                  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
                  const rate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;
                  return (
                    <tr key={department} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3 font-medium text-[#173c32]">{department}</td>
                      <td className="p-3 text-[#687468]">{reports.length}</td>
                      <td className="p-3 text-[#687468]">{resolvedCount}</td>
                      <td className="p-3 text-[#687468]">{reports.length - resolvedCount}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${rate >= 70 ? "text-[#187a58] bg-[#e6f3eb]" : rate >= 40 ? "text-[#66572f] bg-[#f0ebd9]" : "text-[#8b392f] bg-[#fff3f0]"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Exportable Reports */}
      {role === "GOVERNOR" && activeLower === "exportable reports" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Exportable Reports</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Export report data for offline analysis and record-keeping.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "All County Reports", count: total },
              { label: "Resolved Reports", count: resolved },
              { label: "Open Reports", count: open },
              { label: "Escalated Reports", count: escalated },
              { label: "Unresolved Reports", count: unresolvedReports.length },
              { label: "Critical Reports", count: criticalReports.length },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-[#dce2d8] bg-[#fdfdf9] p-6">
                <p className="text-sm text-[#687468]">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#173c32]">{item.count}</p>
                <button type="button" className="mt-3 rounded-lg border border-[#187a58] bg-[#187a58] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#126448]">
                  Export CSV
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      {activeLower === "notifications" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Notifications</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Recent notifications and alerts for your role and jurisdiction.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#dce2d8] p-6">
            <p className="text-sm text-[#687468]">
              View and manage notifications in the workspace header.
            </p>
          </div>
        </section>
      )}

      {/* My Profile */}
      {activeLower === "my profile" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">My Profile</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Your account details and role information.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Name</p>
              <p className="mt-1 font-medium text-[#173c32]">{user?.name || "—"}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Email</p>
              <p className="mt-1 font-medium text-[#173c32]">{user?.email || "—"}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Role</p>
              <p className="mt-1 font-medium text-[#173c32]">{user?.role || "—"}</p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Scope</p>
              <p className="mt-1 font-medium text-[#173c32]">{scopeLabel}</p>
            </div>
          </div>
        </section>
      )}

      {/* Catch-all: report-related tabs without dedicated sections */}
      {!isOverviewPage &&
        !activeLower.includes("inspection") &&
        !activeLower.includes("work update") &&
        !activeLower.includes("progress update") &&
        !activeLower.includes("submit findings") &&
        !activeLower.includes("upload evidence") &&
        !activeLower.includes("follow-up") &&
        !activeLower.includes("followup") &&
        !activeLower.includes("awaiting action") &&
        !activeLower.includes("follow-ups") &&
        !activeLower.includes("resolution") &&
        !activeLower.includes("resolved") &&
        !activeLower.includes("completed") &&
        !activeLower.includes("escalat") &&
        !activeLower.includes("pending approvals") &&
        !activeLower.includes("escalated issues") &&
        !activeLower.includes("county performance reports") &&
        !activeLower.includes("monthly reports") &&
        !activeLower.includes("departmental reports") &&
        !activeLower.includes("exportable reports") &&
        activeLower !== "reports" &&
        activeLower !== "notifications" &&
        activeLower !== "my profile" &&
        (activeLower.includes("report") ||
          activeLower.includes("pending") ||
          activeLower.includes("critical") ||
          activeLower.includes("overdue") ||
          activeLower.includes("assigned") ||
          activeLower.includes("unassigned") ||
          activeLower.includes("in progress") ||
          activeLower.includes("roads") ||
          activeLower.includes("water") ||
          activeLower.includes("sewerage") ||
          activeLower.includes("drainage") ||
          activeLower.includes("waste") ||
          activeLower.includes("lighting") ||
          activeLower.includes("facilities") ||
          activeLower.includes("safety")) && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">{activeItem}</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Reports filtered by "{activeItem}" within your jurisdiction.
              </p>
            </div>
            <div className="rounded-lg border border-[#dce2d8] p-4">
              <p className="text-sm text-[#687468]">Reports</p>
              <p className="mt-1 text-2xl font-bold text-[#173c32]">{filteredReports.length}</p>
            </div>
          </div>
          {filteredReports.length === 0 ? (
            <EmptyState type="reports" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Reference</th>
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Category</th>
                    <th className="p-3 font-semibold">Location</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">{report.title}</p>
                        <p className="mt-1 text-xs text-[#7a8378]">{report.id}</p>
                      </td>
                      <td className="p-3 text-[#687468]">{report.category}</td>
                      <td className="p-3 text-[#687468]">{report.location}</td>
                      <td className="p-3 text-[#687468]">{report.department}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[report.status]}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openStatusDialog(report)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          View Details
                        </button>
                        <button
                          type="button"
                          onClick={() => openWorkUpdateDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Upload Evidence
                        </button>
                        <button
                          type="button"
                          onClick={() => openEscalateDialog(report)}
                          className="ml-2 rounded-lg border border-[#8b392f] px-3 py-2 text-sm font-medium text-[#8b392f] transition hover:bg-[#fff3f0]"
                        >
                          Escalate
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openAssignDialog(report)}
                          className="ml-2 rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb]"
                        >
                          Assign
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

      {/* Status Change Dialog */}
      {showStatusDialog && dialogReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="status-change-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeStatusDialog();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#187a58]">{dialogReport.id}</p>
                <h3 id="status-change-title" className="mt-1 text-lg font-bold">
                  Change Status
                </h3>
                <p className="mt-1 text-sm text-[#687468] truncate">
                  {dialogReport.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeStatusDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Current Status
                </p>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[dialogReport.status]}`}>
                  {dialogReport.status}
                </span>
              </div>
              {canChangeStatus && (
                <form onSubmit={handleStatusChange} className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                      New Status
                    </p>
                    <select
                      name="status"
                      defaultValue={dialogReport.status}
                      className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                      Notes (optional)
                    </p>
                    <textarea
                      name="notes"
                      rows={3}
                      className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                    ></textarea>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={closeStatusDialog}
                      className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                      disabled={statusDialogLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-[#187a58] rounded-lg hover:bg-[#126448] transition disabled:opacity-50"
                      disabled={statusDialogLoading}
                    >
                      {statusDialogLoading ? "Updating…" : "Change Status"}
                    </button>
                  </div>
                </form>
              )}
              {!canChangeStatus && (
                <div className="rounded-lg border border-[#cbd6c8] bg-[#f0f2f1] p-4">
                  <p className="text-sm text-[#687468]">
                    You do not have permission to change the status of this report.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Work Update / Evidence Upload Dialog */}
      {showWorkUpdateDialog && workUpdateReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="work-update-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeWorkUpdateDialog();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#187a58]">{workUpdateReport.id}</p>
                <h3 id="work-update-title" className="mt-1 text-lg font-bold">
                  Record Work Update
                </h3>
                <p className="mt-1 text-sm text-[#687468] truncate">
                  {workUpdateReport.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeWorkUpdateDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <form onSubmit={handleWorkUpdateSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Work Note
                </p>
                <textarea
                  name="note"
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                  placeholder="Describe the work performed, findings, and next steps…"
                ></textarea>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Status
                </p>
                <select
                  name="status"
                  defaultValue="IN_PROGRESS"
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                >
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="NEEDS_CORRECTION">Needs Correction</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Evidence Image (optional)
                </p>
                <div className="mt-1 space-y-2">
                  <label
                    className="block px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm text-[#687468] hover:bg-[#f5f8f5] cursor-pointer transition"
                    onClick={() => {
                      const input = document.getElementById('work-update-image-input');
                      if (input) input.click();
                    }}
                  >
                    {workUpdateImageUrl ? 'Image attached' : 'Choose image file'}
                    <input
                      id="work-update-image-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target?.files?.[0];
                        if (file) {
                          void handleImageUpload(file);
                        }
                      }}
                    />
                  </label>
                  {workUpdateImageUrl && (
                    <div className="rounded-lg border border-[#187a58] bg-[#e6f3eb] p-3">
                      <img
                        src={workUpdateImageUrl}
                        alt="Evidence preview"
                        className="w-16 h-16 rounded object-cover mb-2"
                      />
                      <p className="text-xs text-[#187a58] truncate">
                        {workUpdateImageUrl.length > 40 ? workUpdateImageUrl.slice(0, 40) + '…' : workUpdateImageUrl}
                      </p>
                      <button
                        type="button"
                        onClick={() => setWorkUpdateImageUrl(null)}
                        className="text-xs text-[#8b392f] hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeWorkUpdateDialog}
                  className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                  disabled={workUpdateDialogLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#187a58] rounded-lg hover:bg-[#126448] transition disabled:opacity-50"
                  disabled={workUpdateDialogLoading}
                >
                  {workUpdateDialogLoading ? "Recording…" : "Record Work Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Escalation Dialog */}
      {showEscalateDialog && escalateReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="escalate-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEscalateDialog();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#8b392f]">{escalateReport.id}</p>
                <h3 id="escalate-title" className="mt-1 text-lg font-bold">
                  Escalate Report
                </h3>
                <p className="mt-1 text-sm text-[#687468] truncate">
                  {escalateReport.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEscalateDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Reason (required)
                </p>
                <textarea
                  name="reason"
                  rows={4}
                  required
                  minLength={5}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#8b392f] bg-white"
                  placeholder="Describe why this report needs escalation…"
                ></textarea>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Priority
                </p>
                <select
                  name="priority"
                  defaultValue="HIGH"
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#8b392f] bg-white"
                >
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEscalateDialog}
                  className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                  disabled={escalateDialogLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#8b392f] rounded-lg hover:bg-[#6b2d1f] transition disabled:opacity-50"
                  disabled={escalateDialogLoading}
                >
                  {escalateDialogLoading ? "Escalating…" : "Escalate Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Dialog */}
      {showAssignDialog && assignReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAssignDialog();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#173c32]">{assignReport.id}</p>
                <h3 id="assign-title" className="mt-1 text-lg font-bold">
                  Assign Report
                </h3>
                <p className="mt-1 text-sm text-[#687468] truncate">
                  {assignReport.title}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAssignDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Assign To Officer
                </p>
                <select
                  name="officerId"
                  required
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                >
                  <option value="">Select an officer…</option>
                  {officersLoading ? (
                    <option disabled>Loading officers…</option>
                  ) : availableOfficers.length === 0 ? (
                    <option disabled>No officers available</option>
                  ) : (
                    availableOfficers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name} ({officer.email})
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Reason (optional)
                </p>
                <textarea
                  name="reason"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                  placeholder="Reason for this assignment…"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeAssignDialog}
                  className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                  disabled={assignDialogLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#187a58] rounded-lg hover:bg-[#126448] transition disabled:opacity-50"
                  disabled={assignDialogLoading || !availableOfficers.length}
                >
                  {assignDialogLoading ? "Assigning…" : "Assign Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Admin: All Users */}
      {(activeLower === "all users" || activeLower === "government users") && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">
                {activeLower === "all users" ? "All Users" : "Government Users"}
              </h3>
              <p className="mt-1 text-sm text-[#687468]">
                Manage platform users and their roles.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateUserDialog(true)}
              className="rounded-lg border border-[#187a58] bg-[#187a58] px-4 py-2 text-sm font-medium text-white hover:bg-[#126448] transition"
            >
              Create User
            </button>
          </div>
          {usersLoading ? (
            <LoadingState message="Loading users…" />
          ) : users.length === 0 ? (
            <EmptyState type="general" title="No users" description="No users found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                    <th className="p-3 font-semibold">Name</th>
                    <th className="p-3 font-semibold">Email</th>
                    <th className="p-3 font-semibold">Role</th>
                    <th className="p-3 font-semibold">Department</th>
                    <th className="p-3 font-semibold">Ward</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                      <td className="p-3">
                        <p className="font-medium text-[#173c32]">{u.name}</p>
                      </td>
                      <td className="p-3 text-[#687468]">{u.email}</td>
                      <td className="p-3 text-[#687468]">{u.role}</td>
                      <td className="p-3 text-[#687468]">{u.departmentId || "—"}</td>
                      <td className="p-3 text-[#687468]">{u.wardId || "—"}</td>
                      <td className="p-3">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${u.isActive ? "bg-[#e6f3eb] text-[#187a58]" : "bg-[#fff3f0] text-[#8b392f]"}`}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => openEditUserDialog(u)}
                          className="rounded-lg border border-[#187a58] px-3 py-2 text-sm font-medium text-[#187a58] transition hover:bg-[#e6f3eb] mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeactivateUser(u.id, u.isActive)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                            u.isActive
                              ? "border-[#dc2626] text-[#dc2626] hover:bg-[#fef2f2]"
                              : "border-[#187a58] text-[#187a58] hover:bg-[#e6f3eb]"
                          }`}
                        >
                          {u.isActive ? "Deactivate" : "Activate"}
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

      {/* Platform Admin: Roles */}
      {activeLower === "roles" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Roles</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Government roles and their jurisdiction levels.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Scope</th>
                  <th className="p-3 font-semibold">Jurisdiction</th>
                  <th className="p-3 font-semibold">Can Change Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { role: "GOVERNOR", scope: "county", jurisdiction: "Kisii County", canChangeStatus: true },
                  { role: "CECM", scope: "department", jurisdiction: "Assigned department", canChangeStatus: true },
                  { role: "CHIEF_OFFICER", scope: "department", jurisdiction: "Assigned department", canChangeStatus: true },
                  { role: "TECHNICAL_HEAD", scope: "department", jurisdiction: "Assigned department", canChangeStatus: true },
                  { role: "TECHNICAL_SUPERVISOR", scope: "ward", jurisdiction: "Assigned ward + department", canChangeStatus: true },
                  { role: "SUBCOUNTY_ADMIN", scope: "subcounty", jurisdiction: "Assigned sub-county", canChangeStatus: false },
                  { role: "WARD_ADMIN", scope: "ward", jurisdiction: "Assigned ward", canChangeStatus: false },
                  { role: "FIELD_OFFICER", scope: "none", jurisdiction: "Personally assigned cases", canChangeStatus: true },
                  { role: "OFFICER", scope: "none", jurisdiction: "Assigned ward", canChangeStatus: true },
                  { role: "DISASTER_MANAGER", scope: "department", jurisdiction: "Disaster Management department", canChangeStatus: true },
                  { role: "ENFORCEMENT_OFFICER", scope: "department", jurisdiction: "Enforcement department", canChangeStatus: true },
                  { role: "DEPARTMENTAL_ADMIN", scope: "department", jurisdiction: "Assigned department", canChangeStatus: false },
                  { role: "ADMIN", scope: "system", jurisdiction: "Platform-wide", canChangeStatus: true },
                  { role: "SUPER_ADMIN", scope: "system", jurisdiction: "Platform-wide", canChangeStatus: true },
                ].map((r) => (
                  <tr key={r.role} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3 font-medium text-[#173c32]">{r.role}</td>
                    <td className="p-3 text-[#687468]">{r.scope}</td>
                    <td className="p-3 text-[#687468]">{r.jurisdiction}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${r.canChangeStatus ? "bg-[#e6f3eb] text-[#187a58]" : "bg-[#f0ebd9] text-[#66572f]"}`}>
                        {r.canChangeStatus ? "Yes" : "Monitor only"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Platform Admin: Permissions */}
      {activeLower === "permissions" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Permissions</h3>
              <p className="mt-1 text-sm text-[#687468]">
                Role-based action permissions and restrictions.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#687468]">
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">Allowed Roles</th>
                  <th className="p-3 font-semibold">Restricted Roles</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    action: "View reports",
                    allowed: "All government roles",
                    restricted: "CITIZEN (own reports only)",
                  },
                  {
                    action: "Change report status",
                    allowed: "All except WARD_ADMIN, SUBCOUNTY_ADMIN, DEPARTMENTAL_ADMIN",
                    restricted: "WARD_ADMIN, SUBCOUNTY_ADMIN, DEPARTMENTAL_ADMIN (monitor only)",
                  },
                  {
                    action: "Assign reports",
                    allowed: "CHIEF_OFFICER, TECHNICAL_HEAD, CECM, GOVERNOR, ADMIN, SUPER_ADMIN",
                    restricted: "All other roles",
                  },
                  {
                    action: "Escalate reports",
                    allowed: "All government roles",
                    restricted: "None",
                  },
                  {
                    action: "User management",
                    allowed: "ADMIN, SUPER_ADMIN",
                    restricted: "All other roles",
                  },
                  {
                    action: "System configuration",
                    allowed: "ADMIN, SUPER_ADMIN",
                    restricted: "All other roles",
                  },
                ].map((p, i) => (
                  <tr key={i} className="border-b border-[#dce2d8] hover:bg-[#f5f8f5]">
                    <td className="p-3 font-medium text-[#173c32]">{p.action}</td>
                    <td className="p-3 text-[#687468]">{p.allowed}</td>
                    <td className="p-3 text-[#687468]">{p.restricted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Platform Admin: Audit Logs */}
      {activeLower === "audit logs" && (
        <section className="rounded-xl border border-[#dce2d8] bg-[#fdfdf9] p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-[#173c32]">Audit Logs</h3>
              <p className="mt-1 text-sm text-[#687468]">
                System audit trail of administrative actions.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-[#dce2d8] p-6">
            <p className="text-sm text-[#687468]">
              Audit log entries are recorded server-side for status changes,
              escalations, assignments, and user management actions. View the
              full audit trail in the system audit logs.
            </p>
          </div>
        </section>
      )}

      {/* Platform Admin: Create User Dialog */}
      {showCreateUserDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-user-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateUserDialog(false);
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 id="create-user-title" className="text-lg font-bold text-[#173c32]">
                  Create User
                </h3>
                <p className="mt-1 text-sm text-[#687468]">
                  Create a new government platform account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserDialog(false)}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Full Name
                </p>
                <input
                  name="name"
                  required
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Email
                </p>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Password
                </p>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Role
                </p>
                <select
                  name="role"
                  defaultValue="OFFICER"
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                >
                  <option value="OFFICER">Government Officer</option>
                  <option value="FIELD_OFFICER">Field Officer</option>
                  <option value="TECHNICAL_SUPERVISOR">Technical Supervisor</option>
                  <option value="TECHNICAL_HEAD">Technical Head</option>
                  <option value="CHIEF_OFFICER">Chief Officer</option>
                  <option value="CECM">CECM</option>
                  <option value="GOVERNOR">Governor</option>
                  <option value="WARD_ADMIN">Ward Administrator</option>
                  <option value="SUBCOUNTY_ADMIN">Sub-County Administrator</option>
                  <option value="DISASTER_MANAGER">Disaster Manager</option>
                  <option value="ENFORCEMENT_OFFICER">Enforcement Officer</option>
                  <option value="DEPARTMENTAL_ADMIN">Departmental Admin</option>
                  <option value="ADMIN">Administrator</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Department ID (optional)
                </p>
                <input
                  name="departmentId"
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateUserDialog(false)}
                  className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                  disabled={userDialogLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#187a58] rounded-lg hover:bg-[#126448] transition disabled:opacity-50"
                  disabled={userDialogLoading}
                >
                  {userDialogLoading ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Platform Admin: Edit User Dialog */}
      {showEditUserDialog && editUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditUserDialog();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 id="edit-user-title" className="text-lg font-bold text-[#173c32]">
                  Edit User
                </h3>
                <p className="mt-1 text-sm text-[#687468]">{editUser.email}</p>
              </div>
              <button
                type="button"
                onClick={closeEditUserDialog}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-[#687468] hover:bg-[#f5f8f5] transition"
              >
                <span className="text-[20px]">✕</span>
              </button>
            </div>
            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Full Name
                </p>
                <input
                  name="name"
                  defaultValue={editUser.name}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Phone
                </p>
                <input
                  name="phone"
                  defaultValue={editUser.phone || ""}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  County
                </p>
                <input
                  name="county"
                  defaultValue={editUser.county || ""}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Sub-County
                </p>
                <input
                  name="subCounty"
                  defaultValue={editUser.subCounty || ""}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Ward
                </p>
                <input
                  name="ward"
                  defaultValue={editUser.ward || ""}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Department ID
                </p>
                <input
                  name="departmentId"
                  defaultValue={editUser.departmentId || ""}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#687468] uppercase tracking-wider">
                  Active Status
                </p>
                <select
                  name="isActive"
                  defaultValue={editUser.isActive ? "true" : "false"}
                  className="w-full px-3 py-2 border border-[#cbd6c8] rounded-lg text-sm focus:outline-none focus:border-[#187a58] bg-white"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditUserDialog}
                  className="px-4 py-2 text-sm font-medium text-[#687468] border border-[#cbd6c8] rounded-lg hover:bg-[#f5f8f5] transition disabled:opacity-50"
                  disabled={userDialogLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#187a58] rounded-lg hover:bg-[#126448] transition disabled:opacity-50"
                  disabled={userDialogLoading}
                >
                  {userDialogLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
