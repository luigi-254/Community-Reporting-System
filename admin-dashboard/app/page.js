"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

function normalizeStatus(status) {
  const value = String(status || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replaceAll(" ", "_");

  const aliases = {
    PENDING: "SUBMITTED",
    "IN PROGRESS": "IN_PROGRESS",
    "UNDER REVIEW": "UNDER_REVIEW",
  };

  return aliases[value] || value;
}

function statusLabel(status) {
  const labels = {
    SUBMITTED: "Pending",
    UNDER_REVIEW: "Under Review",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REJECTED: "Rejected",
    ESCALATED: "Escalated",
  };

  const normalized = normalizeStatus(status);

  return (
    labels[normalized] ||
    normalized.toLowerCase().replaceAll("_", " ")
  );
}

function statusStyle(status) {
  switch (normalizeStatus(status)) {
    case "SUBMITTED":
      return "bg-amber-100 text-amber-800";
    case "UNDER_REVIEW":
      return "bg-sky-100 text-sky-800";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-800";
    case "RESOLVED":
      return "bg-emerald-100 text-emerald-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "ESCALATED":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeReport(report, index) {
  const reporter = report.reporter || report.user || {};

  let location = report.location;

  if (typeof location !== "string") {
    location = [
      location?.name,
      report.ward,
      report.subCounty,
      report.county,
    ]
      .filter(Boolean)
      .join(", ");
  }

  const category =
    typeof report.category === "object"
      ? report.category?.name || report.category?.title
      : report.category;

  const dateValue =
    report.createdAt ||
    report.created_at ||
    report.date ||
    null;

  return {
    id: String(
      report.reportNumber ||
        report.referenceNumber ||
        report.id ||
        `report-${index + 1}`
    ),
    issue: report.title || report.issue || "Untitled report",
    category: category || report.subCategory || "Uncategorized",
    location: location || "Location not provided",
    status: normalizeStatus(report.status),
    date: formatDate(dateValue),
    createdAt: dateValue,
    reportedBy:
      report.reportedBy ||
      report.reporterName ||
      reporter.name ||
      reporter.email ||
      "Citizen",
    description: report.description || "",
  };
}

export default function AdminDashboard() {
  const router = useRouter();

  const [activePage, setActivePage] = useState("Dashboard");
  const [reports, setReports] = useState([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/reports?page=1&limit=100`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
        }
      );

      let result;

      try {
        result = await response.json();
      } catch {
        throw new Error(
          "The backend returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
            `The reports API returned status ${response.status}.`
        );
      }

      const apiReports =
        result?.data?.reports ??
        result?.reports;

      if (!Array.isArray(apiReports)) {
        throw new Error(
          "The API response did not contain a valid reports list."
        );
      }

      setReports(apiReports.map(normalizeReport));

      const apiTotal = Number(
        result?.data?.total ?? result?.total ?? apiReports.length
      );

      setTotalFromApi(
        Number.isFinite(apiTotal) ? apiTotal : apiReports.length
      );

      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Admin dashboard report loading failed:", err);

      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check that it is running on port 5000 and allows this dashboard through CORS."
          : err.message || "Failed to load reports."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const reportStats = useMemo(() => {
    const pending = reports.filter(
      (report) =>
        report.status === "SUBMITTED" ||
        report.status === "UNDER_REVIEW"
    ).length;

    const inProgress = reports.filter(
      (report) => report.status === "IN_PROGRESS"
    ).length;

    const resolved = reports.filter(
      (report) => report.status === "RESOLVED"
    ).length;

    const categoryCounts = reports.reduce((counts, report) => {
      const category = report.category || "Other";
      counts[category] = (counts[category] || 0) + 1;
      return counts;
    }, {});

    const recentReports = [...reports].sort((a, b) => {
      const dateA = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const dateB = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return dateB - dateA;
    });

    const resolutionRate =
      reports.length === 0
        ? 0
        : Math.round((resolved / reports.length) * 100);

    return {
      pending,
      inProgress,
      resolved,
      categoryCounts,
      recentReports: recentReports.slice(0, 5),
      resolutionRate,
    };
  }, [reports]);

  const handleNavigation = (page) => {
    setActivePage(page);

    const routes = {
      Reports: "/reports",
      Users: "/users",
      Statistics: "/statistics",
      Settings: "/settings",
    };

    if (routes[page]) {
      router.push(routes[page]);
    }
  };

  const statCards = [
    {
      title: "Total Reports",
      value: totalFromApi,
      subtitle: "Reports returned by the backend",
      color: "text-[#24543b]",
    },
    {
      title: "Pending",
      value: reportStats.pending,
      subtitle: "Awaiting review or action",
      color: "text-amber-700",
    },
    {
      title: "In Progress",
      value: reportStats.inProgress,
      subtitle: "Currently being handled",
      color: "text-blue-700",
    },
    {
      title: "Resolved",
      value: reportStats.resolved,
      subtitle: "Marked as resolved",
      color: "text-emerald-700",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#f7f6ef] text-gray-900">
      <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#173d2d] p-6 text-white">
        <div className="mb-10">
          <h1 className="text-xl font-bold">
            Community Reports
          </h1>
          <p className="mt-1 text-sm text-emerald-200">
            Admin Panel
          </p>
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
              className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                activePage === item
                  ? "bg-[#f4f0dc] text-[#173d2d]"
                  : "text-emerald-50 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/15 pt-6">
          <p className="text-xs leading-5 text-emerald-100">
            Community issue monitoring and administration
          </p>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="border-b border-[#e4e1d5] bg-white px-5 py-6 md:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#487257]">
                Administration
              </p>
              <h2 className="mt-1 text-2xl font-bold text-[#173d2d]">
                Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Live overview of community issues submitted by citizens.
              </p>
            </div>

            <button
              onClick={loadReports}
              disabled={loading}
              className="rounded-lg bg-[#24543b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#173d2d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh Data"}
            </button>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            {lastUpdated
              ? `Last updated at ${lastUpdated}`
              : "Waiting for reports from the backend"}
          </p>
        </header>

        <div className="space-y-8 p-5 md:p-8">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
            >
              <p className="font-bold">
                Could not load live reports
              </p>
              <p className="mt-2">{error}</p>
              <p className="mt-2">
                Check the backend terminal, then select Refresh Data.
              </p>
            </div>
          )}

          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm"
              >
                <p className="text-sm text-gray-500">
                  {card.title}
                </p>

                <p
                  className={`mt-3 text-3xl font-bold ${card.color}`}
                >
                  {loading ? "—" : card.value}
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  {card.subtitle}
                </p>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-[#173d2d]">
                  Resolution Progress
                </h3>

                <span className="text-2xl font-bold text-emerald-700">
                  {loading ? "—" : `${reportStats.resolutionRate}%`}
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Percentage of reports in the records loaded that are resolved.
              </p>

              <div
                className="mt-5 h-3 w-full overflow-hidden rounded-full bg-gray-100"
                role="progressbar"
                aria-label="Report resolution rate"
                aria-valuenow={reportStats.resolutionRate}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-emerald-700 transition-all"
                  style={{
                    width: `${reportStats.resolutionRate}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-sm text-gray-600">
                {loading
                  ? "Loading resolution details..."
                  : `${reportStats.resolved} of ${reports.length} loaded reports resolved`}
              </p>
            </div>

            <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#173d2d]">
                Reports by Category
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Breakdown of issues returned by the API.
              </p>

              <div className="mt-5 space-y-4">
                {Object.entries(reportStats.categoryCounts).map(
                  ([category, count]) => (
                    <div key={category}>
                      <div className="mb-1 flex justify-between gap-3 text-sm">
                        <span className="text-gray-700">
                          {category}
                        </span>
                        <span className="font-semibold">
                          {count}
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-[#568066]"
                          style={{
                            width: `${
                              reports.length
                                ? (count / reports.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}

                {!loading &&
                  Object.keys(reportStats.categoryCounts).length === 0 && (
                    <p className="text-sm text-gray-500">
                      No reports available yet.
                    </p>
                  )}

                {loading && (
                  <p className="text-sm text-gray-500">
                    Loading categories...
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-[#e4e1d5] bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b border-[#e4e1d5] px-6 py-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-lg font-bold text-[#173d2d]">
                  Recent Reports
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Latest issues received from the backend.
                </p>
              </div>

              <button
                onClick={() => handleNavigation("Reports")}
                className="rounded-lg bg-[#24543b] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#173d2d]"
              >
                View All Reports
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-[#f5f4ec] text-gray-600">
                  <tr>
                    <th className="px-6 py-4 font-semibold">
                      Report ID
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Issue
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Location
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 font-semibold">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        Loading reports from the backend...
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center"
                      >
                        <p className="font-semibold text-gray-700">
                          {error
                            ? "Reports could not be loaded."
                            : "No reports found."}
                        </p>
                        <p className="mt-2 text-sm text-gray-500">
                          {error
                            ? "Resolve the connection error and refresh."
                            : "Submit a citizen report, then click Refresh Data."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    reportStats.recentReports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-t border-gray-100 transition hover:bg-[#fafaf5]"
                      >
                        <td
                          className="px-6 py-4 font-semibold text-[#24543b]"
                          title={report.id}
                        >
                          {report.id.length > 15
                            ? `${report.id.slice(0, 8)}...`
                            : report.id}
                        </td>

                        <td className="px-6 py-4 font-medium">
                          {report.issue}
                        </td>

                        <td className="px-6 py-4 text-gray-600">
                          {report.location}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${statusStyle(report.status)}`}
                          >
                            {statusLabel(report.status)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-gray-600">
                          {report.date}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}