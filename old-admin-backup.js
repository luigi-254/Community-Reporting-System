
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reports } from "../data/reports";

export default function AdminDashboard() {
  const router = useRouter();
  const [activePage, setActivePage] = useState("Dashboard");

  const reportList = Array.isArray(reports) ? reports : [];

  const totalReports = reportList.length;
  const pendingReports = reportList.filter(
    (report) => report.status === "Pending"
  ).length;
  const inProgressReports = reportList.filter(
    (report) => report.status === "In Progress"
  ).length;
  const resolvedReports = reportList.filter(
    (report) => report.status === "Resolved"
  ).length;

  const resolutionRate = totalReports
    ? Math.round((resolvedReports / totalReports) * 100)
    : 0;

  const categoryCounts = reportList.reduce((counts, report) => {
    const category = report.category || "Other";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  const recentReports = [...reportList].slice(-5).reverse();

  const navigation = [
    { label: "Dashboard", path: "/" },
    { label: "Reports", path: "/reports" },
    { label: "Government Dashboard", path: "/government" },
    { label: "Users", path: "/users" },
    { label: "Statistics", path: "/statistics" },
    { label: "Settings", path: "/settings" },
  ];

  function handleNavigation(item) {
    setActivePage(item.label);

    if (item.path !== "/") {
      router.push(item.path);
    }
  }

  const statCards = [
    {
      title: "Total Reports",
      value: totalReports,
      description: "All community reports",
      color: "text-gray-900",
      icon: "▤",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      title: "Pending",
      value: pendingReports,
      description: "Awaiting action",
      color: "text-amber-600",
      icon: "◷",
      iconBg: "bg-amber-50 text-amber-600",
    },
    {
      title: "In Progress",
      value: inProgressReports,
      description: "Currently being handled",
      color: "text-blue-600",
      icon: "↻",
      iconBg: "bg-blue-50 text-blue-600",
    },
    {
      title: "Resolved",
      value: resolvedReports,
      description: "Successfully resolved",
      color: "text-green-600",
      icon: "✓",
      iconBg: "bg-green-50 text-green-600",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 p-5 text-white md:flex md:flex-col">
        <div className="mb-9 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
            M
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Mtaa<span className="text-blue-400">Fix</span>
            </h1>
            <p className="text-xs text-gray-400">Community Reports</p>
          </div>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Main Menu
        </p>

        <nav className="space-y-1">
          {navigation.map((item, index) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${
                activePage === item.label
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-base">
                {["⌂", "▤", "▦", "♙", "▥", "⚙"][index]}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-slate-700 pt-5">
          <div className="mb-4 rounded-xl bg-slate-800 p-4">
            <p className="text-sm font-semibold text-blue-300">
              Community first
            </p>
            <p className="mt-1 text-xs leading-5 text-gray-400">
              Monitor local issues and help communities get them resolved.
            </p>
          </div>

          <button
            onClick={() => alert("Logout functionality will be added later.")}
            className="w-full rounded-xl px-3 py-3 text-left text-sm font-medium text-gray-300 hover:bg-slate-800 hover:text-red-400"
          >
            ↪ &nbsp; Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900 px-5 py-4 text-white md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-blue-400">
                COMMUNITY ISSUE MANAGEMENT
              </p>
              <h2 className="mt-1 text-xl font-bold md:text-2xl">
                Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                Manage and monitor community reports.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">Administrator</p>
                <p className="text-xs text-gray-400">Admin Panel</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
                A
              </div>
            </div>
          </div>

          {/* Mobile navigation */}
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {navigation.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavigation(item)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-medium ${
                  activePage === item.label
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-gray-300"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <div className="p-5 md:p-8">
          {/* Welcome */}
          <section className="mb-7 rounded-2xl bg-blue-600 p-6 text-white shadow-sm md:p-8">
            <p className="text-sm font-medium text-blue-50">
              Welcome to Mtaa Fix
            </p>
            <h3 className="mt-2 text-2xl font-bold md:text-3xl">
              Let&apos;s improve our communities.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
              Monitor reported issues, follow their progress and review
              community resolution performance from one place.
            </p>

            <button
              onClick={() => handleNavigation(navigation[1])}
              className="mt-5 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              Manage Reports →
            </button>
          </section>

          {/* Statistics Cards */}
          <section className="mb-8">
            <div className="mb-4">
              <h3 className="text-lg font-bold">Reports Overview</h3>
              <p className="mt-1 text-sm text-gray-500">
                Current summary of community issues.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">
                      {card.title}
                    </p>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${card.iconBg}`}
                    >
                      {card.icon}
                    </span>
                  </div>

                  <p className={`mt-4 text-3xl font-bold ${card.color}`}>
                    {card.value}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Progress and Categories */}
          <section className="mb-8 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold">Resolution Progress</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Percentage of reports marked as resolved.
                  </p>
                </div>

                <span className="rounded-xl bg-blue-50 px-3 py-2 text-xl font-bold text-blue-600">
                  {resolutionRate}%
                </span>
              </div>

              <div
                className="mt-7 h-3 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="Report resolution rate"
                aria-valuenow={resolutionRate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">Resolved reports</span>
                <span className="font-semibold">
                  {resolvedReports} of {totalReports}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-gray-100 pt-5">
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="mt-1 font-bold text-amber-600">
                    {pendingReports}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">In progress</p>
                  <p className="mt-1 font-bold text-blue-600">
                    {inProgressReports}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Resolved</p>
                  <p className="mt-1 font-bold text-green-600">
                    {resolvedReports}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Reports by Category</h3>
              <p className="mt-1 text-sm text-gray-500">
                Distribution of reported community issues.
              </p>

              <div className="mt-6 space-y-5">
                {Object.entries(categoryCounts).map(([category, count]) => {
                  const percentage = totalReports
                    ? Math.round((count / totalReports) * 100)
                    : 0;

                  return (
                    <div key={category}>
                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-700">
                          {category}
                        </span>
                        <span className="text-gray-500">
                          {count} ({percentage}%)
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {Object.keys(categoryCounts).length === 0 && (
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                    No reports are available yet.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Recent Reports */}
          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5 md:p-6">
              <div>
                <h3 className="text-lg font-bold">Recent Reports</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Latest issues submitted by citizens.
                </p>
              </div>

              <button
                onClick={() => handleNavigation(navigation[1])}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                View All Reports →
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Report ID</th>
                    <th className="px-5 py-4 font-semibold">Issue</th>
                    <th className="px-5 py-4 font-semibold">Location</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Date</th>
                  </tr>
                </thead>

                <tbody>
                  {recentReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-t border-gray-100 transition hover:bg-blue-50/40"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-gray-700">
                        {report.id}
                      </td>
                      <td className="px-5 py-4 font-medium">{report.issue}</td>
                      <td className="px-5 py-4 text-gray-500">
                        {report.location}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            report.status === "Pending"
                              ? "bg-amber-50 text-amber-700"
                              : report.status === "In Progress"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {report.date}
                      </td>
                    </tr>
                  ))}

                  {recentReports.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-12 text-center text-gray-500"
                      >
                        No community reports have been submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-gray-400">
            Mtaa Fix · Community Issue Reporting System
          </p>
        </div>
      </main>
    </div>
  );
}
