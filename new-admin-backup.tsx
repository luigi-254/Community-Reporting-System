
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const departments = [
  "Public Works",
  "Water and Sanitation",
  "Environment",
];

const statusStyles: Record<ReportStatus, string> = {
  Pending: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-green-100 text-green-800",
};

export default function AdminDashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [hasStoredReports, setHasStoredReports] = useState(false);
  const [search, setSearch] = useState("");

  // Show the splash screen briefly when the page opens.
  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1800);

    return () => {
      window.clearTimeout(splashTimer);
    };
  }, []);

  // Load reports from browser storage.
  useEffect(() => {
    const loadReports = () => {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
          setReports([]);
          setHasStoredReports(false);
          return;
        }

        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setReports(parsed as Report[]);
          setHasStoredReports(true);
        } else {
          setReports([]);
          setHasStoredReports(false);
        }
      } catch (error) {
        console.error("Could not load reports:", error);
        setReports([]);
        setHasStoredReports(false);
      } finally {
        setLoaded(true);
      }
    };

    loadReports();

    window.addEventListener("storage", loadReports);
    window.addEventListener("focus", loadReports);

    return () => {
      window.removeEventListener("storage", loadReports);
      window.removeEventListener("focus", loadReports);
    };
  }, []);

  // Save changes when reports have already been stored.
  useEffect(() => {
    if (!loaded || !hasStoredReports) {
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
  }, [reports, loaded, hasStoredReports]);

  const updateStatus = (
    reportId: string,
    status: ReportStatus
  ) => {
    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === reportId
          ? { ...report, status }
          : report
      )
    );
  };

  const updateDepartment = (
    reportId: string,
    department: string
  ) => {
    setReports((currentReports) =>
      currentReports.map((report) =>
        report.id === reportId
          ? { ...report, department }
          : report
      )
    );
  };

  const query = search.trim().toLowerCase();

  const filteredReports = reports.filter((report) => {
    return (
      report.id.toLowerCase().includes(query) ||
      report.title.toLowerCase().includes(query) ||
      report.category.toLowerCase().includes(query) ||
      report.location.toLowerCase().includes(query) ||
      report.department.toLowerCase().includes(query) ||
      report.status.toLowerCase().includes(query)
    );
  });

  const statistics = [
    {
      label: "Total Reports",
      value: reports.length,
    },
    {
      label: "Pending",
      value: reports.filter((report) => report.status === "Pending").length,
    },
    {
      label: "In Progress",
      value: reports.filter((report) => report.status === "In Progress").length,
    },
    {
      label: "Resolved",
      value: reports.filter((report) => report.status === "Resolved").length,
    },
  ];

  return (
    <main className="min-h-screen bg-[#f7f7f2] p-5 text-[#243329] md:p-10">
      {/* Splash screen */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f7f7f2] px-6"
          role="status"
          aria-label="Loading Admin Dashboard"
        >
          <div className="w-full max-w-sm text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#244637] text-lg font-bold tracking-wider text-white">
              MTFX
            </div>

            <h1 className="mt-7 text-2xl font-semibold tracking-tight text-[#243329]">
              Community Reporting
            </h1>

            <p className="mt-2 text-sm text-[#687468]">
              Admin Dashboard
            </p>

            <div className="mx-auto mt-8 h-1 w-44 overflow-hidden bg-[#dce5d8]">
              <div className="h-full w-1/2 animate-pulse bg-[#244637]" />
            </div>

            <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#55745c]">
              Preparing your workspace
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#dce2d8] pb-7">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
            Community Reporting System
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-[#243329]">
            Admin Dashboard
          </h1>

          <p className="mt-2 text-sm text-[#687468]">
            Monitor reports and coordinate community issue resolution.
          </p>
        </div>

        <nav aria-label="Dashboard navigation" className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center border border-[#cbd6c8] px-4 py-3 text-sm font-medium text-[#244637] hover:bg-[#eff1e9]"
          >
            ← Home
          </Link>

          <Link
            href="/government"
            className="inline-flex items-center bg-[#244637] px-4 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
          >
            Government Dashboard →
          </Link>
        </nav>
      </header>

      {/* Statistics */}
      <section
        aria-label="Report statistics"
        className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {statistics.map((stat, index) => (
          <div
            key={stat.label}
            className="border border-[#dce2d8] bg-[#fdfdf9] p-6"
          >
            <p className="text-sm text-[#687468]">{stat.label}</p>

            <p className="mt-4 text-3xl font-semibold tabular-nums text-[#244637]">
              {loaded ? stat.value : "—"}
            </p>

            <div
              className={`mt-5 h-1 w-12 ${
                index === 1
                  ? "bg-[#b4a16c]"
                  : index === 2
                    ? "bg-[#78917a]"
                    : "bg-[#244637]"
              }`}
            />
          </div>
        ))}
      </section>

      {/* Reports */}
      <section className="border border-[#dce2d8] bg-[#fdfdf9] p-5 md:p-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#55745c]">
              Report register
            </p>

            <h2 className="mt-2 text-xl font-semibold text-[#243329]">
              Community Reports
            </h2>

            <p className="mt-2 text-sm text-[#687468]">
              Review issues, assign departments, and update progress.
            </p>
          </div>

          <p className="text-sm text-[#687468]">
            {loaded
              ? `${filteredReports.length} of ${reports.length} reports`
              : "Loading reports..."}
          </p>
        </div>

        <div className="mb-6">
          <label
            htmlFor="report-search"
            className="mb-2 block text-sm font-medium text-[#344338]"
          >
            Search reports
          </label>

          <input
            id="report-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search ID, title, category, location, department or status..."
            className="w-full border border-[#cbd6c8] bg-white px-4 py-3 text-sm text-[#243329] outline-none placeholder:text-[#8a9488] focus:border-[#55745c]"
          />
        </div>

        {!loaded ? (
          <p className="border-t border-[#dce2d8] py-8 text-sm text-[#687468]">
            Loading saved reports...
          </p>
        ) : reports.length === 0 ? (
          <div className="border border-dashed border-[#cbd6c8] bg-[#f7f7f2] px-5 py-10 text-center">
            <h3 className="font-semibold text-[#243329]">
              No saved reports yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687468]">
              Open the Government Dashboard first to load its sample reports.
              Once reports are saved in this browser, they can appear here.
            </p>

            <Link
              href="/government"
              className="mt-5 inline-flex items-center bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
            >
              Open Government Dashboard →
            </Link>
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="border-t border-[#dce2d8] py-8 text-center text-sm text-[#687468]">
            No reports match your search.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#dce2d8] bg-[#eff1e9] text-[#465448]">
                  <th className="p-3 font-semibold">Report</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Location</th>
                  <th className="p-3 font-semibold">Department</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-[#e5e9e1] transition-colors hover:bg-[#f5f6f0]"
                  >
                    <td className="p-3">
                      <p className="font-medium text-[#243329]">
                        {report.title}
                      </p>
                      <p className="mt-1 text-xs text-[#7a8378]">
                        {report.id}
                      </p>
                    </td>

                    <td className="p-3 text-[#59675b]">
                      {report.category}
                    </td>

                    <td className="p-3 text-[#59675b]">
                      {report.location}
                    </td>

                    <td className="p-3">
                      <select
                        value={report.department}
                        onChange={(event) =>
                          updateDepartment(report.id, event.target.value)
                        }
                        aria-label={`Assign department for ${report.id}`}
                        className="max-w-[190px] border border-[#cbd6c8] bg-white px-2 py-2 text-sm text-[#344338] outline-none focus:border-[#55745c]"
                      >
                        {departments.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="whitespace-nowrap p-3 text-[#59675b]">
                      {report.date}
                    </td>

                    <td className="p-3">
                      <select
                        value={report.status}
                        onChange={(event) =>
                          updateStatus(
                            report.id,
                            event.target.value as ReportStatus
                          )
                        }
                        aria-label={`Update status for ${report.id}`}
                        className={`border-0 px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-[#55745c] ${statusStyles[report.status]}`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-5 border-t border-[#e5e9e1] pt-4 text-xs leading-5 text-[#7a8378]">
          Reports are stored in this browser's local storage, not a shared database.
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#dce2d8] pt-5 text-xs text-[#7a8378]">
        <p>Community Reporting System</p>
        <p>Admin workspace · Prototype</p>
      </footer>
    </main>
  );
}
