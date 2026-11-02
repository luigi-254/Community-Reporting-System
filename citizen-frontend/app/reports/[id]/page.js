"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  Clock,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  Building2,
  Download,
  Printer,
  Copy,
} from "lucide-react";
import Image from "next/image";
import BrandLogo from "../../components/BrandLogo";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

const STATUS_LABELS = {
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

const STATUS_COLORS = {
  SUBMITTED: "bg-[#e6ece3] text-[#31543a] border-[#cddbd1]",
  PENDING: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  UNDER_REVIEW: "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  UNDERREVIEW: "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  NEEDS_MORE_INFO: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  NEEDSMOREINFO: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  VERIFIED: "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]",
  ASSIGNED: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  ACKNOWLEDGED: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  INSPECTION_IN_PROGRESS: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  INSPECTIONINPROGRESS: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  IN_PROGRESS: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  INPROGRESS: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]",
  AWAITING_EXTERNAL_AGENCY: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  AWAITINGEXTERNALAGENCY: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  RESOLUTION_SUBMITTED: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  RESOLUTIONSUBMITTED: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  AWAITING_CITIZEN_VERIFICATION: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  AWAITINGCITIZENVERIFICATION: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  RESOLVED: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  CLOSED: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]",
  REOPENED: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]",
  REJECTED: "bg-[#fff3f0] text-[#8b392f] border-[#f1c9c2]",
  DUPLICATE: "bg-[#e8eee9] text-[#687468] border-[#d1d9d3]",
  CANCELLED: "bg-[#f2e2dc] text-[#7d4435] border-[#e5d5cf]",
  CANCELED: "bg-[#f2e2dc] text-[#7d4435] border-[#e5d5cf]",
  DRAFT: "bg-[#e8eee9] text-[#687468] border-[#d1d9d3]",
};

const STATUS_ICONS = {
  SUBMITTED: Mail,
  PENDING: Clock,
  UNDER_REVIEW: ShieldAlert,
  UNDERREVIEW: ShieldAlert,
  NEEDS_MORE_INFO: ShieldAlert,
  NEEDSMOREINFO: ShieldAlert,
  VERIFIED: ShieldAlert,
  ASSIGNED: Building2,
  ACKNOWLEDGED: Building2,
  INSPECTION_IN_PROGRESS: ShieldAlert,
  INSPECTIONINPROGRESS: ShieldAlert,
  IN_PROGRESS: ShieldAlert,
  INPROGRESS: ShieldAlert,
  AWAITING_EXTERNAL_AGENCY: ShieldAlert,
  AWAITINGEXTERNALAGENCY: ShieldAlert,
  RESOLUTION_SUBMITTED: ShieldAlert,
  RESOLUTIONSUBMITTED: ShieldAlert,
  AWAITING_CITIZEN_VERIFICATION: CheckCircle,
  AWAITINGCITIZENVERIFICATION: CheckCircle,
  RESOLVED: CheckCircle,
  CLOSED: CheckCircle,
  REOPENED: Clock,
  REJECTED: AlertTriangle,
  DUPLICATE: Mail,
  CANCELLED: AlertTriangle,
  CANCELED: AlertTriangle,
  DRAFT: Mail,
};

