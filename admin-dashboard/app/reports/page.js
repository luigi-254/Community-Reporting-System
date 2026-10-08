"use client";

import { useState } from "react";
import { reports as initialReports } from "../../data/reports";

export default function ReportsPage() {
const [reports, setReports] = useState(initialReports);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState("All");

const [selectedReport, setSelectedReport] = useState(null);
const [editingReport, setEditingReport] = useState(null);

const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

const filteredReports = reports.filter((report) => {
  const searchText = normalizeText(search);

  const matchesSearch = [
    report.id,
    report.issue,
    report.category,
    report.location,
    report.reportedBy,
    report.description,
  ].some((value) => normalizeText(value).includes(searchText));

  const matchesStatus =
    statusFilter === "All" || report.status === statusFilter;

  return matchesSearch && matchesStatus;
});

const openEditForm = (report) => {
  setEditingReport({ ...report });
  setSelectedReport(null);
};

const saveReport = () => {
  if (!editingReport) return;

  const updatedReport = {
    ...editingReport,
    issue: editingReport.issue.trim(),
    location: editingReport.location.trim(),
    reportedBy: editingReport.reportedBy.trim(),
    description: editingReport.description.trim(),
  };

  setReports((currentReports) =>
    currentReports.map((report) =>
      report.id === updatedReport.id ? updatedReport : report
    )
  );

  setSelectedReport(updatedReport);
  setEditingReport(null);
};

return (
  <div className="min-h-screen bg-gray-100 text-gray-900">
    {/* Header */}
    <header className="bg-white border-b border-gray-200 px-8 py-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage issues reported by citizens
          </p>
        </div>

        <a
          href="/"
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
        >
          Back to Dashboard
        </a>
      </div>
    </header>

  <main className="p-8">
    {/* Search and Filter */}
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Reports
          </label>

          <input
            type="text"
            placeholder="Search by ID, issue, category or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        <div className="w-full md:w-56">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Status
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="All">All Reports</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>
    </div>

    {/* Reports Table */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-bold">
          Reports ({filteredReports.length})
        </h2>
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
                Category
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
              <th className="text-left px-6 py-4 font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredReports.length > 0 ? (
              filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-6 py-4 font-medium">{report.id}</td>

                  <td className="px-6 py-4 font-medium">
                    {report.issue}
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {report.category}
                  </td>

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

                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="7"
                  className="px-6 py-10 text-center text-gray-500"
                >
                  No reports found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </main>

  {/* View Report Modal */}
  {selectedReport && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Report Details</h2>
            <p className="text-sm text-gray-500">
              {selectedReport.id}
            </p>
          </div>

          <button
            onClick={() => setSelectedReport(null)}
            className="text-gray-500 hover:text-gray-900 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-sm text-gray-500">Issue</p>
            <p className="font-semibold mt-1">
              {selectedReport.issue}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium mt-1">
                {selectedReport.category}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="font-medium mt-1">
                {selectedReport.location}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Reported By</p>
              <p className="font-medium mt-1">
                {selectedReport.reportedBy}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium mt-1">
                {selectedReport.date}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">Status</p>
            <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
              {selectedReport.status}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-500">Description</p>
            <p className="mt-2 text-gray-700 leading-6">
              {selectedReport.description}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => setSelectedReport(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Close
          </button>

          <button
            onClick={() => openEditForm(selectedReport)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Edit Report
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Edit Report Modal */}
  {editingReport && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold">Edit Report</h2>
          <p className="text-sm text-gray-500 mt-1">
            Update report information and status
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Report ID */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Report ID
            </label>

            <input
              value={editingReport.id}
              disabled
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-500"
            />
          </div>

          {/* Issue */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Issue
            </label>

            <input
              value={editingReport.issue}
              onChange={(e) =>
                setEditingReport({
                  ...editingReport,
                  issue: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          {/* Category and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>

              <select
                value={editingReport.category}
                onChange={(e) =>
                  setEditingReport({
                    ...editingReport,
                    category: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
              >
                <option>Roads</option>
                <option>Drainage</option>
                <option>Infrastructure</option>
                <option>Pedestrian</option>
                <option>Environment</option>
                <option>Water</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>

              <input
                value={editingReport.location}
                onChange={(e) =>
                  setEditingReport({
                    ...editingReport,
                    location: e.target.value,
                  })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-3"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Status
            </label>

            <select
              value={editingReport.status}
              onChange={(e) =>
                setEditingReport({
                  ...editingReport,
                  status: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white"
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
          </div>

          {/* Reported By */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Reported By
            </label>

            <input
              value={editingReport.reportedBy}
              onChange={(e) =>
                setEditingReport({
                  ...editingReport,
                  reportedBy: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>

            <textarea
              rows="4"
              value={editingReport.description}
              onChange={(e) =>
                setEditingReport({
                  ...editingReport,
                  description: e.target.value,
                })
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => setEditingReport(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={saveReport}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )}
</div>

);
}
