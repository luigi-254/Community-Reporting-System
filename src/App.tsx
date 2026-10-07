
import "./App.css";
import { useState } from "react";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";
import EditReport from "./pages/EditReport";

function App() {
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [selectedReportId, setSelectedReportId] = useState("");

  const showDashboard = () => {
    setCurrentPage("dashboard");
  };

  const showReports = () => {
    setCurrentPage("reports");
  };

  const showReportDetails = (reportId: string) => {
    setSelectedReportId(reportId);
    setCurrentPage("report-details");
  };

  const showEditReport = () => {
    setCurrentPage("edit-report");
  };

  const saveReport = () => {
    setCurrentPage("report-details");
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <h2>Community Reports</h2>

        <nav>

          <a
            href="#"
            className={currentPage === "dashboard" ? "active" : ""}
            onClick={(e) => {
              e.preventDefault();
              showDashboard();
            }}
          >
            Dashboard
          </a>

          <a
            href="#"
            className={
              currentPage === "reports" ||
              currentPage === "report-details" ||
              currentPage === "edit-report"
                ? "active"
                : ""
            }
            onClick={(e) => {
              e.preventDefault();
              showReports();
            }}
          >
            Reports
          </a>

          <a href="#">Users</a>

          <a href="#">Statistics</a>

          <a href="#">Settings</a>

        </nav>

        <button className="logout">
          Logout
        </button>

      </aside>


      {/* MAIN CONTENT */}
      <main className="main-content">

        {currentPage === "edit-report" ? (
          <EditReport
            {...({
              reportId: selectedReportId,
              onBack: () => setCurrentPage("report-details"),
              onSave: saveReport,
            } as any)}
          />
        ) : currentPage === "report-details" ? (
          <ReportDetails
            reportId={selectedReportId}
            onBack={showReports}
            onEdit={showEditReport}
          />
        ) : currentPage === "reports" ? (
          <Reports
            {...({ onViewReport: showReportDetails } as any)}
          />
        ) : (
          <>
            <header className="topbar">

              <div>
                <h1>Admin Dashboard</h1>

                <p>
                  Manage and monitor community reports
                </p>
              </div>

              <div className="admin-profile">

                <span className="profile-circle">
                  AD
                </span>

                <span>
                  Administrator
                </span>

              </div>

            </header>


            {/* STATISTICS */}

            <section className="stats">

              <div className="stat-card">
                <h3>Total Reports</h3>
                <strong>120</strong>
              </div>

              <div className="stat-card">
                <h3>Pending</h3>
                <strong>35</strong>
              </div>

              <div className="stat-card">
                <h3>In Progress</h3>
                <strong>45</strong>
              </div>

              <div className="stat-card">
                <h3>Resolved</h3>
                <strong>40</strong>
              </div>

            </section>


            {/* RECENT REPORTS */}

            <section className="reports-section">

              <div className="section-header">

                <h2>
                  Recent Reports
                </h2>

                <button onClick={showReports}>
                  View All
                </button>

              </div>


              <div className="dashboard-report-table">

                <div className="table-header">

                  <span>Issue</span>
                  <span>Location</span>
                  <span>Status</span>
                  <span>Date</span>

                </div>


                <div className="table-row">

                  <span>
                    Pothole
                  </span>

                  <span>
                    Kisii Town
                  </span>

                  <span className="dashboard-status pending">
                    Pending
                  </span>

                  <span>
                    06 Oct 2026
                  </span>

                </div>


                <div className="table-row">

                  <span>
                    Blocked Drainage
                  </span>

                  <span>
                    Nyamira
                  </span>

                  <span className="dashboard-status progress">
                    In Progress
                  </span>

                  <span>
                    05 Oct 2026
                  </span>

                </div>


                <div className="table-row">

                  <span>
                    Broken Streetlight
                  </span>

                  <span>
                    Keroka
                  </span>

                  <span className="dashboard-status resolved">
                    Resolved
                  </span>

                  <span>
                    04 Oct 2026
                  </span>

                </div>

              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default App;

