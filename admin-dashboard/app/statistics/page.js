
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const PAGE_SIZE = 100;

function normalizeStatus(status) {
  const value = String(status || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    PENDING: "SUBMITTED",
    IN_REVIEW: "UNDER_REVIEW",
  };

  return aliases[value] || value;
}

function statusLabel(status) {
  const labels = {
    SUBMITTED: "Submitted",
    UNDER_REVIEW: "Under Review",
    IN_PROGRESS: "In Progress",
    RESOLVED: "Resolved",
    REJECTED: "Rejected",
    ESCALATED: "Escalated",
  };

  const normalized = normalizeStatus(status);
  return labels[normalized] || normalized.replaceAll("_", " ");
}

function formatLocation(report) {
  if (
    typeof report.location === "string" &&
    report.location.trim()
  ) {
    return report.location.trim();
  }

  const parts = [
    report.location?.name,
    report.ward,
    report.subCounty,
    report.county,
  ].filter(Boolean);

  return parts.length ? parts.join(", ") : "Unknown";
}

function formatCategory(report) {
  const category = report.category;

  if (typeof category === "string" && category.trim()) {
    return category.trim();
  }

  if (category && typeof category === "object") {
    return category.name || category.title || "Other";
  }

  if (typeof report.subCategory === "string" && report.subCategory.trim()) {
    return report.subCategory.trim();
  }

  return "Other";
}

function normalizeReport(report, index) {
  return {
    id: String(report.id || report.reportNumber || `report-${index + 1}`),
    title: report.title || report.issue || "Untitled report",
    status: normalizeStatus(report.status),
    category: formatCategory(report),
    location: formatLocation(report),
    createdAt: report.createdAt || report.created_at || report.date || null,
  };
}

