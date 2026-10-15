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

  const resolutionRate =
    totalReports === 0
      ? 0
      : Math.round((resolvedReports / totalReports) * 100);

  const categoryCounts = reportList.reduce((counts, report) => {
    const category = report.category || "Other";
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  const recentReports = [...reportList].slice(-5).reverse();


  const handleNavigation = (page) => {
    setActivePage(page);

    if (page === "Dashboard") {
      return;
    }

    if (page === "Reports") {
      router.push("/reports");
      return;
    }

    if (page === "Users") {
      router.push("/users");
      return;
    }

    if (page === "Statistics") {
      router.push("/statistics");
      return;
    }

    if (page === "Settings") {
      router.push("/settings");
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white min-h-screen p-6">
        <div className="mb-10">
          <h1 className="text-xl font-bold">Community Reports</h1>
          <p className="text-sm text-gray-400 mt-1">Admin Panel</p>
        </div>

        <nav className="space-y-2">
          {[
            "Dashboard",
            "Reports",
            "Users",
            "Statistics",
            "Settings",
          ].map((item) => (
            <button
              key={item}
              onClick={() => handleNavigation(item)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium ${
                activePage === item
                  ? "bg-white text-gray-900"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-10 border-t border-gray-700 pt-6">
          <button
            className="w-full text-left px-4 py-3 rounded-lg text-sm text-gray-300 hover:bg-gray-800"
            onClick={() => alert("Logout functionality will be added later.")}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Admin Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">
                Community issue reporting management system
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-gray-500">Government Officer</p>
            </div>
          </div>
        </header>

        <div className="p-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Total Reports</p>
              <p className="text-3xl font-bold mt-2">{totalReports}</p>
              <p className="text-xs text-gray-500 mt-2">
                All community reports
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {pendingReports}
              </p>
              <p className="text-xs text-gray-500 mt-2">Awaiting action</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {inProgressReports}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Currently being handled
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {resolvedReports}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Successfully resolved
              </p>
            </div>
          </div>

{/* Resolution Progress */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-bold">Resolution Progress</h3>
      <span className="text-2xl font-bold text-green-600">
        {resolutionRate}%
      </span>
    </div>

    <p className="text-sm text-gray-500 mt-2">
      Percentage of community reports resolved
    </p>

    <div
      className="w-full h-3 bg-gray-100 rounded-full mt-5 overflow-hidden"
      role="progressbar"
      aria-label="Report resolution rate"
      aria-valuenow={resolutionRate}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-green-600 rounded-full transition-all"
        style={{ width: `${resolutionRate}%` }}
      />
    </div>

    <p className="text-sm text-gray-600 mt-3">
      {resolvedReports} of {totalReports} reports resolved
    </p>
  </div>

  <div className="bg-white rounded-xl border border-gray-200 p-6">
    <h3 className="text-lg font-bold">Reports by Category</h3>
    <p className="text-sm text-gray-500 mt-2">
      Breakdown of reported community issues
    </p>

    <div className="space-y-4 mt-5">
      {Object.entries(categoryCounts).map(([category, count]) => (
        <div key={category}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{category}</span>
            <span className="font-semibold">{count}</span>
          </div>

          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{
                width: `${totalReports ? (count / totalReports) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ))}

      {Object.keys(categoryCounts).length === 0 && (
        <p className="text-sm text-gray-500">No reports available yet.</p>
      )}
    </div>
  </div>
</div>

          {/* Recent Reports */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Recent Reports</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Latest issues submitted by citizens
                </p>
              </div>

              <button
                onClick={() => handleNavigation("Reports")}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
              >
                View All Reports
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-4 font-semibold">
                      Report ID
                    </th>
                    <th className="text-left px-6 py-4 font-semibold">
                      Issue
                    </th>
                    <th className="text-left px-6 py-4 font-semibold">
                      Location
                    </th>
                    <th className="text-left px-6 py-4 font-semibold">
                      Status
                    </th>
                    <th className="text-left px-6 py-4 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {recentReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium">{report.id}</td>
                      <td className="px-6 py-4">{report.issue}</td>
                      <td className="px-6 py-4 text-gray-600">
                        {report.location}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            report.status === "Pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : report.status === "In Progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {report.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}