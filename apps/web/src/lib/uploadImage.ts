const MAX_EDGE = 1920; // px — plenty for phone screens, and keeps uploads well under the 5 MB limit
const JPEG_QUALITY = 0.85;

/**
 * Phone photos are often 4000px+ and 5–10 MB. Downscale to MAX_EDGE and re-encode as JPEG in the
 * browser before uploading. GIFs (animation) and files the browser can't decode go up untouched.
 */
async function shrinkForUpload(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  // Already small and a web-friendly format — nothing to gain.
  if (scale === 1 && file.size < 1_500_000 && file.type !== "image/heic") {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

export async function uploadImage(file: File, folder: "salons" | "stylists" | "banners" | "expenses"): Promise<string> {
  const formData = new FormData();
  formData.append("file", await shrinkForUpload(file));

  const res = await fetch(`/api/upload?folder=${folder}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "خطا در آپلود تصویر");
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

/**
 * Asks the server to delete photos that were just replaced or removed (or uploaded but never
 * saved). Call it after the save has gone through; the server only deletes files no row still
 * references. Fire-and-forget — a missed cleanup is caught by the server's daily sweep.
 */
export function releaseUploads(urls: (string | null | undefined)[]): void {
  const list = urls.filter((u): u is string => !!u);
  if (list.length === 0) return;
  fetch("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls: list }),
    keepalive: true,
  }).catch(() => {});
}
