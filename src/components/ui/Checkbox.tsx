"use client";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function Checkbox({ className = "", checked, onChange, ...props }: Props) {
  return (
    <label
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        className="peer sr-only"
        onChange={(e) => {
          e.stopPropagation();
          onChange?.(e);
        }}
        {...props}
      />
      <span
        className={`pointer-events-none flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150
          peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-1
          ${checked
            ? "border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400"
            : "border-slate-300 bg-slate-50 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-slate-500"
          }`}
      >
        {checked && (
          <svg
            className="h-3 w-3 text-white"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        )}
      </span>
    </label>
  );
}