function normalizeStatus(value) {
  return String(value || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function resolveMediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;
}

function isImageUrl(path) {
  return /\.(jpe?g|png|webp|gif)(?:[?#]|$)/i.test(path || "");
}

function buildReportHTML(reportId, cardHTML) {
  return (
    "<!DOCTYPE html>" +
    "<html>" +
    "<head>" +
    "<title>Report " +
    reportId +
    "</title>" +
    '<link href="https://cdn.tailwindcss.com" rel="stylesheet">' +
    "<style>" +
    "body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; }" +
    ".report-card { border: 1px solid #dce2d8; border-radius: 1rem; padding: 1.5rem; max-width: 800px; margin: 2rem auto; background: #fdfdf9; }" +
    "</style>" +
    "</head>" +
    '<body style="margin: 0; padding: 20px; background: #fff;">' +
    cardHTML +
    "</body>" +
    "</html>"
  );
}

function copyToClipboard(text, onCopied) {
  navigator.clipboard
    .writeText(text)
    .then(() => onCopied(text))
    .catch(() => alert("Failed to copy report ID."));
}

async function downloadReportPDF(reportId) {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem(TOKEN_KEY)
      : null;
  if (!token) return;
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/reports/${encodeURIComponent(reportId)}/download`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Failed to download report PDF.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mtaa-fix-report-${reportId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  }
}

export default function ReportDetailsPage() {
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem(TOKEN_KEY)
        : null;

    const id =
      typeof window !== "undefined"
        ? window.location.pathname.split("/").pop()
        : "";

    if (!token || !id) {
      if (!token && typeof window !== "undefined") {
        router.replace("/login");
      }
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const reportRes = await fetch(
          `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!reportRes.ok) {
          if (reportRes.status === 404)
            throw new Error("Report not found.");
          if (reportRes.status === 403)
            throw new Error("You do not have access to this report.");
          throw new Error("Failed to load report.");
        }
        const reportData = await reportRes.json().catch(() => ({}));
        if (!cancelled) setReport(reportData?.data?.report || null);

        const historyRes = await fetch(
          `${API_BASE_URL}/api/reports/${encodeURIComponent(id)}/history`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );
        if (!historyRes.ok)
          throw new Error("Failed to load report history.");
        const historyData = await historyRes.json().catch(() => ({}));
        if (!cancelled)
          setHistory(
            Array.isArray(historyData?.data?.history)
              ? historyData.data.history
              : []
          );
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] flex items-center justify-center px-6 text-[#243329]">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#e8eee9] border-t-[#244637] animate-[spin_1s_linear_infinite]" />
          <p className="mt-4 text-sm text-[#687468]">Loading reportâ€¦</p>
        </div>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="min-h-screen bg-[#f7f7f2] flex items-center justify-center px-6 text-[#243329]">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff3f0] text-[#8b392f]">
            <AlertTriangle className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-xl font-semibold text-[#173c32]">
            {error || "Report not found."}
          </h2>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const statusKey = normalizeStatus(report.status);
  const statusLabel = STATUS_LABELS[statusKey] || report.status || "Submitted";
  const statusColor =
    STATUS_COLORS[statusKey] || STATUS_COLORS.SUBMITTED;
  const StatusIcon = STATUS_ICONS[statusKey] || Mail;

  const mediaUrls = Array.isArray(report.mediaUrls)
    ? report.mediaUrls
    : [];
  const resolutionMediaUrls = Array.isArray(
    report.resolutionMediaUrls
  )
    ? report.resolutionMediaUrls
    : [];
  const shortReportId = report.id
    ? `${report.id.slice(0, 8)}â€¦${report.id.slice(-4)}`
    : "";

  const isResolved = report.status === "RESOLVED";
  const isAwaitingVerification =
    statusKey === "AWAITING_CITIZEN_VERIFICATION" ||
    statusKey === "RESOLUTION_SUBMITTED";

  return (
    <>
      <style jsx>{`
        @media print {
          @page {
            margin: 12mm;
          }
          body {
            background: #fff;
          }
          body * {
            visibility: hidden;
          }
          .print-card,
          .print-card * {
            visibility: visible;
          }
          .print-card {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            border: none;
            border-radius: 0;
            box-shadow: none;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <main className="min-h-screen bg-[#f7f7f2] px-5 py-10 text-[#243329] sm:px-8">
        <Link
          href="/dashboard"
          className="no-print inline-flex items-center gap-2 font-semibold text-[#187a58] hover:text-[#126448] mb-6"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to My Reports
        </Link>

        <article className="print-card max-w-4xl mx-auto border border-[#dce2d8] rounded-2xl bg-[#fdfdf9] shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/3 border-r border-[#dce2d8] bg-[#f7f7f2] p-6 sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f6] p-1 mb-4">
                <BrandLogo className="h-8 w-auto object-contain" />
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Report reference</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-sm truncate">{shortReportId}</span>
                  <button
                    onClick={() => {
                      copyToClipboard(report.id, (id) => {
                        setCopiedId(id);
                        setTimeout(() => setCopiedId(""), 1500);
                      });
                    }}
                    className="p-1.5 rounded hover:bg-gray-50 text-[#244637] flex-shrink-0"
                    aria-label="Copy report ID"
                  >
                    {copiedId === report.id ? (
                      <CheckCircle className="w-3 h-3 text-[#187a58]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Category</p>
                <p className="mt-1 text-sm text-[#687468]">{report.category || "Not specified"}</p>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Location</p>
                <p className="mt-1 text-sm text-[#687468]">{report.location || "Not specified"}</p>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Date submitted</p>
                <p className="mt-1 text-sm text-[#687468]">{formatDate(report.createdAt || report.date)}</p>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Status</p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusColor}`}
                >
                  <StatusIcon className="w-3 h-3" aria-hidden="true" />
                  {statusLabel}
                </span>
              </div>

              {report.departmentId && (
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Department</p>
                  <p className="mt-1 text-sm text-[#687468]">{report.department || "Assigned department"}</p>
                </div>
              )}

              {report.assignedOfficerId && (
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Assigned officer</p>
                  <p className="mt-1 text-sm text-[#687468]">
                    {report.assignedOfficer?.name || "Officer assigned"}
                  </p>
                </div>
              )}
            </div>

            <div className="md:w-2/3 p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-[#173c32]">{report.title}</h2>
                <div className="no-print flex items-center gap-2">
                  <button
                    onClick={() => downloadReportPDF(report.id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#55745c]">Description</p>
                <p className="mt-2 text-sm leading-7 text-[#59675b] whitespace-pre-wrap">
                  {report.description || "No description provided."}
                </p>
              </div>

              {mediaUrls.length > 0 && (
                <div className="mb-8">
                  <h3 className="mb-3 text-sm font-semibold text-[#173c32]">Attachments</h3>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {mediaUrls.map((media, index) => {
                      const url = resolveMediaUrl(media);
                      return (
                        <a
                          key={`${media}-${index}`}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden border border-[#dce2d8] rounded-xl bg-[#eff1e9]"
                        >
                          {isImageUrl(media) ? (
                            <Image
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              width={320}
                              height={240}
                              unoptimized
                              className="h-24 w-full object-cover"
                            />
                          ) : (
                            <div className="h-24 flex items-center justify-center px-3 text-center text-sm font-medium text-[#244637]">
                              Open attachment {index + 1}
                            </div>
                          )}
                          <p className="break-all px-3 py-2 text-xs text-[#59675b]">
                            Attachment {index + 1}
                          </p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
              {isAwaitingVerification && (
                  <div className="mb-8 border border-[#b8d9c4] rounded-xl bg-[#e5f3eb] p-6">
                    <h3 className="mb-3 text-sm font-semibold text-[#187a58]">Resolution verification</h3>
                    <p className="mb-4 text-sm text-[#31584b]">
                      A resolution has been proposed for this report. Please review the evidence below and confirm whether the issue has been resolved.
                    </p>
                    {resolutionMediaUrls.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-2 text-xs font-semibold text-[#31584b]">Resolution evidence</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {resolutionMediaUrls.map((media, index) => {
                            const url = resolveMediaUrl(media);
                            return (
                              <a
                                key={`${media}-${index}`}
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="block overflow-hidden border border-[#b8d9c4] rounded-xl bg-[#e5f3eb]"
                              >
                                {isImageUrl(media) ? (
                                  <Image
                                    src={url}
                                    alt={`Resolution evidence ${index + 1}`}
                                    width={320}
                                    height={240}
                                    unoptimized
                                    className="h-24 w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-24 flex items-center justify-center px-3 text-center text-sm font-medium text-[#187a58]">
                                    Open evidence {index + 1}
                                  </div>
                                )}
                                <p className="break-all px-3 py-2 text-xs text-[#31584b]">
                                  Evidence {index + 1}
                                </p>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}
                      {report.resolutionNotes && (
                        <div className="mb-4">
                          <p className="mb-1 text-xs font-semibold text-[#31584b]">Resolution notes</p>
                          <p className="text-sm text-[#31584b]">{report.resolutionNotes}</p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(report.id)}/accept-resolution`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ feedback: "Resolution accepted by citizen." }),
                            })
                              .then((res) => {
                                if (!res.ok) throw new Error("Failed to accept resolution.");
                                return res.json();
                              })
                              .then(() => {
                                setLoading(true);
                                window.location.reload();
                              })
                              .catch((err) => alert(err.message));
                          }}
                          className="flex-1 bg-[#244637] px-4 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
                        >
                          Accept resolution
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = prompt("Please provide a reason for rejecting the resolution:");
                            if (!reason || !reason.trim()) return;
                            fetch(`${API_BASE_URL}/api/reports/${encodeURIComponent(report.id)}/reject-resolution`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ reason: reason.trim() }),
                            })
                              .then((res) => {
                                if (!res.ok) throw new Error("Failed to reject resolution.");
                                return res.json();
                              })
                              .then(() => {
                                setLoading(true);
                                window.location.reload();
                              })
                              .catch((err) => alert(err.message));
                          }}
                          className="flex-1 border border-[#9c654d] px-4 py-3 text-sm font-semibold text-[#7d4435] hover:bg-[#f5e9df]"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                )}

                <div className="mb-8">
                  <h3 className="mb-3 text-sm font-semibold text-[#173c32]">Status history</h3>
                  {history.length === 0 ? (
                    <p className="text-sm text-[#687468]">No status history available.</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((entry, index) => (
                        <div key={entry.id || index} className="flex gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#dce2d8] text-[#244637] font-medium text-xs">
                            {history.length - index}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#243329]">
                              {STATUS_LABELS[normalizeStatus(entry.toStatus)] || entry.toStatus || "Status change"}
                            </p>
                            <p className="mt-1 text-xs text-[#687468]">
                              {entry.notes || ""}
                              {entry.createdAt ? ` Â· ${formatDate(entry.createdAt)}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </article>
        </main>
      </>
    );
  }
