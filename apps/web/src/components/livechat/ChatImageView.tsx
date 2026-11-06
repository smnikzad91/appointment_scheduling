"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";

/** Upload progress for an image being sent: null = preparing, 0..1 = uploading, 1 = the server is processing. */
export const uploadLabel = (progress?: number | null) =>
  progress == null ? "آماده‌سازی تصویر…" : progress < 1 ? `در حال بارگذاری… ${Math.round(progress * 100).toLocaleString("fa-IR")}٪` : "در حال ارسال…";

/** Ring + percentage over an image being uploaded. */
export function UploadOverlay({ progress, small }: { progress: number | null; small?: boolean }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/45" role="progressbar" aria-label="بارگذاری تصویر" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress == null ? undefined : Math.round(progress * 100)}>
      <svg viewBox="0 0 44 44" className={`${small ? "h-9 w-9" : "h-12 w-12"} ${progress == null ? "animate-spin" : ""}`} aria-hidden="true">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={progress == null ? c * 0.75 : c * (1 - progress)} transform="rotate(-90 22 22)" />
      </svg>
      {progress != null && <span className={`absolute ${small ? "text-[9px]" : "text-[11px]"} font-bold tabular-nums text-white`}>{Math.round(progress * 100).toLocaleString("fa-IR")}٪</span>}
    </div>
  );
}

/** A chat image full screen (✕, Esc or a tap outside closes it). */
export function ChatImageView({ src, caption, onClose }: { src: string; caption?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="تصویر" dir="rtl" className="fixed inset-0 z-[100001] flex flex-col items-center justify-center gap-3 bg-black/90 p-4" onClick={onClose}>
      <div className="absolute end-3 top-3 flex gap-2">
        <a href={src} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="باز کردن در زبانه تازه" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <ExternalLink className="h-5 w-5" />
        </a>
        <button type="button" onClick={onClose} aria-label="بستن" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-checked image */}
      <img src={src} alt={caption || "تصویر پیوست"} className="max-h-[85dvh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
      {caption && <p className="max-w-lg whitespace-pre-wrap text-center text-sm leading-7 text-white/85">{caption}</p>}
    </div>,
    document.body,
  );
}
