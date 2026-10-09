import { useState } from "react";
import "./Reports.css";

type Report = {
  id: string;
  issue: string;
  category: string;
  location: string;
  status: "pending" | "in progress" | "resolved";
  date: string;
};

type ReportsProps = {
  onViewReport: (reportId: string) => void;
};

const reports: Report[] = [
  {
    id: "RPT-001",
    issue: "Large Pothole",
    category: "Roads",
    location: "Kisii Town",
    status: "pending",
    date: "06 Oct 2026",
  },
  {
    id: "RPT-002",
    issue: "Blocked Drainage",
    category: "Drainage",
    location: "Nakuru Town",
    status: "in progress",
    date: "07 Oct 2026",
  },
  {
    id: "RPT-003",
    issue: "Poor Lighting",
    category: "Infrastructure",
    location: "Eldoret Town",
    status: "resolved",
    date: "08 Oct 2026",
  },
  {
    id: "RPT-004",
    issue: "Broken Sidewalk",
    category: "Pedestrian",
    location: "Mombasa Town",
    status: "pending",
    date: "09 Oct 2026",
  },
  {
    id: "RPT-005",
    issue: "Illegal Dumping",
    category: "Environment",
    location: "Nairobi Town",
    status: "pending",
    date: "10 Oct 2026",
  },
];

function Reports({ onViewReport }: ReportsProps) {
  const [search, setSearch] = useState("");

  return (
    <div className="reports-page">

      {/* HEADER */}
      <div className="reports-header">

        <div>
          <h1>Reports</h1>
          <p>Manage and monitor community reports</p>
        </div>

        <button className="add-report-btn">
          Add Report
        </button>

      </div>

      {/* FILTERS */}
      <div className="reports-filters">

        <input
          type="text"
          placeholder="Search reports..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select>
          <option value="all">All Categories</option>
          <option value="roads">Roads</option>
          <option value="drainage">Drainage</option>
          <option value="infrastructure">Infrastructure</option>
          <option value="pedestrian">Pedestrian</option>
          <option value="environment">Environment</option>
        </select>

        <select>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="reports-table-container">

        <table className="reports-table">

          <thead>
            <tr>
              <th>Report ID</th>
              <th>Issue</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {reports
              .filter((report) =>
                `${report.id} ${report.issue} ${report.category} ${report.location}`
                  .toLowerCase()
                  .includes(search.toLowerCase())
              )
              .map((report) => (

                <tr key={report.id}>

                  <td>{report.id}</td>

                  <td>{report.issue}</td>

                  <td>{report.category}</td>

                  <td>{report.location}</td>

                  <td>
                    <span className={`status ${report.status.replace(" ", "-")}`}>
                      {report.status === "in progress"
                        ? "In Progress"
                        : report.status.charAt(0).toUpperCase() +
                          report.status.slice(1)}
                    </span>
                  </td>

                  <td>{report.date}</td>

                  <td className="report-actions">

                    <button
                      className="view-btn"
                      onClick={() => onViewReport(report.id)}
                    >
                      View
                    </button>

                    <button className="edit-table-btn">
                      Edit
                    </button>

                    <button className="delete-btn">
                      Delete
                    </button>

                  </td>

                </tr>

              ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Reports;