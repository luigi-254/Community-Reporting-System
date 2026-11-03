"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import StatusBadge from "../../components/StatusBadge";
import { normalizeReport, formatDate, resolveMediaUrl, isImageUrl, toSentenceCase } from "../utils/reportUtils";
import Image from "next/image";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

const STATUS_OPTIONS = [
  "All",
  "Submitted",
  "Pending",
  "Under review",
  "In progress",
  "Resolved",
  "Rejected",
  "Escalated",
];

export default function MyReports({ token }) {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReports = useCallback(async (accessToken, pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
        ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      });
      const response = await fetch(
        `${API_BASE_URL}/api/reports/me?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      );
      if (!response.ok) throw new Error("Failed to load reports");
      const data = await response.json();
      const raw = Array.isArray(data?.data?.reports) ? data.data.reports : [];
      setReports(raw.map(normalizeReport));
      setTotal(data?.data?.total || raw.length);
      setTotalPages(Math.ceil((data?.data?.total || raw.length) / 20));
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    if (!token) return;
    fetchReports(token);
  }, [token, fetchReports]);

  const filteredReports = reports.filter((report) => {
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      report.id.toLowerCase().includes(query) ||
      String(report.title || "").toLowerCase().includes(query) ||
      String(report.category || "").toLowerCase().includes(query) ||
      String(report.location || "").toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "All" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && reports.length === 0) {
    return (
      <div className="border border-[#dce2d8] bg-[#fdfdf9] p-8 text-sm text-[#687468]">
        Loading your reports...
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-[#f1c9c2] bg-[#fff3f0] p-6 rounded-xl text-[#8b392f]" role="alert">
        <p className="font-semibold">Could not retrieve your reports: {error}</p>
        <button
          type="button"
          onClick={() => fetchReports(token, 1)}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#187a58] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (filteredReports.length === 0) {
    return (
      <div className="border border-[#dce2d8] bg-[#fdfdf9] p-8">
        <h3 className="font-semibold">
          {reports.length === 0
            ? "You have not submitted any reports yet."
            : "No reports match your search."}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#687468]">
          {reports.length === 0
            ? "When you submit a community issue, it will appear here."
            : "Try a different search term or status filter."}
        </p>
        {reports.length === 0 && (
          <button
            type="button"
            className="mt-5 bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a]"
          >
            Report an Issue
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {filteredReports.map((report) => (
        <Link key={report.id} href={`/reports/${report.id}`} className="block">
          <article className="border border-[#dce2d8] bg-[#fdfdf9] p-5 sm:p-6 hover:border-[#244637] transition-colors">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#55745c]">
                {report.id}
              </p>
              <h3 className="mt-2 text-lg font-semibold capitalize">{toSentenceCase(report.title)}</h3>
              <p className="mt-2 text-sm text-[#687468]">
                {toSentenceCase(report.category)} ·{" "}
                {toSentenceCase(report.location || "Location not specified")}
              </p>
            </div>
            <StatusBadge status={report.status} size="md" />
          </div>

          {report.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[#59675b]">
              {toSentenceCase(report.description)}
            </p>
          )}

          {report.mediaUrls.length > 0 && (
            <div className="mt-5 border-t border-[#e5e9e1] pt-5">
              <h4 className="mb-3 text-sm font-semibold">Attachments</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {report.mediaUrls.map((media, index) => {
                  const url = resolveMediaUrl(media, API_BASE_URL);
                  return (
                    <div
                      key={`${media}-${index}`}
                      onClick={() => window.open(url, "_blank")}
                      className="block overflow-hidden border border-[#dce2d8] bg-[#eff1e9] cursor-pointer hover:bg-[#f2f7f3] transition-colors"
                    >
                      {isImageUrl(media) ? (
                        <Image
                          src={url}
                          alt={`Attachment ${index + 1} for ${report.title}`}
                          width={480}
                          height={240}
                          unoptimized
                          className="h-36 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-28 items-center justify-center px-3 text-center text-sm font-medium text-[#244637]">
                          Open attachment {index + 1}
                        </div>
                      )}
                      <p className="break-all px-3 py-2 text-xs text-[#59675b]">
                        View attachment {index + 1}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-[#e5e9e1] pt-4 text-xs text-[#7a8378]">
            Date submitted: {formatDate(report.createdAt || report.date)}
          </div>
        </article>
        </Link>
      ))}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm text-[#687468]">
          <p>Page {page} of {totalPages} ({total} reports)</p>
          <div className="flex gap-2">
            <button
              onClick={() => page > 1 && fetchReports(token, page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border border-[#cbd6c8] rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => page < totalPages && fetchReports(token, page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border border-[#cbd6c8] rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
