export default function ErrorState({ message, onRetry, className = "" }) {
  return (
    <div
      className={`border border-[#f1c9c2] bg-[#fff3f0] p-6 rounded-xl text-[#8b392f] ${className}`}
      role="alert"
    >
      <p className="font-semibold">{message || "Something went wrong."}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#187a58] hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}
