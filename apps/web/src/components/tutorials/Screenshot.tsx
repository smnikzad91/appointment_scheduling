"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import shots from "@/content/tutorialShots.json";
import { toPersianDigits } from "@/lib/persian";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
const SHOTS = shots as Record<string, { w: number; h: number; boxes: Box[] }>;

/** Numbered glowing frames over the key buttons/fields; positions are % of the image. */
function Highlights({ boxes, labels }: { boxes: Box[]; labels?: string[] }) {
  return (
    <>
      {boxes.map((b, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-[10px] border-2 border-g-accent-3 shadow-[0_0_0_3px_rgb(246_180_107/0.25),0_0_18px_2px_rgb(242_135_106/0.55)] motion-safe:animate-[tut-pulse_2.4s_ease-in-out_infinite]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, animationDelay: `${i * 0.3}s` }}
          aria-hidden
        >
          <span className="absolute -right-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[image:var(--g-gradient)] text-xs font-black text-[#1a0f14] shadow-md">
            {toPersianDigits(i + 1)}
          </span>
          {labels?.[i] && <span className="sr-only">{labels[i]}</span>}
        </span>
      ))}
    </>
  );
}

export default function Screenshot({ id, alt, callouts }: { id: string; alt: string; callouts?: string[] }) {
  const [open, setOpen] = useState(false);
  const shot = SHOTS[id];
  if (!shot) return null;
  const src = `/tutorials/${id}.webp`;

  return (
    <figure className="w-full max-w-[300px]">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full overflow-hidden rounded-[28px] border border-g-line-strong bg-g-bg-2 p-1.5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.9)] transition hover:border-g-accent/40"
        aria-label={`بزرگ‌نمایی تصویر: ${alt}`}
      >
        <span className="relative block overflow-hidden rounded-[22px]">
          <Image src={src} alt={alt} width={shot.w} height={shot.h} sizes="300px" className="block h-auto w-full" />
          <Highlights boxes={shot.boxes} labels={callouts} />
        </span>
        <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white opacity-80 backdrop-blur transition group-hover:opacity-100">
          <Maximize2 className="h-3 w-3" aria-hidden />
          بزرگ‌نمایی
        </span>
      </button>
      {callouts && callouts.length > 0 && (
        <figcaption>
          <ol className="mt-3 flex flex-col gap-1.5 text-[13px] text-g-muted">
            {callouts.map((c, i) => (
              <li key={c} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-g-accent/15 text-[11px] font-black text-g-accent">
                  {toPersianDigits(i + 1)}
                </span>
                {c}
              </li>
            ))}
          </ol>
        </figcaption>
      )}
      {open && <Lightbox src={src} alt={alt} shot={shot} callouts={callouts} onClose={() => setOpen(false)} />}
    </figure>
  );
}

function Lightbox({
  src,
  alt,
  shot,
  callouts,
  onClose,
}: {
  src: string;
  alt: string;
  shot: { w: number; h: number; boxes: Box[] };
  callouts?: string[];
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const close = useCallback(() => onClose(), [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [close]);

  // Tap to zoom 2× around the tapped point; tap again to zoom out.
  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (zoom) return setZoom(null);
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  return createPortal(
    <div
      className="app-root guest-root fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-md motion-safe:animate-[app-fade-in_0.2s_ease-out]"
      style={{ background: "rgb(0 0 0 / 0.85)" }}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      dir="rtl"
      onClick={close}
    >
      <div className="absolute left-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            close();
          }}
          aria-label="بستن"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => (z ? null : { x: 50, y: 40 }));
          }}
          aria-label={zoom ? "کوچک‌نمایی" : "بزرگ‌نمایی"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          {zoom ? <ZoomOut className="h-5 w-5" aria-hidden /> : <ZoomIn className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <div
        className={`relative overflow-hidden rounded-[26px] border border-white/15 shadow-2xl ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        style={{ height: "min(86dvh, 900px)", aspectRatio: `${shot.w} / ${shot.h}`, maxWidth: "92vw" }}
        onClick={toggleZoom}
      >
        <div
          className="relative h-full w-full transition-transform duration-300 ease-out"
          style={zoom ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
        >
          <Image src={src} alt={alt} fill sizes="(max-width: 640px) 92vw, 420px" className="object-contain" priority />
          <Highlights boxes={shot.boxes} labels={callouts} />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-white/60">برای بزرگ‌نمایی روی تصویر بزنید؛ Esc یا بیرون تصویر برای بستن.</p>
    </div>,
    document.body,
  );
}
