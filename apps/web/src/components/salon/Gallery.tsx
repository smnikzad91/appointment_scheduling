"use client";

import { useState } from "react";
import type { GalleryImage } from "@/types/salon";
import PlaceholderArt from "./PlaceholderArt";
import Lightbox from "./Lightbox";

export default function Gallery({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <section id="gallery" className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="mb-4 text-lg font-bold">گالری تصاویر</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, i) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="aspect-square overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: "var(--salon-brand)" }}
            aria-label={image.alt}
          >
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt={image.alt} className="h-full w-full object-cover transition hover:scale-105" />
            ) : (
              <PlaceholderArt seed={image.id} className="h-full w-full transition hover:scale-105" />
            )}
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox images={images} index={openIndex} onClose={() => setOpenIndex(null)} onIndexChange={setOpenIndex} />
      )}
    </section>
  );
}
