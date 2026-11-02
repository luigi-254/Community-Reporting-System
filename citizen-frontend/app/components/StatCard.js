export default function StatCard({ label, value, detail, icon: Icon, color = "text-[#244637]", className = "" }) {
  return (
    <div
      className={`border border-[#dce2d8] bg-[#fdfdf9] p-4 rounded-xl shadow-sm ${className}`}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e5f3eb]">
            <Icon className="w-6 h-6 text-[#187a58]" strokeWidth={2} />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-[#173c32]">{label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
        </div>
      </div>
      {detail && <p className="mt-2 text-xs text-[#687468]">{detail}</p>}
    </div>
  );
}
