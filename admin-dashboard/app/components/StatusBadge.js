import { CheckCircle, Clock, AlertTriangle, ShieldAlert, Mail } from "lucide-react";

const STATUS_CONFIG = {
  SUBMITTED: { label: "Submitted", icon: Mail, color: "bg-[#e6ece3] text-[#31543a] border-[#cddbd1]" },
  PENDING: { label: "Pending", icon: Clock, color: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]" },
  UNDER_REVIEW: { label: "Under review", icon: ShieldAlert, color: "bg-[#e4e8dd] text-[#344338] border-[#c9d4cb]" },
  IN_PROGRESS: { label: "In progress", icon: Clock, color: "bg-[#dce8d8] text-[#244637] border-[#bcd6c2]" },
  RESOLVED: { label: "Resolved", icon: CheckCircle, color: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]" },
  REJECTED: { label: "Rejected", icon: AlertTriangle, color: "bg-[#fff3f0] text-[#8b392f] border-[#f1c9c2]" },
  ESCALATED: { label: "Escalated", icon: AlertTriangle, color: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]" },
  CLOSED: { label: "Closed", icon: CheckCircle, color: "bg-[#e5f3eb] text-[#187a58] border-[#b8d9c4]" },
  REOPENED: { label: "Reopened", icon: Clock, color: "bg-[#f0ebd9] text-[#66572f] border-[#e3d9c2]" },
  CANCELLED: { label: "Cancelled", icon: AlertTriangle, color: "bg-[#f2e2dc] text-[#7d4435] border-[#e5d5cf]" },
  DUPLICATE: { label: "Duplicate", icon: Mail, color: "bg-[#e8eee9] text-[#687468] border-[#d1d9d3]" },
};

function normalizeStatus(value) {
  return String(value || "SUBMITTED")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

export default function StatusBadge({ status, size = "md", className = "" }) {
  const key = normalizeStatus(status);
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.SUBMITTED;

  const Icon = config.icon;
  const sizes = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-xs font-semibold",
    lg: "px-4 py-2 text-sm font-semibold",
  };

  return (
    <span
      aria-label={config.label}
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.color} ${sizes[size]} ${className}`}
    >
      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}
