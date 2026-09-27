"use client";

import { useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import type { GalleryImage } from "@/types/salon";
import PlaceholderArt from "./PlaceholderArt";
import { toPersianDigits } from "@/lib/persian";

const SWIPE_MIN_PX = 50;

export default function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // RTL: visually-right arrow key moves to the previous image, visually-left moves to next.
      if (images.length < 2) return;
      if (e.key === "ArrowRight") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index + 1) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onClose, onIndexChange]);

  // Keep the page behind from scrolling while the viewer is open (matters on phones).
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const multiple = images.length > 1;
  const prev = () => onIndexChange((index - 1 + images.length) % images.length);
  const next = () => onIndexChange((index + 1) % images.length);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !multiple) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy)) return;
    // RTL: the next image sits to the left, so dragging the photo rightwards reveals it.
    if (dx > 0) next();
    else prev();
  }

  const image = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="نمایش بزرگ تصویر"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="بستن"
        className="absolute end-4 top-4 rounded-full bg-black/45 p-2 text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/60"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      {multiple && (
        <span className="absolute start-4 top-5 rounded-full bg-black/45 px-3 py-1 text-sm font-medium text-white/90 ring-1 ring-white/15 backdrop-blur" aria-live="polite">
          {toPersianDigits(index + 1)} از {toPersianDigits(images.length)}
        </span>
      )}

      {multiple && (
      <button
        type="button"
        aria-label="تصویر قبلی"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/60"
      >
        <ChevronRight className="h-6 w-6" aria-hidden />
      </button>
      )}

      <div className="h-[70vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt} className="h-full w-full rounded-lg object-contain" />
        ) : (
          <PlaceholderArt seed={image.id} className="h-full w-full rounded-lg" />
        )}
        <p className="mt-2 text-center text-sm text-white/80">{image.alt}</p>
      </div>

      {multiple && (
      <button
        type="button"
        aria-label="تصویر بعدی"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white ring-1 ring-white/15 backdrop-blur hover:bg-black/60"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden />
      </button>
      )}
    </div>
  );
}
