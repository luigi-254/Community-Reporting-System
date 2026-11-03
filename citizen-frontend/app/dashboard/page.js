"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLogo from "../components/BrandLogo";
import DashboardLayout from "./components/DashboardLayout";
import Overview from "./components/Overview";
import ReportForm from "./components/ReportForm";
import MyReports from "./components/MyReports";
import Profile from "./components/Profile";
import ProfilePill from './components/ProfilePill';
import {
  ArrowRight,
  Bell,
  LayoutDashboard,
  CirclePlus,
  ClipboardList,
  UserRound,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  LogOut,
} from "lucide-react";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Report an Issue", icon: CirclePlus },
  { name: "My Reports", icon: ClipboardList },
  { name: "My Profile", icon: UserRound },
];

export default function CitizenDashboard() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [activePage, setActivePage] = useState("Overview");
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const router = useRouter();

  // Restore session on load
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const savedToken = window.localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setSessionReady(true);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` },
          cache: "no-store",
        });
        if (!response.ok) {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }
        const result = await response.json().catch(() => ({}));
        const currentUser = result?.data?.user;
        if (!currentUser) {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }
        const normalizedRole = String(currentUser.role || "")
          .trim()
          .toUpperCase()
          .replace(/[\s-]+/g, "_");
        if (normalizedRole !== "CITIZEN") {
          window.localStorage.removeItem(TOKEN_KEY);
          setSessionReady(true);
          return;
        }
        if (!cancelled) {
          setToken(savedToken);
          setUser(currentUser);
        }
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
      } finally {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    }
    restoreSession();
    return () => { cancelled = true; };
  }, []);

  // Fetch notifications when token available
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function fetchNotifications() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/notifications?page=1&limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const items = Array.isArray(data?.data?.notifications) ? data.data.notifications : [];
        if (!cancelled) setNotifications(items);
      } catch {}
    }
    fetchNotifications();
    return () => { cancelled = true; };
  }, [token]);

  // Refresh reports when token changes
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function refreshReports() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/reports/me?page=1&limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        const raw = Array.isArray(data?.data?.reports) ? data.data.reports : [];
        if (!cancelled) setReports(raw);
      } catch {}
    }
    refreshReports();
    return () => { cancelled = true; };
  }, [token]);

  if (!sessionReady) return null;

  if (!token || !user) {
    const redirectTo = window.location.pathname;
    router.replace(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } catch {}
    window.localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setUser(null);
    setReports([]);
    router.replace("/");
  };

  const navigateTo = (page) => {
    setMobileMenuOpen(false);
    setActivePage(page);
  };

  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Initials for avatar
  const initials = String(user?.name || "C")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function markNotificationAsRead(notificationId) {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      setNotifications((current) =>
        current.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch {}
  }

  async function markAllNotificationsAsRead() {
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        cache: "no-store",
      });
      setNotifications((current) =>
        current.map((n) => ({ ...n, isRead: true }))
      );
    } catch {}
  }

  const sidebarWidth = sidebarCollapsed ? "w-16" : "w-64";
  const mainContentMargin = sidebarCollapsed ? "lg:ml-16" : "lg:ml-64";

  return (
    <DashboardLayout token={token} user={user} onLogout={handleLogout}>
      <div className={`min-h-screen bg-[#f7f7f2] text-[#243329] transition-all duration-300`}>
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
                  Citizen Portal
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
            <nav aria-label="Citizen navigation" className="space-y-0.5">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => navigateTo(item.name)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center ${sidebarCollapsed ? "justify-center gap-3" : "justify-start gap-3"} w-full ${sidebarCollapsed ? "px-3" : "px-5"} py-3 text-sm transition-colors rounded-lg ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-[#d5dfd2] hover:bg-white/5 hover:text-white"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-[#c4d3bf]"}`} />
                    {!sidebarCollapsed && (
                      <span className="flex-1">{item.name}</span>
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
                      {user.name || user.email}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#d1d5db] leading-none truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
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
                <p className="text-xs font-medium text-[#788277] leading-none">Citizen workspace</p>
                <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[#173c32] leading-none">
                  {activePage}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className="relative p-1.5 rounded-lg text-[#687468] hover:bg-[#f5f8f5] hover:text-[#244637] transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2 w-2 items-center justify-center rounded-full bg-[#187a58] text-white text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
              <ProfilePill user={user} onLogout={handleLogout} onProfileClick={() => navigateTo("My Profile")} onHelpClick={() => navigateTo("Overview")} />
            </div>
          </header>

          {notificationsOpen && (
            <div
              className="absolute right-0 mt-2 w-80 border border-[#dce2d8] bg-[#fdfdf9] rounded-xl shadow-lg z-50"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-[#dce2d8]">
                <h3 className="text-sm font-semibold text-[#173c32]">Notifications</h3>
                <p className="mt-1 text-xs text-[#687468]">
                  {unreadCount} unread
                </p>
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-[#687468]">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-[#e5e9e1] max-h-[400px] overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        if (!notification.isRead) {
                          void markNotificationAsRead(notification.id);
                        }
                        setNotificationsOpen(false);
                      }}
                      className={`px-4 py-3 hover:bg-[#f5f8f5] cursor-pointer transition ${!notification.isRead ? "bg-[#e8eee3]" : ""}`}
                    >
                      <p className="text-sm font-medium text-[#243329]">
                        {notification.title || "Notification"}
                      </p>
                      <p className="mt-1 text-xs text-[#687468]">
                        {notification.message || ""}
                      </p>
                      <p className="mt-1 text-[10px] text-[#7a8378]">
                        {new Date(notification.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-4 py-3 border-t border-[#dce2d8]">
                <button
                  type="button"
                  className="w-full text-xs font-semibold text-[#187a58] hover:underline"
                  onClick={() => {
                    void markAllNotificationsAsRead();
                    setNotificationsOpen(false);
                  }}
                >
                  Mark all as read
                </button>
                <button
                  type="button"
                  className="w-full text-xs font-semibold text-[#687468] hover:underline mt-2"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 sm:py-6">
            {activePage === "Overview" && (
              <Overview token={token} user={user} onReportClick={(page) => navigateTo(page)} />
            )}
            {activePage === "Report an Issue" && (
              <ReportForm token={token} onSubmitSuccess={() => {
                setActivePage("My Reports");
              }} />
            )}
            {activePage === "My Reports" && (
              <MyReports token={token} />
            )}
            {activePage === "My Profile" && (
              <Profile token={token} user={user} reports={reports} onLogout={handleLogout} />
            )}
          </div>

          <footer className="border-t border-[#dce2d8] bg-[#fdfdf9] px-4 sm:px-6 py-3 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#7a8378]">
              <p>Community Reporting System</p>
              <p>Citizen Portal</p>
            </div>
          </footer>
        </div>
      </div>
    </DashboardLayout>
  );
}
