"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { toPersianDigits } from "@/lib/persian";

// Small, app-styled building blocks shared by the salon, stylist and customer panels.
// Colors come from the .app-root tokens in globals.css (bg-app-*, text-app-* …).

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/** Large page title with optional subtitle and a trailing action (e.g. an add button). */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[26px] font-black leading-tight tracking-tight text-app-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-app-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-bold text-app-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-3xl border border-app-line bg-app-card shadow-app", className)} {...rest}>
      {children}
    </div>
  );
}

/** Staggered entrance for list items — pass the item's index. */
export function riseStyle(index: number): React.CSSProperties {
  return { animationDelay: `${Math.min(index, 8) * 45}ms` };
}

export function StatTile({ label, value, tone = "ink", icon: Icon }: { label: string; value: number; tone?: "ink" | "accent" | "pending"; icon?: LucideIcon }) {
  const toneClass = tone === "accent" ? "text-app-accent" : tone === "pending" ? "text-app-pending" : "text-app-ink";
  return (
    <div className="min-w-0 flex-1 rounded-3xl border border-app-line bg-app-card p-4 shadow-app">
      {Icon && <Icon className={cx("mb-3 h-5 w-5", toneClass)} aria-hidden />}
      <p className={cx("text-[28px] font-black leading-none", toneClass)}>{toPersianDigits(value)}</p>
      <p className="mt-1.5 text-xs font-medium text-app-muted">{label}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-app-line px-6 py-12 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="font-bold text-app-ink">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm leading-6 text-app-muted">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-3xl bg-app-card-2" />
      ))}
    </div>
  );
}

export function ErrorBanner({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-app-danger/10 px-4 py-3 text-sm font-medium text-app-danger">
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 rounded-full px-3 py-1 font-bold underline-offset-4 hover:underline">
          تلاش دوباره
        </button>
      )}
    </div>
  );
}

export function SuccessNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl bg-app-done/10 px-4 py-3 text-sm font-medium text-app-done">{children}</p>;
}

/** Horizontally scrolling filter chips (with optional counts). */
export function ChipTabs<T extends string>({
  options,
  value,
  onChange,
  bleed = true,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Scroll edge-to-edge past the page padding; turn off when something sits beside the row. */
  bleed?: boolean;
}) {
  return (
    <div className={cx("mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]", bleed && "-mx-4 px-4")} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95",
              active ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count > 0 && (
              <span className={cx("rounded-full px-1.5 text-[11px] leading-5", active ? "bg-app-bg/20" : "bg-app-card-2")}>
                {toPersianDigits(o.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-app-accent text-app-accent-ink shadow-[0_8px_20px_-10px_var(--app-accent)] active:bg-app-accent-strong",
  secondary: "border border-app-line bg-app-card text-app-ink active:bg-app-card-2",
  ghost: "text-app-ink active:bg-app-card-2",
  danger: "bg-app-danger/10 text-app-danger active:bg-app-danger/20",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean; icon?: LucideIcon; busy?: boolean }
>(function Button({ variant = "primary", block, icon: Icon, busy, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || busy}
      className={cx(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-bold transition active:scale-[0.98] disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-[18px] w-[18px]" aria-hidden />}
      {busy ? "لطفاً صبر کنید…" : children}
    </button>
  );
});

/** Circular icon button — used in page headers ("+") and the app bar. */
export function IconButton({ icon: Icon, label, onClick, href, tone = "accent" }: { icon: LucideIcon; label: string; onClick?: () => void; href?: string; tone?: "accent" | "plain" }) {
  const className = cx(
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90",
    tone === "accent" ? "bg-app-accent text-app-accent-ink shadow-[0_8px_20px_-10px_var(--app-accent)]" : "bg-app-card-2 text-app-ink",
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={className}>
        <Icon className="h-5 w-5" aria-hidden />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} onClick={onClick} className={className}>
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="px-1 text-[13px] font-bold text-app-muted">{label}</span>}
      {children}
      {hint && <span className="px-1 text-xs text-app-muted">{hint}</span>}
    </label>
  );
}

const INPUT_CLASS =
  "w-full rounded-2xl border border-app-line bg-app-card px-4 text-app-ink placeholder:text-app-muted/70 outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/15";

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(INPUT_CLASS, "h-12", className)} {...rest} />;
});

export function TextArea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(INPUT_CLASS, "py-3 leading-7", className)} {...rest} />;
}

/** iOS-style switch. */
export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (next: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-app-accent" : "bg-app-card-2 ring-1 ring-inset ring-app-line",
      )}
    >
      <span
        className={cx(
          "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
          // Mirrored for RTL like iOS/Android: off rests at the right, on slides to the left.
          checked ? "right-[calc(100%-1.75rem)]" : "right-1",
        )}
      />
    </button>
  );
}

export function Avatar({
  name,
  src,
  size = 44,
  className,
  shape = "circle",
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  /** "square" = rounded square (salon logos). */
  shape?: "circle" | "square";
}) {
  return (
    <span
      className={cx("flex shrink-0 items-center justify-center overflow-hidden bg-app-accent-soft font-black text-app-accent", shape === "circle" && "rounded-full", className)}
      style={{ width: size, height: size, fontSize: size * 0.4, ...(shape === "square" && { borderRadius: size * 0.26 }) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        name.trim().slice(0, 1)
      )}
    </span>
  );
}

/** Grouped settings-style list: rounded card with hairline separators between rows. */
export function ListGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cx("divide-y divide-app-line overflow-hidden rounded-3xl border border-app-line bg-app-card shadow-app", className)}>{children}</div>;
}

/** Tappable card linking to another screen (icon, title, one-line description, chevron). */
export function LinkCard({ href, icon: Icon, title, subtitle, className }: { href: string; icon: LucideIcon; title: string; subtitle: string; className?: string }) {
  return (
    <Link href={href} className={cx("flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app active:scale-[0.99]", className)}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-app-ink">{title}</span>
        <span className="block truncate text-xs text-app-muted">{subtitle}</span>
      </span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-app-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Link>
  );
}
