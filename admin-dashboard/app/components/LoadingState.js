export default function LoadingState({ message = "Loading…", className = "" }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 text-sm text-[#687468] ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#e8eee9] border-t-[#244637] animate-[spin_1s_linear_infinite]" />
      <p>{message}</p>
    </div>
  );
}
