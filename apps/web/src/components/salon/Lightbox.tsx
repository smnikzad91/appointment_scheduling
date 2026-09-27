"use client";

import { useEffect } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import type { GalleryImage } from "@/types/salon";
import PlaceholderArt from "./PlaceholderArt";

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
      if (e.key === "ArrowRight") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index + 1) % images.length);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [index, images.length, onClose, onIndexChange]);

  const image = images[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="نمایش بزرگ تصویر"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="بستن"
        className="absolute end-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <button
        type="button"
        aria-label="تصویر قبلی"
        onClick={(e) => {
          e.stopPropagation();
          onIndexChange((index - 1 + images.length) % images.length);
        }}
        className="absolute start-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <ChevronRight className="h-6 w-6" aria-hidden />
      </button>

      <div className="h-[70vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        {image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.url} alt={image.alt} className="h-full w-full rounded-lg object-contain" />
        ) : (
          <PlaceholderArt seed={image.id} className="h-full w-full rounded-lg" />
        )}
        <p className="mt-2 text-center text-sm text-white/80">{image.alt}</p>
      </div>

      <button
        type="button"
        aria-label="تصویر بعدی"
        onClick={(e) => {
          e.stopPropagation();
          onIndexChange((index + 1) % images.length);
        }}
        className="absolute end-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <ChevronLeft className="h-6 w-6" aria-hidden />
      </button>
    </div>
  );
}
