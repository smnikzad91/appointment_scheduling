import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingLabel?: string };

/** Full-width gradient CTA: lifts and glows on hover, a sheen sweeps across. */
export default function GradientButton({ loading, loadingLabel, children, className = "", disabled, ...props }: Props) {
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={`g-btn g-btn-primary h-14 w-full text-[15px] ${className}`}>
      {loading ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
