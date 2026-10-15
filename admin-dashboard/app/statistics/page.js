"use client";

import Link from "next/link";
import { reports } from "../../data/reports";

export default function StatisticsPage() {
  const totalReports = reports.length;

  const pendingReports = reports.filter(
    (report) => report.status === "Pending"
  ).length;

  const inProgressReports = reports.filter(
    (report) => report.status === "In Progress"
  ).length;

  const resolvedReports = reports.filter(
    (report) => report.status === "Resolved"
  ).length;

  const resolutionRate =
    totalReports === 0
      ? 0
      : Math.round((resolvedReports / totalReports) * 100);

  const categories = {};

reports.forEach((report) => {
  const category = report.category || "Other";
  categories[category] = (categories[category] || 0) + 1;
});
 
const locations = {};

reports.forEach((report) => {
  const location = report.location || "Unknown";
  locations[location] = (locations[location] || 0) + 1;
});
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Statistics
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Community issue reporting statistics and analytics
            </p>
          </div>

          <Link
            href="/"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="p-8">
        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              Total Reports
            </p>

            <p className="text-3xl font-bold mt-2">
              {totalReports}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              All submitted reports
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              Pending
            </p>

            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {pendingReports}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Awaiting action
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              In Progress
            </p>

            <p className="text-3xl font-bold text-blue-600 mt-2">
              {inProgressReports}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Currently being handled
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm text-gray-500">
              Resolved
            </p>

            <p className="text-3xl font-bold text-green-600 mt-2">
              {resolvedReports}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Successfully resolved
            </p>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">
                Resolution Rate
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Percentage of reports successfully resolved
              </p>
            </div>

            <p className="text-3xl font-bold text-green-600">
              {resolutionRate}%
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-green-500 h-4 rounded-full"
              style={{ width: `${resolutionRate}%` }}
            ></div>
          </div>
        </div>

        {/* Category and Location Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold">
              Reports by Category
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-6">
              Number of reports in each issue category
            </p>

            <div className="space-y-5">
              {Object.entries(categories).map(([category, count]) => {
                const percentage =
                  totalReports === 0
                    ? 0
                    : Math.round((count / totalReports) * 100);

                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm text-gray-500">
                        {count} ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-purple-600 h-2.5 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {Object.keys(categories).length === 0 && (
                <p className="text-sm text-gray-500">
                  No category data available yet.
                </p>
              )}
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold">
              Reports by Location
            </h2>

            <p className="text-sm text-gray-500 mt-1 mb-6">
              Number of reports from each location
            </p>

            <div className="space-y-4">
              
<div className="space-y-5">
  {Object.entries(locations).map(([location, count]) => {
    const percentage =
      totalReports === 0
        ? 0
        : Math.round((count / totalReports) * 100);

    return (
      <div key={location}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">{location}</span>
          <span className="text-sm text-gray-500">
            {count} ({percentage}%)
          </span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className="bg-purple-600 h-2.5 rounded-full"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  })}

  {Object.keys(locations).length === 0 && (
    <p className="text-sm text-gray-500">
      No location data available yet.
    </p>
  )}
</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
