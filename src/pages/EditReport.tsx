
import { useState, type FormEvent } from "react";
import "./EditReport.css";

type EditReportProps = {
  reportId: string;
  onBack: () => void;
  onSave?: () => void;
};

function EditReport({
  reportId,
  onBack,
  onSave,
}: EditReportProps) {
  const [issue, setIssue] = useState("Large Pothole");
  const [category, setCategory] = useState("Roads");
  const [location, setLocation] = useState("Kisii Town");
  const [status, setStatus] = useState("pending");

  const [description, setDescription] = useState(
    "A large pothole has developed on the main road and is making it difficult for vehicles and pedestrians to pass safely."
  );

  const [reportedBy, setReportedBy] = useState("John Doe");

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    alert(`Report ${reportId} updated successfully.`);

    if (onSave) {
      onSave();
    } else {
      onBack();
    }
  };

  return (
    <div className="edit-report-page">

      {/* HEADER */}

      <div className="edit-header">

        <div>
          <h1>Edit Report</h1>

          <p>
            Update information for report {reportId}
          </p>
        </div>

        <button
          type="button"
          className="edit-back-btn"
          onClick={onBack}
        >
          ← Cancel
        </button>

      </div>


      {/* FORM */}

      <form
        className="edit-form"
        onSubmit={handleSave}
      >

        <div className="form-grid">

          {/* REPORT ID */}

          <div className="form-group">

            <label>
              Report ID
            </label>

            <input
              type="text"
              value={reportId}
              disabled
            />

          </div>


          {/* ISSUE */}

          <div className="form-group">

            <label>
              Issue
            </label>

            <input
              type="text"
              value={issue}
              onChange={(e) =>
                setIssue(e.target.value)
              }
            />

          </div>


          {/* CATEGORY */}

          <div className="form-group">

            <label>
              Category
            </label>

            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value)
              }
            >

              <option value="Roads">
                Roads
              </option>

              <option value="Drainage">
                Drainage
              </option>

              <option value="Infrastructure">
                Infrastructure
              </option>

              <option value="Pedestrian">
                Pedestrian
              </option>

              <option value="Environment">
                Environment
              </option>

              <option value="Water">
                Water
              </option>

            </select>

          </div>


          {/* LOCATION */}

          <div className="form-group">

            <label>
              Location
            </label>

            <input
              type="text"
              value={location}
              onChange={(e) =>
                setLocation(e.target.value)
              }
            />

          </div>


          {/* STATUS */}

          <div className="form-group">

            <label>
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value)
              }
            >

              <option value="pending">
                Pending
              </option>

              <option value="in progress">
                In Progress
              </option>

              <option value="resolved">
                Resolved
              </option>

            </select>

          </div>


          {/* REPORTED BY */}

          <div className="form-group">

            <label>
              Reported By
            </label>

            <input
              type="text"
              value={reportedBy}
              onChange={(e) =>
                setReportedBy(e.target.value)
              }
            />

          </div>

        </div>


        {/* DESCRIPTION */}

        <div className="form-group description-group">

          <label>
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            rows={6}
          />

        </div>


        {/* ACTIONS */}

        <div className="edit-actions">

          <button
            type="button"
            className="cancel-btn"
            onClick={onBack}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-btn"
          >
            Save Changes
          </button>

        </div>

      </form>

    </div>
  );
}

export default EditReport;

