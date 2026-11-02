import { Inbox, Clock, AlertCircle, Mail } from "lucide-react";

const EMPTY_CONFIG = {
  reports: { icon: Inbox, title: "No reports submitted yet", description: "Submit your first community issue to begin tracking it." },
  notifications: { icon: Mail, title: "No notifications yet", description: "Updates about your reports will appear here." },
  general: { icon: Clock, title: "No data available", description: "There are no records to display at this time." },
  error: { icon: AlertCircle, title: "Unable to load data", description: "Please try again or contact support if the issue persists." },
};

export default function EmptyState({ type = "general", title, description, ctaLabel, onCta, className = "" }) {
  const config = EMPTY_CONFIG[type] || EMPTY_CONFIG.general;
  const Icon = config.icon;

  return (
    <div
      className={`border border-[#dce2d8] bg-[#fdfdf9] p-8 text-center rounded-xl ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eff1e9] text-[#687468] mb-4">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-[#173c32]">{title || config.title}</h3>
      <p className="mt-2 text-sm text-[#687468]">{description || config.description}</p>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#244637] px-5 py-3 text-sm font-semibold text-white hover:bg-[#19372a] transition"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
