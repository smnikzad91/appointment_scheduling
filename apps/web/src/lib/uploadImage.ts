const MAX_EDGE = 1920; // px — plenty for phone screens
const JPEG_QUALITY = 0.85;
// Uploads are kept under ~1 MB: a web server in front of the app may reject bigger request bodies
// (nginx's default is 1 MB) with a page that isn't JSON, which used to surface as a vague error on
// phones with high-resolution cameras only.
const TARGET_BYTES = 900 * 1024;
const MAX_BYTES = 5 * 1024 * 1024; // the server's own limit
const WEB_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** An upload failure with a Persian message that's safe to show as is (see persianApiError). */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/** Decodes with createImageBitmap, or an <img> where that fails (older Safari; HEIC on iOS). */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void } | null> {
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // fall through to <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function encode(image: { source: CanvasImageSource; width: number; height: number }, maxEdge: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  // JPEG has no transparency: paint white under PNGs with alpha instead of black.
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);

/**
 * Phone photos are often 4000px+, 5–10 MB, sometimes HEIC, and some pickers report no type at
 * all. Anything the browser can decode is re-encoded as a JPEG of at most MAX_EDGE px and about
 * TARGET_BYTES; a small web-format file goes up untouched, and so do GIFs (animation).
 */
async function prepareForUpload(file: File): Promise<File> {
  const webType = WEB_TYPES.includes(file.type);
  if (file.type === "image/gif") {
    if (file.size > MAX_BYTES) throw new UploadError("حجم این عکس متحرک بیش از ۵ مگابایت است");
    return file;
  }

  const image = await decode(file);
  if (!image) {
    if (isHeic(file)) {
      throw new UploadError("این گوشی عکس را با فرمت HEIC ذخیره کرده که مرورگر نمی‌تواند باز کند؛ از عکس اسکرین‌شات بگیرید یا در تنظیمات دوربین فرمت JPEG را انتخاب کنید");
    }
    // Not decodable here but maybe fine for the server (it checks the bytes itself).
    if (file.size > MAX_BYTES) throw new UploadError("حجم عکس بیش از ۵ مگابایت است");
    return file;
  }

  try {
    const small = Math.max(image.width, image.height) <= MAX_EDGE;
    if (webType && small && file.size <= TARGET_BYTES) return file;
    // Step quality, then size, down until it fits.
    for (const [edge, quality] of [
      [MAX_EDGE, JPEG_QUALITY],
      [MAX_EDGE, 0.72],
      [1600, 0.72],
      [1280, 0.7],
    ] as const) {
      const blob = await encode(image, edge, quality);
      if (blob && (blob.size <= TARGET_BYTES || edge === 1280)) {
        return new File([blob], (file.name.replace(/\.\w+$/, "") || "photo") + ".jpg", { type: "image/jpeg" });
      }
    }
    return file;
  } finally {
    image.close();
  }
}

const UPLOAD_MESSAGES: Record<string, string> = {
  "Only image files are allowed": "این فایل عکس نیست یا فرمت آن پشتیبانی نمی‌شود (JPG، PNG یا WebP)",
  "File too large (max 5 MB)": "حجم عکس بیش از ۵ مگابایت است",
  "No file provided": "عکسی انتخاب نشد، دوباره تلاش کنید",
  Unauthorized: "نشست شما منقضی شده؛ لطفاً دوباره وارد شوید",
  Forbidden: "اجازه آپلود این فایل را ندارید",
};

export async function uploadImage(file: File, folder: "salons" | "stylists" | "banners" | "expenses" | "salon-expenses"): Promise<string> {
  const formData = new FormData();
  formData.append("file", await prepareForUpload(file));

  let res: Response;
  try {
    res = await fetch(`/api/upload?folder=${folder}`, { method: "POST", body: formData });
  } catch {
    throw new UploadError("ارسال عکس انجام نشد؛ اتصال اینترنت را بررسی کنید و دوباره تلاش کنید");
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    if (body?.error && UPLOAD_MESSAGES[body.error]) throw new UploadError(UPLOAD_MESSAGES[body.error]);
    if (res.status === 413) throw new UploadError("حجم عکس برای سرور زیاد است؛ عکس کوچک‌تری انتخاب کنید");
    if (res.status === 401) throw new UploadError(UPLOAD_MESSAGES.Unauthorized);
    throw new UploadError("آپلود عکس انجام نشد، دوباره تلاش کنید");
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
