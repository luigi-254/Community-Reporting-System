"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { reports as initialReports } from "../../data/reports";

const statusOptions = [
  "All",
  "Pending",
  "In Progress",
  "Resolved",
];

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return initialReports.filter((report) => {
      const matchesQuery =
        !query ||
        [
          report.id,
          report.issue,
          report.category,
          report.location,
          report.reportedBy,
          report.description,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All" || report.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [search, statusFilter]);

  const pendingReports = initialReports.filter(
    (report) => report.status === "Pending"
  ).length;
  const inProgressReports = initialReports.filter(
    (report) => report.status === "In Progress"
  ).length;
  const resolvedReports = initialReports.filter(
    (report) => report.status === "Resolved"
  ).length;

  return (
    <div className="min-h-screen bg-[#f7f7f2] text-[#243329]">
      <header className="border-b border-[#dce2d8] bg-[#173d2d] px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Community Reporting System
            </p>
            <h1 className="mt-2 text-2xl font-bold md:text-3xl">
              Community Reports
            </h1>
            <p className="mt-2 text-sm text-emerald-100">
              Review citizen-submitted issues and their current status.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center rounded-lg bg-[#f4f0dc] px-4 py-2.5 text-sm font-semibold text-[#173d2d] transition hover:bg-white"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Reports</p>
            <p className="mt-3 text-3xl font-bold text-[#173d2d]">
              {initialReports.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">
              {pendingReports}
            </p>
          </div>

          <div className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="mt-3 text-3xl font-bold text-blue-600">
              {inProgressReports}
            </p>
          </div>

          <div className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="mt-3 text-3xl font-bold text-emerald-600">
              {resolvedReports}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-[#dce2d8] bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label
                htmlFor="report-search"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Search Reports
              </label>
              <input
                id="report-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ID, issue, category, citizen or location..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-[#35654b] focus:ring-2 focus:ring-[#35654b]/20"
              />
            </div>

            <div className="w-full md:w-60">
              <label
                htmlFor="status-filter"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#35654b] focus:ring-2 focus:ring-[#35654b]/20"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-[#e4e1d5] bg-white shadow-sm">
          <div className="border-b border-[#e4e1d5] px-5 py-5 md:px-6">
            <h2 className="text-lg font-bold text-[#173d2d]">Report Register</h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredReports.length} of {initialReports.length} reports.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-[#f5f4ec] text-gray-600">
                <tr>
                  <th className="px-5 py-4 font-semibold">Report ID</th>
                  <th className="px-5 py-4 font-semibold">Issue</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                      No reports match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-t border-gray-100 transition hover:bg-[#fafaf5]"
                    >
                      <td className="px-5 py-4 font-semibold text-[#24543b]">
                        {report.id}
                      </td>
                      <td className="max-w-xs px-5 py-4 font-medium text-gray-900">
                        {report.issue}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {report.category}
                      </td>
                      <td className="max-w-xs px-5 py-4 text-gray-600">
                        {report.location}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                            report.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : report.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                        {report.date}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
