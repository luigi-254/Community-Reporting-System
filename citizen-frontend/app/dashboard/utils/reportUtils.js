const statusLabels = {
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  UNDERREVIEW: "Under review",
  NEEDS_MORE_INFO: "Needs more info",
  NEEDSMOREINFO: "Needs more info",
  VERIFIED: "Verified",
  ASSIGNED: "Assigned",
  ACKNOWLEDGED: "Acknowledged",
  INSPECTION_IN_PROGRESS: "Inspection in progress",
  INSPECTIONINPROGRESS: "Inspection in progress",
  IN_PROGRESS: "In progress",
  INPROGRESS: "In progress",
  AWAITING_EXTERNAL_AGENCY: "Awaiting external agency",
  AWAITINGEXTERNALAGENCY: "Awaiting external agency",
  RESOLUTION_SUBMITTED: "Resolution submitted",
  RESOLUTIONSUBMITTED: "Resolution submitted",
  AWAITING_CITIZEN_VERIFICATION: "Awaiting citizen verification",
  AWAITINGCITIZENVERIFICATION: "Awaiting citizen verification",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  REJECTED: "Rejected",
  DUPLICATE: "Duplicate",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
  DRAFT: "Draft",
};

export function normalizeReport(report) {
  const rawStatus = String(report.status || "SUBMITTED").toUpperCase();
  const rawDate = report.createdAt || report.date || "";

  return {
    ...report,
    id: String(report.id || report._id || ""),
    date: rawDate ? String(rawDate).slice(0, 10) : "",
    status: statusLabels[rawStatus] || report.status || "Submitted",
    mediaUrls: Array.isArray(report.mediaUrls) ? report.mediaUrls : [],
    createdAt: report.createdAt || null,
  };
}

export function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFileSize(size) {
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

export function resolveMediaUrl(path, apiBaseUrl) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBaseUrl || "http://localhost:5000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function isImageUrl(path) {
  return /\.(jpe?g|png|webp|gif)(?:[?#]|$)/i.test(path || "");
}

/**
 * Sentence Case helper: capitalises the first character, lowercases the rest.
 * Returns empty/undefined values unchanged.
 */
export function toSentenceCase(value) {
  if (value == null || value === "") return value;
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
