
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import GovernmentMapLoader from "../../components/GovernmentMapLoader";

type ReportStatus = "Pending" | "In Progress" | "Resolved";

type Report = {
  id: string;
  title: string;
  category: string;
  location: string;
  department: string;
  date: string;
  status: ReportStatus;
};

const STORAGE_KEY = "community-reporting-reports";

const initialReports: Report[] = [
  {
    id: "RPT-001",
    title: "Pothole on main road",
    category: "Roads",
    location: "Kisii Town",
    department: "Public Works",
    date: "2026-10-10",
    status: "Pending",
  },
  {
    id: "RPT-002",
    title: "Blocked drainage",
    category: "Drainage",
    location: "Daraja Mbili",
    department: "Water and Sanitation",
    date: "2026-10-11",
    status: "In Progress",
  },
  {
    id: "RPT-003",
    title: "Broken streetlight",
    category: "Street Lighting",
    location: "Kisii CBD",
    department: "Public Works",
    date: "2026-10-12",
    status: "Pending",
  },
  {
    id: "RPT-004",
    title: "Uncollected waste",
    category: "Waste Management",
    location: "Nyanchwa",
    department: "Environment",
    date: "2026-10-12",
    status: "Resolved",
  },
  {
    id: "RPT-005",
    title: "Leaking water pipe",
    category: "Water",
    location: "Jogoo",
    department: "Water and Sanitation",
    date: "2026-10-13",
    status: "In Progress",
  },
  {
    id: "RPT-006",
    title: "Damaged public facility",
    category: "Public Facilities",
    location: "Kisii Town",
    department: "Public Works",
    date: "2026-10-14",
    status: "Pending",
  },
];

const menuItems = [
  "Dashboard",
  "Reports",
  "GIS Map",
  "Departments",
  "Statistics",
];

const statusStyles: Record<ReportStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
};

function readSavedReports(): Report[] | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return null;
    }

    const parsed: unknown = JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed as Report[];
  } catch (error) {
    console.error("Could not load saved reports:", error);
    return null;
  }
}

