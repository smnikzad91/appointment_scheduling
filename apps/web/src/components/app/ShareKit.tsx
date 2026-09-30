"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { AtSign, Check, Copy, Download, ImageDown, Printer, Share2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { persianApiError } from "@/lib/api/errorMessages";
import { POSTER_FORMATS, canvasToBlob, drawPoster, saveBlob, type PosterData, type PosterFormat } from "@/lib/poster";
import Sheet from "./Sheet";
import { Button, Card, Field, SectionTitle, TextInput, cx } from "./ui";

/** Who the kit is for — a salon (or an independent stylist's business) or a salon's stylist. */
export interface ShareSubject {
  handle: string;
  /** The chosen handle, if any (a salon without one uses its slug). */
  customHandle: string | null;
  poster: Omit<PosterData, "qr" | "linkText" | "handle" | "siteName">;
}

const HANDLE_HINT = "۳ تا ۳۰ حرف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط؛ با حرف یا عدد شروع و تمام شود.";

/**
 * The share kit: the direct booking link (nobatet.app/book/@handle) with copy/share, its QR code
 * (SVG / high-res PNG) and a branded poster (story, square post, A5 print) drawn on a canvas.
 */
export default function ShareKit({ subject, saveHandle }: { subject: ShareSubject; saveHandle: (handle: string) => Promise<string> }) {
  const [handle, setHandle] = useState(subject.handle);
  const url = `${SITE_URL}/book/@${handle}`;
  const linkText = url.replace(/^https?:\/\//, "");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flash = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API needs a secure context: fall back to a selected textarea.
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    flash("لینک کپی شد");
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: subject.poster.name, text: `رزرو آنلاین نوبت — ${subject.poster.name}`, url }).catch(() => {});
    } else copyLink();
  }

  // ── Handle editor ──
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  async function submitHandle() {
    setSaving(true);
    setEditError(null);
    try {
      const saved = await saveHandle(draft.trim().replace(/^@+/, "").toLowerCase());
      setHandle(saved);
      setEditOpen(false);
      flash("لینک جدید ذخیره شد");
    } catch (err) {
      setEditError(persianApiError(err, "ذخیره نام کاربری انجام نشد"));
    } finally {
      setSaving(false);
    }
  }

  // ── QR ──
  const svgRef = useRef<SVGSVGElement>(null);
  const qrHiRef = useRef<HTMLCanvasElement>(null);
  function downloadSvg() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", "1024");
    clone.setAttribute("height", "1024");
    saveBlob(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }), `nobatet-${handle}-qr.svg`);
  }
  async function downloadQrPng() {
    const c = qrHiRef.current;
    if (c) saveBlob(await canvasToBlob(c), `nobatet-${handle}-qr.png`);
  }

  // ── Poster ──
  const [format, setFormat] = useState<PosterFormat>("story");
  const posterRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(true);
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const posterData = subject.poster;
  useEffect(() => {
    let cancelled = false;
    // The QR canvas draws in its own effect: give it a frame before copying it.
    const id = requestAnimationFrame(() => {
      const canvas = posterRef.current;
      const qr = qrHiRef.current;
      if (!canvas || !qr) return;
      setDrawing(true);
      drawPoster(canvas, format, { ...posterData, qr, linkText, handle, siteName: SITE_NAME })
        .catch(() => {})
        .finally(() => !cancelled && setDrawing(false));
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [format, posterData, linkText, handle]);

  async function posterBlob() {
    return canvasToBlob(posterRef.current!);
  }
  async function downloadPoster() {
    saveBlob(await posterBlob(), `nobatet-${handle}-${format}.png`);
  }
  async function sharePoster() {
    const file = new File([await posterBlob()], `nobatet-${handle}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: subject.poster.name }).catch(() => {});
    } else downloadPoster();
  }
  async function printPoster() {
    setPrintUrl(URL.createObjectURL(await posterBlob()));
  }
  useEffect(() => {
    if (!printUrl) return;
    const done = () => {
      URL.revokeObjectURL(printUrl);
      setPrintUrl(null);
    };
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 300); // let the image lay out first
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", done);
    };
  }, [printUrl]);

  const canShareFiles = typeof navigator !== "undefined" && !!navigator.canShare;
  const { w, h } = POSTER_FORMATS[format];

  return (
    <>
      <SectionTitle>لینک رزرو مستقیم</SectionTitle>
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-sm leading-6 text-app-muted">این لینک مستقیم به صفحه رزرو باز می‌شود؛ در بیو اینستاگرام، واتساپ یا تلگرام بگذارید.</p>
        <div className="flex items-center gap-2 rounded-2xl bg-app-card-2 px-4 py-3">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[15px] font-bold text-app-ink">
            {linkText}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button icon={Copy} onClick={copyLink}>
            کپی
          </Button>
          <Button variant="secondary" icon={Share2} onClick={shareLink}>
            ارسال
          </Button>
          <Button
            variant="secondary"
            icon={AtSign}
            onClick={() => {
              setDraft(subject.customHandle ?? handle);
              setEditError(null);
              setEditOpen(true);
            }}
          >
            تغییر
          </Button>
        </div>
      </Card>

      <SectionTitle>کد QR</SectionTitle>
      <Card className="flex flex-col items-center gap-4 p-5">
        <div className="rounded-3xl bg-white p-4 shadow-app">
          <QRCodeSVG ref={svgRef} value={url} size={196} level="M" marginSize={1} title={`رزرو نوبت — ${subject.poster.name}`} />
        </div>
        <p dir="ltr" className="font-mono text-sm font-bold text-app-ink">
          @{handle}
        </p>
        <div className="grid w-full grid-cols-2 gap-2">
          <Button icon={Download} onClick={downloadQrPng}>
            PNG
          </Button>
          <Button variant="secondary" icon={Download} onClick={downloadSvg}>
            SVG (برداری)
          </Button>
        </div>
        {/* High-resolution, error-tolerant (level H) copy for downloads and the poster's logo overlay. */}
        <QRCodeCanvas ref={qrHiRef} value={url} size={1024} level="H" marginSize={0} className="hidden" aria-hidden />
      </Card>

      <SectionTitle>پوستر معرفی</SectionTitle>
      <Card className="flex flex-col gap-4 p-4">
        <div role="radiogroup" aria-label="اندازه پوستر" className="grid grid-cols-3 gap-2">
          {(Object.keys(POSTER_FORMATS) as PosterFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={format === f}
              onClick={() => setFormat(f)}
              className={cx(
                "h-11 rounded-2xl text-sm font-bold transition active:scale-95",
                format === f ? "bg-app-ink text-app-bg" : "border border-app-line bg-app-card text-app-muted",
              )}
            >
              {POSTER_FORMATS[f].label}
            </button>
          ))}
        </div>
        <p className="-mt-1 px-1 text-xs text-app-muted">{POSTER_FORMATS[format].hint}</p>
        <div className="flex justify-center rounded-3xl bg-app-card-2 p-3">
          <canvas
            ref={posterRef}
            aria-label="پیش‌نمایش پوستر"
            className={cx("h-auto rounded-2xl shadow-app transition-opacity", drawing && "opacity-50")}
            style={{ width: format === "square" ? "100%" : "62%", aspectRatio: `${w} / ${h}` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button icon={ImageDown} disabled={drawing} onClick={downloadPoster}>
            دانلود تصویر
          </Button>
          {canShareFiles ? (
            <Button variant="secondary" icon={Share2} disabled={drawing} onClick={sharePoster}>
              ارسال به اینستاگرام…
            </Button>
          ) : (
            <Button variant="secondary" icon={Printer} disabled={drawing} onClick={printPoster}>
              چاپ یا PDF
            </Button>
          )}
        </div>
        {canShareFiles && (
          <button type="button" disabled={drawing} onClick={printPoster} className="flex items-center justify-center gap-1.5 text-sm font-bold text-app-accent disabled:opacity-50">
            <Printer className="h-4 w-4" aria-hidden />
            چاپ یا ذخیره PDF
          </button>
        )}
      </Card>

      <Sheet
        open={editOpen}
        onClose={() => !saving && setEditOpen(false)}
        title="نام کاربری لینک"
        footer={
          <Button block busy={saving} icon={Check} onClick={submitHandle}>
            ذخیره
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Field label="نام کاربری" hint={HANDLE_HINT}>
            <div className="relative" dir="ltr">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-app-muted">@</span>
              <TextInput
                dir="ltr"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                className="ps-9 text-start font-mono"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\s/g, "").toLowerCase())}
                placeholder="rosa.makeup"
              />
            </div>
          </Field>
          <p dir="ltr" className="rounded-2xl bg-app-card-2 px-4 py-3 text-start font-mono text-sm text-app-muted">
            {SITE_URL.replace(/^https?:\/\//, "")}/book/@{draft || "…"}
          </p>
          <p className="text-xs leading-6 text-app-pending">
            با تغییر نام کاربری، لینک و کد QR قبلی دیگر کار نمی‌کند؛ پوسترهای چاپ‌شده را دوباره بگیرید.
          </p>
          {editError && <p className="text-sm font-medium text-app-danger">{editError}</p>}
        </div>
      </Sheet>

      {toast && (
        <div
          role="status"
          className="app-pb-safe fixed inset-x-0 bottom-24 z-[100002] flex justify-center px-4"
        >
          <span className="flex items-center gap-2 rounded-full bg-app-ink px-4 py-2.5 text-sm font-bold text-app-bg shadow-app">
            <Check className="h-4 w-4" aria-hidden />
            {toast}
          </span>
        </div>
      )}

      {printUrl &&
        createPortal(
          // Printed on its own page (globals.css #print-poster); the rest of the app is hidden.
          <div id="print-poster">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={printUrl} alt="" />
          </div>,
          document.body,
        )}
    </>
  );
}
