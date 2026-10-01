/**
 * The share kit's promotional poster, drawn on a <canvas> at print/story resolution (no DOM
 * screenshot, no extra library): platform header, cover + avatar, name, title, place, a large QR
 * code for the direct booking link and a call to action. Persian text uses the self-hosted
 * Vazirmatn (loaded before drawing) with the canvas in RTL.
 */

export type PosterFormat = "story" | "square" | "print";

export const POSTER_FORMATS: Record<PosterFormat, { label: string; hint: string; w: number; h: number }> = {
  story: { label: "استوری", hint: "۱۰۸۰×۱۹۲۰ برای استوری اینستاگرام", w: 1080, h: 1920 },
  square: { label: "پست مربع", hint: "۱۰۸۰×۱۰۸۰ برای پست", w: 1080, h: 1080 },
  print: { label: "چاپی A5", hint: "A5 با کیفیت چاپ (۳۰۰ dpi) برای پیشخوان سالن", w: 1748, h: 2480 },
};

export interface PosterData {
  name: string;
  /** e.g. «آرایشگر مستقل»، «آرایشگر در سالن رز» or «سالن زیبایی» */
  title: string;
  /** Up to a few service names, shown under the title. */
  specialties: string[];
  /** City / province (never a private address). */
  place: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  /** Round avatar (a person) or rounded square (a salon logo). */
  avatarShape: "circle" | "square";
  brandColor: string;
  /** "nobatet.app/book/@rosa" — shown under the QR code. */
  linkText: string;
  handle: string;
  /** The QR code, already drawn (black on white) at high resolution. */
  qr: HTMLCanvasElement;
  siteName: string;
}

const FONT = 'Vazirmatn, Tahoma, "Segoe UI", sans-serif';
const BG = "#19121a"; // the panels' dark background (warm plum), not the navy brand dark
const INK = "#f8f1e9";
const MUTED = "rgba(248, 241, 233, 0.66)";
const ACCENT = "#f2876a";
const CTA = "برای رزرو آنلاین نوبت، کد را با دوربین گوشی اسکن کنید";

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Same-origin images only (uploads, the logo), so the canvas stays exportable. */
export function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return imageCache.get(src)!;
}

