"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { releaseUploads, uploadImage } from "@/lib/uploadImage";
import { Button } from "./ui";

// Optional receipt/invoice photo on an expense (stylist and salon expense sheets). Receipts are
// private uploads (lib/privateUploads.ts): the server serves one only to its owner and only once a
// saved expense points at it, so a just-picked photo is previewed from the phone's own copy.

export type ReceiptFolder = "expenses" | "salon-expenses";

export function useReceipt(initial: string | null, folder: ReceiptFolder, onError: (message: string | null) => void) {
  const [url, setUrl] = useState<string | null>(initial);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Uploaded in this sheet; whichever doesn't end up saved is released.
  const uploaded = useRef<string[]>([]);
  useEffect(() => () => void (localPreview && URL.revokeObjectURL(localPreview)), [localPreview]);

  function release(urls: (string | null)[]) {
    releaseUploads(urls);
    uploaded.current = [];
  }

  return {
    url,
    uploading,
    previewSrc: url && (localPreview ?? url),
    async pick(file: File) {
      setUploading(true);
      onError(null);
      try {
        const next = await uploadImage(file, folder);
        uploaded.current.push(next);
        setUrl(next);
        setLocalPreview(URL.createObjectURL(file));
      } catch (err) {
        onError(err instanceof Error ? err.message : "آپلود رسید انجام نشد");
      } finally {
        setUploading(false);
      }
    },
    clear() {
      setUrl(null);
      setLocalPreview(null);
    },
    /** After a successful save: frees the replaced receipt and any unsaved uploads. */
    saved() {
      release([...uploaded.current, initial].filter((u) => u !== url));
    },
    /** After the expense was deleted: frees its receipt too. */
    deleted() {
      release([...uploaded.current, initial]);
    },
    /** Sheet closed without saving. */
    discard() {
      release(uploaded.current);
    },
  };
}

export type Receipt = ReturnType<typeof useReceipt>;

export function ReceiptField({ receipt }: { receipt: Receipt }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 px-1 text-[13px] font-bold text-app-muted">رسید یا فاکتور (اختیاری)</p>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void receipt.pick(file);
        }}
      />
      {receipt.previewSrc ? (
        <div className="relative overflow-hidden rounded-2xl border border-app-line bg-app-card-2">
          <a href={receipt.previewSrc} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receipt.previewSrc} alt="رسید هزینه" className="max-h-56 w-full object-contain" />
          </a>
          <button
            type="button"
            aria-label="حذف رسید"
            onClick={receipt.clear}
            className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white active:scale-90"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : (
        <Button variant="secondary" block icon={ImagePlus} busy={receipt.uploading} onClick={() => fileInput.current?.click()}>
          افزودن عکس رسید
        </Button>
      )}
    </div>
  );
}
