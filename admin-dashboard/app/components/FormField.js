export default function FormField({ label, id, error, required, children, hint }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#173c32]"
      >
        {label}
        {required && <span className="text-[#187a58] font-normal ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[#8b392f]" role="alert" id={`${id}-error`}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[#687468]">{hint}</p>
      )}
    </div>
  );
}
