"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  Bell,
  User,
  ChevronDown,
  X,
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { useAuth } from "../lib/auth-context";
import { apiFetch } from "../lib/api";
import {
  getRoleConfig,
  getRoleRoute,
  getIconForItem,
  getDepartmentLabel,
} from "../lib/roles-config";
import { StatCard, EmptyState, ErrorState, LoadingState } from "./index";
import StatusBadge from "./StatusBadge";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

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

type SidebarItem = {
  label: string;
  href?: string;
  action?: () => void;
};

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-[#e6ece3] text-[#31543a] border-[#cddbd1]",
  PENDING: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  UNDER_REVIEW: "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  IN_PROGRESS: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  RESOLVED: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  REJECTED: "bg-[#fff3f0] text-[#8b392f] border-[#f1c9c2]",
  ESCALATED: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  CLOSED: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  REOPENED: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  CANCELLED: "bg-[#f2e2dc] text-[#7d4435] border-[#e5d5cf]",
  DUPLICATE: "bg-[#e8eee9] text-[#687468] border-[#d1d9d3]",
};

function normalizeStatus(value: unknown): string {
  const status = String(value || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return status;
}

export function GovernmentShell({
  user,
  roleConfig,
  children,
  pageTitle,
  activeItem,
  onNavItemClick,
}: {
  user: DashboardUser | null;
  roleConfig: any;
  children: React.ReactNode;
  pageTitle?: string;
  activeItem?: string;
  onNavItemClick?: (item: string) => void;
}) {
  const { logout, sessionVersion } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalActiveItem, setInternalActiveItem] = useState<string>(
    roleConfig.defaultPage
  );
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Resolve the active item: controlled prop > URL query param > default.
  const resolvedActiveItem = useMemo(() => {
    if (activeItem !== undefined) return activeItem;
    const urlTab = searchParams.get("tab");
    if (urlTab && roleConfig.sidebar.some((g: any) => g.items.includes(urlTab))) {
      return urlTab;
    }
    return internalActiveItem;
  }, [activeItem, searchParams, roleConfig]);

  // Sync URL query param when the active item changes.
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (resolvedActiveItem && resolvedActiveItem !== roleConfig.defaultPage && tab !== resolvedActiveItem) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", resolvedActiveItem);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [resolvedActiveItem, searchParams, router, pathname, roleConfig]);

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const handleNavItem = (item: string) => {
    setInternalActiveItem(item);
    if (onNavItemClick) {
      onNavItemClick(item);
    } else {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", item);
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const initials = String(user?.name || "C")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainContentMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const payload = await apiFetch("/api/notifications", { cache: "no-store" });
      const items = payload?.data?.notifications ?? payload?.notifications ?? payload ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((n: any) => !n.isRead).length);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  }, [sessionVersion]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const iconMap: Record<string, any> = {
    Dashboard: LayoutDashboard,
    Reports: FileText,
    Users: Users,
    Statistics: BarChart3,
    Settings: Settings,
    Notifications: Bell,
    "My Profile": User,
  };

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329] transition-all duration-300">
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
                Government Portal
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
          <nav aria-label="Government navigation" className="space-y-0.5">
            {roleConfig.sidebar.map((group: any) => (
              <div key={group.group} className="mb-4">
                {!sidebarCollapsed && (
                  <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#bdcdbd]">
                    {group.group}
                  </p>
                )}
                {group.items.map((item: string) => {
                  const Icon = iconMap[item] || LayoutDashboard;
                  const isActive = resolvedActiveItem === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleNavItem(item)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-3 w-full ${sidebarCollapsed ? "px-3 justify-center" : "px-5 justify-start"} py-3 text-sm transition-colors rounded-lg ${isActive ? "bg-white/10 text-white" : "text-[#d5dfd2] hover:bg-white/5 hover:text-white"}`}
                      title={sidebarCollapsed ? item : undefined}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#c4d3bf]"}`} />
                      {!sidebarCollapsed && (
                        <span className={`truncate ${isActive ? "text-white" : "text-[#d5dfd2]"}`}>
                          {item}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto border-t border-white/15 p-4 pb-6">
          <div className={`flex flex-col items-center gap-2 px-3 py-3 ${!sidebarCollapsed ? "flex-row justify-between items-center gap-3 px-3 py-2" : ""}`}>
            <div className="flex size-8 items-center justify-center rounded-full bg-[#dce5d8] text-[#244637] text-xs font-semibold flex-shrink-0">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight text-white">
                    {user?.name || user?.email}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#d1d5db] leading-none truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="relative inline-block">
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                    }}
                    className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors flex-shrink-0"
                    aria-label="Sign out"
                  >
                    <LogOut className="w-4 h-4 text-[#c4d3bf]" aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div
        id="main-content"
        className={`min-h-screen min-w-0 transition-all duration-300 ${mainContentMargin}`}
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
              <p className="text-xs font-medium text-[#788277] leading-none">Government workspace</p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[#173c32] leading-none">
                {pageTitle || resolvedActiveItem}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={notificationsLoading}
              className="relative rounded-lg border border-[#cbd6c8] bg-white px-4 py-2 text-sm font-medium transition hover:bg-[#f5f8f5] disabled:opacity-60"
            >
              <Bell className="w-4 h-4 mr-2" aria-hidden="true" />
              Notifications
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8b392f] text-[10px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <div className="relative inline-block">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-gray-200 hover:bg-gray-50 px-3 py-1.5 transition-colors"
                aria-label="User profile"
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-[#dce5d8] text-[#244637] text-xs font-semibold">
                  {initials}
                </div>
                <p className="text-sm font-medium text-[#173c32] truncate">
                  {user?.name || "Officer"}
                </p>
                <ChevronDown className="w-4 h-4 text-[#687468]" />
              </button>
              <div className="absolute right-0 mt-2 w-64 border border-[#dce2d8] bg-white rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#e5e7e5]">
                  <p className="text-sm font-semibold text-[#173c32]">
                    {user?.name || "Officer"}
                  </p>
                  <p className="text-xs text-[#687468] truncate">
                    {user?.email || ""}
                  </p>
                  <p className="mt-1 text-[10px] text-[#687468] capitalize truncate">
                    {user?.role} • {getDepartmentLabel(user?.departmentId)}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#173c32] hover:bg-[#f5f8f5] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#c4d3bf]" />
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void logout();
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-[#dc2626]" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export function ReportDetailsDialog({
  report,
  onClose,
  user,
  roleConfig,
}: {
  report: any;
  onClose: () => void;
  user: DashboardUser | null;
  roleConfig: any;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(true);
  }, [report]);

  if (!open || !report) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-details-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#187a58]">{report.id}</p>
            <h3 id="report-details-title" className="mt-1 text-2xl font-bold">
              Report Details
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onClose();
            }}
            aria-label="Close report details"
            className="rounded-lg px-3 py-2 text-2xl text-[#687468] hover:bg-[#f5f8f5]"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
        <h4 className="mb-5 text-lg font-semibold">{report.title}</h4>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[#687468]">Category</p>
            <p className="mt-1 font-medium">{report.category}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Location</p>
            <p className="mt-1 font-medium">{report.location}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Assigned Department</p>
            <p className="mt-1 font-medium">{report.department}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Date Reported</p>
            <p className="mt-1 font-medium">{report.date}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Priority</p>
            <p className="mt-1 font-medium capitalize">{report.priority}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Current Status</p>
            <span className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[normalizeStatus(report.status)]}`}>
              {report.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-[#687468]">GPS Coordinates</p>
            <p className="mt-1 break-words font-mono text-xs">
              {report.latitude !== null && report.longitude !== null ? `${report.latitude}, ${report.longitude}` : "No coordinates saved for this report"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Ward</p>
            <p className="mt-1 font-medium">{report.ward || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Sub-County</p>
            <p className="mt-1 font-medium">{report.subCounty || "—"}</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#687468]">Description</p>
          <p className="mt-1 text-[#243329] whitespace-pre-wrap">{report.description}</p>
        </div>
        {report.mediaUrls && report.mediaUrls.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-[#687468]">Evidence</p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {report.mediaUrls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url.startsWith("http") ? url : `${API_URL}${url.startsWith("/") ? url : "/" + url}`}
                  alt={`Evidence ${index + 1}`}
                  className="rounded-lg border border-[#cbd6c8] w-32 h-24 object-cover"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
