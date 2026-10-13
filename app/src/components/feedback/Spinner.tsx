export function Spinner({ className = 'w-6 h-6 text-blue-600', text }: { className?: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
      <svg
        className={`animate-spin ${className}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      {text && <p className="mt-3 text-sm text-slate-500 font-medium">{text}</p>}
      <span className="sr-only">Chargement en cours...</span>
    </div>
  );
}
