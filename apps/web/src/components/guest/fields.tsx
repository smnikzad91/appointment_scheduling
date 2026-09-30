"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder"> & {
  label: string;
  /** Shown only while the field is focused and empty (the label sits in the placeholder's spot). */
  hint?: string;
  trailing?: ReactNode;
};

/** Glass input whose label floats up on focus or once filled; glowing accent ring on focus. */
export const FloatingInput = forwardRef<HTMLInputElement, InputProps>(function FloatingInput(
  { label, hint, trailing, id, className = "", style, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  // className/style go on the wrapper so it can take part in the entrance stagger.
  return (
    <div className={`g-field ${className}`} style={style}>
      <input
        ref={ref}
        id={inputId}
        // The floating label relies on :placeholder-shown, so a placeholder must always exist.
        placeholder={hint ?? " "}
        className={`g-input ${trailing ? "g-has-trailing" : ""}`}
        {...props}
      />
      <label htmlFor={inputId} className="g-label">
        {label}
      </label>
      {trailing}
    </div>
  );
});

export function PasswordInput(props: Omit<InputProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  return (
    <FloatingInput
      {...props}
      // shown as text, it's still a password: never kept as a draft (FormDraftKeeper)
      data-no-draft=""
      type={visible ? "text" : "password"}
      dir="ltr"
      trailing={
        <button
          type="button"
          className="g-trailing"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
          aria-pressed={visible}
        >
          <Eye className="g-eye h-5 w-5" data-on={visible} aria-hidden />
          <EyeOff className="g-eye h-5 w-5" data-on={!visible} aria-hidden />
        </button>
      }
    />
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder"> & { label: string; hint?: string };

export function FloatingTextArea({ label, hint, id, className = "", style, ...props }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={`g-field ${className}`} style={style}>
      <textarea id={inputId} placeholder={hint ?? " "} className="g-input" {...props} />
      <label htmlFor={inputId} className="g-label">
        {label}
      </label>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="g-rise rounded-2xl border border-g-danger/30 bg-g-danger/10 px-4 py-3 text-sm leading-6 text-g-danger">
      {children}
    </div>
  );
}

export function GlassCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer select-none items-start gap-3 text-sm leading-6 text-g-muted">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-g-line-strong bg-white/5 transition peer-checked:border-transparent peer-checked:bg-[image:var(--g-gradient)] peer-checked:shadow-[0_0_14px_-2px_rgb(242_135_106/0.8)] peer-focus-visible:ring-2 peer-focus-visible:ring-g-accent"
      >
        <svg viewBox="0 0 16 16" className={`h-3 w-3 text-[#1a0f14] transition ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}`} fill="none" stroke="currentColor" strokeWidth="2.6">
          <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

/** Four-segment meter under a new password. */
export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score =
    password.length < 6 ? 1 : password.length < 8 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const labels = ["", "ضعیف", "متوسط", "خوب", "عالی"];
  const colors = ["", "bg-g-danger", "bg-g-accent-3", "bg-g-success", "bg-[image:var(--g-gradient)]"];
  return (
    <div className="mt-2 px-1" aria-live="polite">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= score ? colors[score] : "bg-white/10"}`} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-g-faint">قدرت رمز: {labels[score]}</p>
    </div>
  );
}