export default function GovernmentDashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    null
  );

  // Load existing reports from browser storage on first render.
  useEffect(() => {
    const savedReports = readSavedReports();

    if (savedReports !== null) {
      setReports(savedReports);
    }

    setReportsLoaded(true);
  }, []);

  // Save report changes so they remain after navigation or refresh.
  useEffect(() => {
    if (!reportsLoaded) {
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(reports)
      );
    } catch (error) {
      console.error("Could not save reports:", error);
    }
  }, [reports, reportsLoaded]);

  const updateReportStatus = (
    reportId: string,
    newStatus: ReportStatus
  ) => {
    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === reportId
          ? { ...report, status: newStatus }
          : report
      )
    );
  };

  const updateReportDepartment = (
    reportId: string,
    newDepartment: string
  ) => {
    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === reportId
          ? { ...report, department: newDepartment }
          : report
      )
    );
  };

  const selectedReport = reports.find(
    (report) => report.id === selectedReportId
  );

  const filteredReports = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        report.id.toLowerCase().includes(query) ||
        report.title.toLowerCase().includes(query) ||
        report.location.toLowerCase().includes(query) ||
        report.category.toLowerCase().includes(query) ||
        report.department.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "All" || report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  const exportReportsToCsv = () => {
    const headers = [
      "Report ID",
      "Title",
      "Category",
      "Location",
      "Department",
      "Date Reported",
      "Status",
    ];

    const rows = filteredReports.map((report) => [
      report.id,
      report.title,
      report.category,
      report.location,
      report.department,
      report.date,
      report.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `community-reports-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const stats = [
    {
      title: "Total Reports",
      value: reports.length,
      icon: "📋",
      color: "bg-blue-50",
    },
    {
      title: "Pending Issues",
      value: reports.filter((report) => report.status === "Pending").length,
      icon: "⏳",
      color: "bg-amber-50",
    },
    {
      title: "In Progress",
      value: reports.filter((report) => report.status === "In Progress").length,
      icon: "🔧",
      color: "bg-indigo-50",
    },
    {
      title: "Resolved Issues",
      value: reports.filter((report) => report.status === "Resolved").length,
      icon: "✅",
      color: "bg-green-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 md:flex">
      <aside className="w-full bg-slate-900 p-6 text-white md:min-h-screen md:w-64">
        <h1 className="mb-2 text-2xl font-bold">Community Reports</h1>

        <p className="mb-8 text-sm text-gray-400">
          Government Portal
        </p>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActivePage(item)}
              aria-current={activePage === item ? "page" : undefined}
              className={`w-full rounded-lg px-4 py-3 text-left ${
                activePage === item
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-slate-800"
              }`}
            >
              {item === "Dashboard" && "🏠 "}
              {item === "Reports" && "📋 "}
              {item === "GIS Map" && "🗺️ "}
              {item === "Departments" && "🏢 "}
              {item === "Statistics" && "📊 "}
              {item}
            </button>
          ))}
        </nav>

        <Link
          href="/"
          className="mt-5 block rounded-lg border border-slate-700 px-4 py-3 text-gray-200 hover:bg-slate-800"
        >
          Admin Dashboard →
        </Link>

        <div className="mt-10 border-t border-slate-700 pt-5">
          <p className="text-sm text-gray-400">Signed in as</p>
          <p className="mt-1 font-medium">Government Officer</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 md:p-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">
              Government Dashboard
            </h2>
            <p className="mt-2 text-gray-500">
              Monitor community issues and service delivery.
            </p>
          </div>

          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800">
            Government Officer
          </span>
        </header>

        {activePage === "Dashboard" && (
          <>
            <h3 className="mb-4 text-xl font-semibold">Overview</h3>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.title}
                  className="rounded-xl bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {stat.title}
                    </p>
                    <span
                      className={`rounded-lg p-2 text-2xl ${stat.color}`}
                    >
                      {stat.icon}
                    </span>
                  </div>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">
                    Recent Community Reports
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    A quick look at the latest sample reports.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePage("Reports")}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  View All Reports
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {reports.slice(0, 3).map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4"
                  >
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {report.id} · {report.location}
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

              <button
                type="button"
                onClick={() => setActivePage("GIS Map")}
                className="mt-5 rounded-lg border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50"
              >
                Open GIS Map
              </button>
            </section>
          </>
        )}

        {activePage === "Reports" && (
          <section className="rounded-xl bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold">
                Reports Management
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Search reports, filter by status, assign departments, and
                update progress.
              </p>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title, ID, category or location..."
                aria-label="Search reports"
                className="rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 md:col-span-2"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter reports by status"
                className="rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Showing {filteredReports.length} of {reports.length} reports
              </p>

              <button
                type="button"
                onClick={exportReportsToCsv}
                disabled={filteredReports.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↓ Export Reports to CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-600">
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
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <p className="font-medium">{report.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {report.id}
                        </p>
                      </td>

                      <td className="p-3">{report.category}</td>
                      <td className="p-3">{report.location}</td>

                      <td className="p-3">
                        <select
                          value={report.department}
                          onChange={(event) =>
                            updateReportDepartment(
                              report.id,
                              event.target.value
                            )
                          }
                          aria-label={`Assign department for ${report.id}`}
                          className="max-w-[190px] rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                        >
                          <option value="Public Works">
                            Public Works
                          </option>
                          <option value="Water and Sanitation">
                            Water and Sanitation
                          </option>
                          <option value="Environment">
                            Environment
                          </option>
                        </select>
                      </td>

                      <td className="whitespace-nowrap p-3">
                        {report.date}
                      </td>

                      <td className="p-3">
                        <select
                          value={report.status}
                          onChange={(event) =>
                            updateReportStatus(
                              report.id,
                              event.target.value as ReportStatus
                            )
                          }
                          aria-label={`Update status for ${report.id}`}
                          className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none ${statusStyles[report.status]}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>

                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => setSelectedReportId(report.id)}
                          className="whitespace-nowrap rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredReports.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-8 text-center text-gray-500"
                      >
                        No reports match your search or status filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {selectedReport && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-details-title"
              >
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-600">
                        {selectedReport.id}
                      </p>
                      <h3
                        id="report-details-title"
                        className="mt-1 text-2xl font-bold"
                      >
                        Report Details
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReportId(null)}
                      aria-label="Close report details"
                      className="rounded-lg px-3 py-2 text-2xl text-gray-500 hover:bg-gray-100"
                    >
                      ×
                    </button>
                  </div>

                  <h4 className="mb-5 text-lg font-semibold">
                    {selectedReport.title}
                  </h4>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="mt-1 font-medium">
                        {selectedReport.category}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="mt-1 font-medium">
                        {selectedReport.location}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Assigned Department
                      </p>
                      <p className="mt-1 font-medium">
                        {selectedReport.department}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Date Reported
                      </p>
                      <p className="mt-1 font-medium">
                        {selectedReport.date}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Current Status
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[selectedReport.status]}`}
                      >
                        {selectedReport.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-gray-200 pt-5">
                    <label
                      htmlFor="details-status"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Update Report Status
                    </label>

                    <select
                      id="details-status"
                      value={selectedReport.status}
                      onChange={(event) =>
                        updateReportStatus(
                          selectedReport.id,
                          event.target.value as ReportStatus
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setSelectedReportId(null)}
                      className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activePage === "GIS Map" && (
          <section className="rounded-xl bg-white p-5 shadow-sm md:p-6">
            <h3 className="mb-2 text-xl font-semibold">
              Community Reports Map
            </h3>
            <p className="mb-5 text-sm text-gray-500">
              Explore the map and sample community issue locations.
            </p>
            <GovernmentMapLoader />
          </section>
        )}

        {activePage === "Departments" && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-semibold">
              Government Departments
            </h3>
            <p className="mb-5 text-gray-500">
              Departments responsible for resolving community issues.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[
                "Public Works",
                "Water and Sanitation",
                "Environment",
              ].map((department) => (
                <div
                  key={department}
                  className="rounded-lg border border-gray-200 p-5"
                >
                  <span className="text-2xl">🏢</span>
                  <h4 className="mt-3 font-semibold">{department}</h4>
                  <p className="mt-2 text-sm text-gray-500">
                    {
                      reports.filter(
                        (report) => report.department === department
                      ).length
                    }{" "}
                    assigned reports
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === "Statistics" && (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-2 text-xl font-semibold">
              Report Statistics
            </h3>
            <p className="mb-6 text-gray-500">
              Summary of the current reports.
            </p>

            <div className="space-y-5">
              {stats.map((stat) => {
                const percentage =
                  reports.length > 0
                    ? Math.round((stat.value / reports.length) * 100)
                    : 0;

                return (
                  <div key={stat.title}>
                    <div className="mb-2 flex justify-between gap-3">
                      <span className="text-sm font-medium">
                        {stat.title}
                      </span>
                      <span className="text-sm text-gray-500">
                        {stat.value} ({percentage}%)
                      </span>
                    </div>

                    <div
                      className="h-3 overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-label={`${stat.title} percentage`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-xs text-gray-400">
              Statistics are calculated from reports stored in this browser.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
