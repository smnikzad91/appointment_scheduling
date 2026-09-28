import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "center" | "start";
  className?: string;
}

export function SectionHeading({ eyebrow, title, description, align = "center", className }: SectionHeadingProps) {
  const alignment = align === "center" ? "mx-auto text-center" : "text-right";

  return (
    <div className={`max-w-2xl ${alignment} ${className ?? ""}`}>
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/70 bg-gradient-to-r from-brand-50 to-g-accent-2/10 px-3.5 py-1 text-xs font-semibold tracking-wide text-brand-600 dark:border-brand-500/25 dark:from-brand-500/10 dark:to-g-accent-2/10 dark:text-g-accent">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-g-ink sm:text-4xl" style={{ textWrap: "balance" }}>
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-gray-600 dark:text-g-muted">
          {description}
        </p>
      )}
    </div>
  );
}
