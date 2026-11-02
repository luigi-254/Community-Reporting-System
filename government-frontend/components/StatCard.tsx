export default function StatCard({ label, value, detail, color = "text-[#244637]", className = "" }: { label: string; value: string | number; detail?: string; color?: string; className?: string }) {
  return (
    <div
      className={`border border-[#dce2d8] bg-[#fdfdf9] p-5 rounded-xl shadow-sm ${className}`}
    >
      <p className="text-sm text-[#687468]">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tabular-nums ${color}`}>{value}</p>
      {detail && <p className="mt-2 text-xs text-[#687468]">{detail}</p>}
    </div>
  );
}