export default function StatisticsPage() {
  const [reports, setReports] = useState([]);
  const [totalFromApi, setTotalFromApi] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const fetchPage = async (page) => {
        const response = await fetch(
          `${API_BASE_URL}/api/reports?page=${page}&limit=${PAGE_SIZE}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
            cache: "no-store",
          }
        );

        let result;

        try {
          result = await response.json();
        } catch {
          throw new Error("The backend returned an invalid response.");
        }

        if (!response.ok) {
          throw new Error(
            result?.message ||
              `The reports API returned status ${response.status}.`
          );
        }

        const data = result?.data ?? result;
        const pageReports = data?.reports ?? result?.reports;

        if (!Array.isArray(pageReports)) {
          throw new Error(
            "The API response did not contain a valid reports list."
          );
        }

        return {
          reports: pageReports,
          total: Number(data?.total ?? pageReports.length),
          totalPages: Math.max(
            1,
            Number(data?.totalPages) ||
              Math.ceil(Number(data?.total ?? pageReports.length) / PAGE_SIZE) ||
              1
          ),
        };
      };

      // Fetch the first page and determine the number of pages.
      const firstPage = await fetchPage(1);
      const allReports = [...firstPage.reports];

      // Fetch remaining pages so the statistics aren't limited to 100 records.
      for (let page = 2; page <= firstPage.totalPages; page++) {
        const nextPage = await fetchPage(page);
        allReports.push(...nextPage.reports);
      }

      setReports(allReports.map(normalizeReport));
      setTotalFromApi(firstPage.total);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Loading statistics failed:", err);
      setError(
        err instanceof TypeError
          ? "Cannot connect to the backend. Check that it is running on port 5000 and allows this dashboard through CORS."
          : err.message || "Failed to load statistics."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const stats = useMemo(() => {
    const pending = reports.filter(
      (report) =>
        report.status === "SUBMITTED" ||
        report.status === "UNDER_REVIEW"
    ).length;

    const submitted = reports.filter(
      (report) => report.status === "SUBMITTED"
    ).length;

    const underReview = reports.filter(
      (report) => report.status === "UNDER_REVIEW"
    ).length;

    const inProgress = reports.filter(
      (report) => report.status === "IN_PROGRESS"
    ).length;

    const resolved = reports.filter(
      (report) => report.status === "RESOLVED"
    ).length;

    const rejected = reports.filter(
      (report) => report.status === "REJECTED"
    ).length;

    const escalated = reports.filter(
      (report) => report.status === "ESCALATED"
    ).length;

    const resolutionRate =
      reports.length === 0
        ? 0
        : Math.round((resolved / reports.length) * 100);

    const countBy = (field) =>
      reports.reduce((counts, report) => {
        const value = report[field] || "Other";
        counts[value] = (counts[value] || 0) + 1;
        return counts;
      }, {});

    const categories = countBy("category");
    const locations = countBy("location");

    const sortCounts = (counts) =>
      Object.entries(counts).sort((a, b) => b[1] - a[1]);

    return {
      pending,
      submitted,
      underReview,
      inProgress,
      resolved,
      rejected,
      escalated,
      resolutionRate,
      categories: sortCounts(categories),
      locations: sortCounts(locations),
    };
  }, [reports]);

  const summaryCards = [
    {
      label: "Total Reports",
      value: totalFromApi,
      detail: "All reports recorded by the API",
      color: "text-[#24543b]",
    },
    {
      label: "Pending",
      value: stats.pending,
      detail: "Submitted or under review",
      color: "text-amber-700",
    },
    {
      label: "In Progress",
      value: stats.inProgress,
      detail: "Currently being handled",
      color: "text-blue-700",
    },
    {
      label: "Resolved",
      value: stats.resolved,
      detail: "Marked as resolved",
      color: "text-emerald-700",
    },
  ];

  const statusBreakdown = [
    { label: "Submitted", value: stats.submitted },
    { label: "Under Review", value: stats.underReview },
    { label: "In Progress", value: stats.inProgress },
    { label: "Resolved", value: stats.resolved },
    { label: "Rejected", value: stats.rejected },
    { label: "Escalated", value: stats.escalated },
  ];

  const renderBreakdown = (entries, total, emptyMessage) => {
    if (loading) {
      return <p className="text-sm text-gray-500">Loading statistics...</p>;
    }

    if (entries.length === 0) {
      return <p className="text-sm text-gray-500">{emptyMessage}</p>;
    }

    return (
      <div className="space-y-5">
        {entries.map(([label, count]) => {
          const percentage =
            total === 0 ? 0 : Math.round((count / total) * 100);

          return (
            <div key={label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-700">
                  {label}
                </span>
                <span className="whitespace-nowrap text-sm text-gray-500">
                  {count} ({percentage}%)
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-[#568066] transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f7f6ef] text-gray-900">
      <header className="border-b border-white/10 bg-[#173d2d] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Community Reporting System
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Statistics & Analytics
            </h1>
            <p className="mt-2 text-sm text-emerald-100">
              Live analysis of citizen-submitted community reports.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadStatistics}
              disabled={loading}
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Statistics"}
            </button>

            <Link
              href="/"
              className="rounded-lg bg-[#f4f0dc] px-4 py-2.5 text-sm font-semibold text-[#173d2d] transition hover:bg-white"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-4 max-w-7xl text-xs text-emerald-100">
          {lastUpdated
            ? `Last updated at ${lastUpdated}`
            : "Waiting for backend data"}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 p-5 md:p-8">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
          >
            <p className="font-bold">Could not load statistics</p>
            <p className="mt-2">{error}</p>
            <p className="mt-2">
              Check the backend terminal, then select Refresh Statistics.
            </p>
          </div>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className={`mt-3 text-3xl font-bold ${card.color}`}>
                {loading ? "—" : card.value}
              </p>
              <p className="mt-2 text-xs text-gray-500">{card.detail}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#173d2d]">
                  Resolution Rate
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Percentage of loaded reports marked as resolved
                </p>
              </div>

              <p className="text-3xl font-bold text-emerald-700">
                {loading ? "—" : `${stats.resolutionRate}%`}
              </p>
            </div>

            <div
              className="mt-6 h-3 w-full overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-label="Resolution rate"
              aria-valuenow={stats.resolutionRate}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-emerald-700 transition-all"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-gray-600">
              {loading
                ? "Calculating resolution rate..."
                : `${stats.resolved} of ${reports.length} loaded reports resolved`}
            </p>

            {!loading && reports.length !== totalFromApi && (
              <p className="mt-2 text-xs text-amber-700">
                The API reports {totalFromApi} total records but returned{" "}
                {reports.length}. The rate uses the records successfully loaded.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#173d2d]">
              Status Breakdown
            </h2>
            <p className="mb-5 mt-1 text-sm text-gray-500">
              Counts by the backend&apos;s report statuses
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {statusBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-gray-100 bg-[#fafaf5] p-4"
                >
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#24543b]">
                    {loading ? "—" : item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#173d2d]">
              Reports by Category
            </h2>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              Number and proportion of reports for each category
            </p>

            {renderBreakdown(
              stats.categories,
              reports.length,
              "No category data available."
            )}
          </div>

          <div className="rounded-xl border border-[#e4e1d5] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#173d2d]">
              Reports by Location
            </h2>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              Number and proportion of reports for each location
            </p>

            {renderBreakdown(
              stats.locations,
              reports.length,
              "No location data available."
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
