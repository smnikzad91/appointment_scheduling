"use client";

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
