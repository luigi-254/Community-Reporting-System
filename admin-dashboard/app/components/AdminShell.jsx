"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
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
import AdminProfilePill from "./AdminProfilePill";
import { useAuth } from "../../lib/auth-context";

const ADMIN_NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Users", href: "/users", icon: Users },
  { name: "Statistics", href: "/statistics", icon: BarChart3 },
  { name: "Audit Logs", href: "/audit-logs", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

const PAGE_TITLES = {
  Dashboard: "Dashboard",
  Reports: "Community Reports",
  Users: "Government Officer Management",
  Statistics: "Statistics & Analytics",
  "Audit Logs": "Audit Logs",
  Settings: "Settings",
};

export function AdminShell({ user, children, pageTitle }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine the active page from the current URL pathname.
  const activePage = useMemo(() => {
    const match = ADMIN_NAV_ITEMS.find((item) => pathname === item.href);
    return match ? match.name : "Dashboard";
  }, [pathname]);

  const resolvedPageTitle = pageTitle || PAGE_TITLES[activePage] || activePage;

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const initials = String(user && user.name ? user.name : "C")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainContentMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

  const handleNavClick = (href) => {
    router.push(href);
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
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleNavClick(item.href)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-3 w-full ${sidebarCollapsed ? "px-3 justify-center" : "px-5 justify-start"} py-3 text-sm transition-colors rounded-lg ${isActive ? "bg-white/10 text-white" : "text-[#d5dfd2] hover:bg-white/5 hover:text-white"}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#c4d3bf]"}`} />
                  {!sidebarCollapsed && (
                    <span className={`truncate ${isActive ? "text-white" : "text-[#d5dfd2]"}`}>
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
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight text-white">
                    {user && user.name ? user.name : user && user.email ? user.email : ""}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#d1d5db] leading-none truncate">
                    {user && user.email ? user.email : ""}
                  </p>
                  <p className="mt-0.5 text-[9px] text-[#bdcdbd] leading-none truncate uppercase">
                    {user && user.role ? String(user.role).replace(/_/g, " ") : ""}
                  </p>
                </div>
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
              </>
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
                {resolvedPageTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminProfilePill user={user} onProfileClick={() => router.push("/")} />
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

export function ReportDetailsDialog({ report, onClose }) {
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
        <h4 className="mb-5 text-lg font-semibold">{report.issue}</h4>
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
            <p className="text-sm text-[#687468]">Reported By</p>
            <p className="mt-1 font-medium">{report.reportedBy}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Date Submitted</p>
            <p className="mt-1 font-medium">{report.date}</p>
          </div>
          <div>
            <p className="text-sm text-[#687468]">Current Status</p>
            <span className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold border border-[#cbd6c8] text-[#687468]">
              {report.status}
            </span>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold text-[#687468]">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-[#687468]">{report.description}</p>
        </div>
      </div>
    </div>
  );
}
