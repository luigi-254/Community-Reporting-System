export default function StatCard({ 
  label, 
  value, 
  detail, 
  icon: Icon, 
  iconColor = "text-slate-600", 
  bgColor = "bg-slate-100", 
  className = "" 
}) {
  return (
    <div
      className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative ${className}`}
    >
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      </div>
      {Icon && (
        <div className="absolute top-4 right-4 p-2 rounded-lg {bgColor}">
          <Icon className="w-5 h-5 shrink-0 {iconColor}" strokeWidth={2} />
        </div>
      )}
      {detail && <p className="mt-2 text-xs text-gray-600">{detail}</p>}
    </div>
  );
}
