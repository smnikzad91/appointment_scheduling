"use client";

import { useEffect, useState } from "react";
import { toPersianDigits } from "@/lib/persian";

/**
 * Anchor list of the guide's steps. Desktop: a sticky side column; phones: a sticky, swipeable
 * chip strip under the header. The step currently in view is marked.
 */
export default function StepToc({ steps, variant }: { steps: { title: string }[]; variant: "side" | "strip" }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const els = steps.map((_, i) => document.getElementById(`step-${i + 1}`)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(Number(visible[0].target.id.replace("step-", "")) - 1);
      },
      { rootMargin: "-30% 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [steps]);

  if (variant === "strip") {
    return (
      <nav aria-label="مراحل" className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {steps.map((s, i) => (
          <a
            key={i}
            href={`#step-${i + 1}`}
            aria-current={active === i ? "step" : undefined}
            className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-bold transition ${
              active === i ? "border-transparent bg-[image:var(--g-gradient)] text-[#1a0f14]" : "border-g-line bg-g-glass-soft text-g-muted"
            }`}
          >
            {toPersianDigits(i + 1)}
            <span className="max-w-[9rem] truncate font-medium">{s.title}</span>
          </a>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="مراحل" className="g-glass-soft rounded-3xl p-4">
      <p className="mb-3 px-1 text-xs font-bold text-g-faint">در این راهنما</p>
      <ol className="relative flex flex-col gap-0.5">
        <span aria-hidden className="absolute bottom-3 right-[15px] top-3 w-px bg-g-line" />
        {steps.map((s, i) => (
          <li key={i}>
            <a
              href={`#step-${i + 1}`}
              aria-current={active === i ? "step" : undefined}
              className={`relative flex items-start gap-3 rounded-xl px-1 py-2 text-[13px] leading-6 transition ${active === i ? "text-g-ink" : "text-g-muted hover:text-g-ink"}`}
            >
              <span
                className={`relative z-10 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-black transition ${
                  active === i ? "bg-[image:var(--g-gradient)] text-[#1a0f14] shadow-[0_0_14px_-2px_rgb(242_135_106/0.8)]" : "border border-g-line-strong bg-g-bg-2 text-g-faint"
                }`}
              >
                {toPersianDigits(i + 1)}
              </span>
              <span className={active === i ? "font-bold" : ""}>{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
