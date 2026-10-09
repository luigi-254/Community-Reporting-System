
import "./ReportDetails.css";

type ReportDetailsProps = {
  reportId: string;
  onBack: () => void;
  onEdit: () => void;
};

function ReportDetails({
  reportId,
  onBack,
  onEdit,
}: ReportDetailsProps) {
  const report = {
    id: reportId || "RPT-001",
    issue: "Large Pothole",
    category: "Roads",
    location: "Kisii Town",
    status: "Pending",
    date: "06 Oct 2026",
    reportedBy: "John Doe",
    description:
      "A large pothole has developed on the main road and is making it difficult for vehicles and pedestrians to pass safely.",
  };

  return (
    <div className="report-details-page">

      <div className="details-header">

        <div>
          <h1>Report Details</h1>

          <p>
            View information about this community report.
          </p>
        </div>

        <button
          className="back-btn"
          onClick={onBack}
        >
          ← Back to Reports
        </button>

      </div>


      <div className="details-card">

        {/* REPORT HEADER */}

        <div className="details-card-header">

          <div>

            <h2>
              {report.issue}
            </h2>

            <p>
              {report.id}
            </p>

          </div>

          <span className="details-status pending">
            {report.status}
          </span>

        </div>


        {/* REPORT INFORMATION */}

        <div className="details-grid">

          <div className="detail-item">
            <span>Report ID</span>
            <strong>{report.id}</strong>
          </div>

          <div className="detail-item">
            <span>Category</span>
            <strong>{report.category}</strong>
          </div>

          <div className="detail-item">
            <span>Location</span>
            <strong>{report.location}</strong>
          </div>

          <div className="detail-item">
            <span>Date Reported</span>
            <strong>{report.date}</strong>
          </div>

          <div className="detail-item">
            <span>Reported By</span>
            <strong>{report.reportedBy}</strong>
          </div>

          <div className="detail-item">
            <span>Status</span>
            <strong>{report.status}</strong>
          </div>

        </div>


        {/* DESCRIPTION */}

        <div className="description-section">

          <h3>
            Description
          </h3>

          <p>
            {report.description}
          </p>

        </div>


        {/* ACTIONS */}

        <div className="details-actions">

          <button
            className="edit-btn"
            onClick={onEdit}
          >
            Edit Report
          </button>

          <button className="status-btn">
            Update Status
          </button>

        </div>

      </div>

    </div>
  );
}

export default ReportDetails;