export async function loadPosterFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(["400", "700", "900"].map((w) => document.fonts.load(`${w} 40px Vazirmatn`).catch(() => [])));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws `img` covering the box (like object-fit: cover). */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${Math.round(size)}px ${FONT}`;
}

/** Shrinks the font until the text fits, then cuts it with "…" if it still doesn't. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, weight: number, size: number, minSize: number) {
  let s = size;
  setFont(ctx, weight, s);
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 2;
    setFont(ctx, weight, s);
  }
  let t = text;
  while (ctx.measureText(t).width > maxWidth && t.length > 1) t = t.slice(0, -2) + "…";
  return { text: t, size: s };
}

/** Wraps RTL text into at most `maxLines` lines. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  }
  return lines;
}

function hexToRgba(hex: string, alpha: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const n = m ? parseInt(m[1], 16) : 0xa34a30;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function background(ctx: CanvasRenderingContext2D, W: number, H: number, brand: string) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W * 0.9, H * 0.05, W * 0.8, hexToRgba(brand, 0.45));
  glow(W * 0.05, H * 0.95, W * 0.9, "rgba(242, 135, 106, 0.22)");
}

async function header(ctx: CanvasRenderingContext2D, W: number, y: number, u: number, siteName: string) {
  const logo = await loadImage("/images/logo/logo_symbol_transparent.png");
  const size = u * 7;
  const right = W - u * 6;
  if (logo) ctx.drawImage(logo, right - size, y, size, size);
  ctx.fillStyle = INK;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  setFont(ctx, 900, u * 3.6);
  ctx.fillText(siteName, right - size - u * 1.6, y + size / 2);
  ctx.textAlign = "left";
  setFont(ctx, 400, u * 2.3);
  ctx.fillStyle = MUTED;
  ctx.fillText("رزرو آنلاین نوبت", u * 6, y + size / 2);
  return y + size;
}

function avatar(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, d: number, shape: "circle" | "square", brand: string, initial: string) {
  const r = d / 2;
  const radius = shape === "circle" ? r : d * 0.22;
  ctx.save();
  // ring
  ctx.fillStyle = BG;
  roundRect(ctx, cx - r - d * 0.04, cy - r - d * 0.04, d * 1.08, d * 1.08, radius + d * 0.04);
  ctx.fill();
  roundRect(ctx, cx - r, cy - r, d, d, radius);
  ctx.clip();
  if (img) drawCover(ctx, img, cx - r, cy - r, d, d);
  else {
    ctx.fillStyle = brand;
    ctx.fillRect(cx - r, cy - r, d, d);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    setFont(ctx, 900, d * 0.42);
    ctx.fillText(initial, cx, cy + d * 0.03);
  }
  ctx.restore();
}

/** The QR on a white card, the platform logo in its middle (the code is drawn with level H). */
async function qrCard(ctx: CanvasRenderingContext2D, qr: HTMLCanvasElement, x: number, y: number, size: number) {
  const pad = size * 0.07;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.06;
  ctx.fillStyle = "#fff";
  roundRect(ctx, x, y, size, size, size * 0.08);
  ctx.fill();
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qr, x + pad, y + pad, size - pad * 2, size - pad * 2);
  ctx.imageSmoothingEnabled = true;
  const logo = await loadImage("/images/logo/logo_symbol_transparent.png");
  if (logo) {
    const l = size * 0.18;
    ctx.fillStyle = "#fff";
    roundRect(ctx, x + size / 2 - l / 2 - l * 0.12, y + size / 2 - l / 2 - l * 0.12, l * 1.24, l * 1.24, l * 0.3);
    ctx.fill();
    ctx.drawImage(logo, x + size / 2 - l / 2, y + size / 2 - l / 2, l, l);
  }
}

function centered(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

export async function drawPoster(canvas: HTMLCanvasElement, format: PosterFormat, d: PosterData) {
  const { w: W, h: H } = POSTER_FORMATS[format];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  await loadPosterFonts();
  const [cover, face] = await Promise.all([loadImage(d.coverUrl), loadImage(d.avatarUrl)]);
  const u = W / 100; // one "unit" = 1% of the width
  const initial = d.name.trim().slice(0, 1);
  const subtitle = d.specialties.length ? d.specialties.slice(0, 3).join("، ") : "";

  background(ctx, W, H, d.brandColor);

  if (format === "square") {
    // Cover as a dimmed backdrop; text on the right, QR on the left.
    if (cover) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      drawCover(ctx, cover, 0, 0, W, H);
      ctx.restore();
      const shade = ctx.createLinearGradient(0, 0, 0, H);
      shade.addColorStop(0, "rgba(25,18,26,0.55)");
      shade.addColorStop(1, "rgba(25,18,26,0.92)");
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);
    }
    await header(ctx, W, u * 6, u, d.siteName);
    const colW = W * 0.46;
    const colRight = W - u * 6;
    const colCx = colRight - colW / 2;
    const av = u * 22;
    avatar(ctx, face, colCx, u * 34, av, d.avatarShape, d.brandColor, initial);
    let y = u * 34 + av / 2 + u * 9;
    const name = fitText(ctx, d.name, colW, 900, u * 6.2, u * 3.6);
    centered(ctx, name.text, colCx, y, INK);
    y += u * 6;
    const title = fitText(ctx, d.title, colW, 700, u * 3.4, u * 2.4);
    centered(ctx, title.text, colCx, y, ACCENT);
    if (subtitle) {
      y += u * 4.8;
      setFont(ctx, 400, u * 2.8);
      for (const line of wrapLines(ctx, subtitle, colW, 2)) {
        centered(ctx, line, colCx, y, MUTED);
        y += u * 3.8;
      }
    }
    if (d.place) {
      y += u * 1.4;
      const place = fitText(ctx, d.place, colW, 400, u * 2.8, u * 2.2);
      centered(ctx, place.text, colCx, y, MUTED);
    }
    const qrSize = u * 38;
    const qrX = u * 6;
    const qrY = u * 24;
    await qrCard(ctx, d.qr, qrX, qrY, qrSize);
    ctx.direction = "ltr";
    const handle = fitText(ctx, `@${d.handle}`, qrSize, 700, u * 3.6, u * 2.4);
    centered(ctx, handle.text, qrX + qrSize / 2, qrY + qrSize + u * 6, INK);
    ctx.direction = "rtl";
    // call to action along the bottom
    ctx.fillStyle = hexToRgba(d.brandColor, 0.95);
    roundRect(ctx, u * 6, H - u * 16, W - u * 12, u * 10, u * 5);
    ctx.fill();
    const cta = fitText(ctx, CTA, W - u * 18, 700, u * 3.2, u * 2.4);
    ctx.textBaseline = "middle";
    centered(ctx, cta.text, W / 2, H - u * 11 + u * 0.3, "#fff");
    return;
  }

  // Tall formats (story, A5 print): one centred column.
  const top = format === "story" ? u * 10 : u * 6;
  let y = await header(ctx, W, top, u, d.siteName);
  y += u * 5;
  // A5 is shorter for its width than a story: smaller cover and avatar leave the QR its room.
  const coverH = format === "story" ? H * 0.17 : H * 0.12;
  const coverX = u * 6;
  const coverW = W - u * 12;
  ctx.save();
  roundRect(ctx, coverX, y, coverW, coverH, u * 4);
  ctx.clip();
  if (cover) drawCover(ctx, cover, coverX, y, coverW, coverH);
  else {
    const g = ctx.createLinearGradient(coverX, y, coverX + coverW, y + coverH);
    g.addColorStop(0, hexToRgba(d.brandColor, 0.9));
    g.addColorStop(1, "rgba(242,135,106,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(coverX, y, coverW, coverH);
  }
  const fade = ctx.createLinearGradient(0, y + coverH * 0.45, 0, y + coverH);
  fade.addColorStop(0, "rgba(25,18,26,0)");
  fade.addColorStop(1, "rgba(25,18,26,0.75)");
  ctx.fillStyle = fade;
  ctx.fillRect(coverX, y, coverW, coverH);
  ctx.restore();

  const av = format === "story" ? u * 26 : u * 21;
  const avCy = y + coverH;
  avatar(ctx, face, W / 2, avCy, av, d.avatarShape, d.brandColor, initial);
  y = avCy + av / 2 + u * 9;

  const name = fitText(ctx, d.name, W - u * 14, 900, u * 7.4, u * 4.2);
  centered(ctx, name.text, W / 2, y, INK);
  y += u * 6.4;
  const title = fitText(ctx, d.title, W - u * 16, 700, u * 3.8, u * 2.6);
  centered(ctx, title.text, W / 2, y, ACCENT);
  if (subtitle) {
    y += u * 5;
    setFont(ctx, 400, u * 3);
    for (const line of wrapLines(ctx, subtitle, W - u * 20, 2)) {
      centered(ctx, line, W / 2, y, MUTED);
      y += u * 4.2;
    }
    y -= u * 4.2;
  }
  if (d.place) {
    y += u * 5;
    const place = fitText(ctx, d.place, W - u * 20, 400, u * 3, u * 2.4);
    centered(ctx, place.text, W / 2, y, MUTED);
  }

  // Call to action and link sit on the bottom edge (above a story's bottom UI); the QR code fills
  // the space between them and the text, as large as it fits.
  const linkY = H - (format === "story" ? u * 20 : u * 8);
  const ctaTop = linkY - u * 7.5 - u * 11;
  const areaTop = y + u * 5;
  const areaBottom = ctaTop - u * 5;
  const qrSize = Math.min(u * 62, areaBottom - areaTop);
  const qrY = areaTop + Math.max(0, (areaBottom - areaTop - qrSize) / 2);
  await qrCard(ctx, d.qr, (W - qrSize) / 2, qrY, qrSize);

  ctx.fillStyle = hexToRgba(d.brandColor, 0.95);
  roundRect(ctx, u * 8, ctaTop, W - u * 16, u * 11, u * 5.5);
  ctx.fill();
  const cta = fitText(ctx, CTA, W - u * 22, 700, u * 3.4, u * 2.4);
  ctx.textBaseline = "middle";
  centered(ctx, cta.text, W / 2, ctaTop + u * 5.8, "#fff");

  ctx.direction = "ltr";
  const link = fitText(ctx, d.linkText, W - u * 16, 700, u * 3.6, u * 2.2);
  ctx.textBaseline = "alphabetic";
  centered(ctx, link.text, W / 2, linkY, INK);
  ctx.direction = "rtl";
}

/** PNG blob of the drawn canvas. */
export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
}

/** Saves a blob as a file (a real download on the site; the platform isn't sandboxed). */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
