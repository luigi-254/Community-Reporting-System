"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import StatusBadge from "../../components/StatusBadge";
import StatCard from "../../components/StatCard";
import { normalizeReport, formatDate, toSentenceCase } from "../utils/reportUtils";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "crs_citizen_access_token";

export default function Overview({ token, user, onReportClick }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/api/reports/me?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load reports");
        return res.json();
      })
      .then((data) => {
        const raw = Array.isArray(data?.data?.reports) ? data.data.reports : [];
        setReports(raw.map(normalizeReport));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const pendingCount = reports.filter((r) =>
    ["Pending", "Submitted", "Under review"].includes(r.status)
  ).length;
  const inProgressCount = reports.filter((r) => r.status === "In progress").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const overdueCount = reports.filter((r) => {
    if (["Resolved", "Rejected", "Escalated", "Cancelled"].includes(r.status))
      return false;
    const ageDays = (now - new Date(r.createdAt || r.date).getTime()) / 86400000;
    return ageDays > 7;
  }).length;

  const firstName = String(user?.name || "Citizen").split(" ")[0];

  if (loading) {
    return (
      <section className="border-b pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
          Citizen services
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome, {firstName}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#687468] sm:text-base">
              Report problems in your community and follow the
              progress of the issues you have submitted.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center gap-3 self-start bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] md:self-auto"
          >
            Report an Issue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="border-b pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55745c]">
          Citizen services
        </p>
        <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome, {firstName}.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#687468] sm:text-base">
              Report problems in your community and follow the
              progress of the issues you have submitted.
            </p>
          </div>
          {error && (
            <div className="mb-5 border-l-4 border-[#9c654d] bg-[#f5e9df] p-4 text-sm leading-6 text-[#70452f]">
              Could not retrieve your reports: {error}
            </div>
          )}
          <button
            type="button"
            onClick={() => onReportClick?.("Report an Issue")}
            className="inline-flex min-h-12 items-center justify-center gap-3 self-start bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] md:self-auto"
          >
            Report an Issue <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section className="mt-7 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {[
          {
            label: "My Reports",
            value: reports.length,
            Icon: FileText,
            iconColor: "text-slate-600",
            bgColor: "bg-slate-100",
          },
          { label: "Pending", value: pendingCount, Icon: Clock, iconColor: "text-amber-600", bgColor: "bg-amber-100" },
          { label: "In Progress", value: inProgressCount, Icon: RefreshCw, iconColor: "text-blue-600", bgColor: "bg-blue-100" },
          { label: "Resolved", value: resolvedCount, Icon: CheckCircle2, iconColor: "text-emerald-600", bgColor: "bg-emerald-100" },
          { label: "Overdue", value: overdueCount, Icon: AlertTriangle, iconColor: "text-red-600", bgColor: "bg-red-100" },
        ].map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            Icon={stat.Icon}
            iconColor={stat.iconColor}
            bgColor={stat.bgColor}
          />
        ))}
      </section>

      <section className="mt-8 border border-[#dce2d8] bg-[#fdfdf9]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2d8] px-5 py-5">
          <div>
            <h3 className="font-semibold">Recent Reports</h3>
            <p className="mt-1 text-sm text-[#687468]">
              Reports retrieved from your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onReportClick?.("My Reports")}
            className="text-sm font-semibold text-[#244637] underline-offset-4 hover:underline"
          >
            View all
          </button>
        </div>

        {reports.length === 0 ? (
          <div className="p-7">
            <h4 className="font-medium">No reports submitted yet</h4>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#687468]">
              Submit your first community issue to begin tracking it.
            </p>
            <button
              type="button"
              onClick={() => onReportClick?.("Report an Issue")}
              className="mt-5 border border-[#244637] px-4 py-2.5 text-sm font-semibold text-[#244637] hover:bg-[#eff1e9]"
            >
              Submit your first report
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#e5e9e1]">
            {reports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-start justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize">{toSentenceCase(report.title)}</p>
                  <p className="mt-1 text-xs text-[#7a8378]">
                    {report.id} · {toSentenceCase(report.location || "Location not specified")}
                  </p>
                  <p className="mt-2 text-xs text-[#687468]">
                    {formatDate(report.date)}
                  </p>
                </div>
                <StatusBadge status={report.status} size="sm" />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
