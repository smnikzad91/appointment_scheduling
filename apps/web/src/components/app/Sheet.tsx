"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Bottom sheet — the app's replacement for modals and inline edit forms. Slides up from the
 * bottom, closes on backdrop tap, Escape, the close button, or dragging the handle down.
 * Rendered in a portal (so no transformed ancestor can trap it) that re-applies .app-root so
 * the design tokens still resolve.
 */
export default function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  themeClassName = "",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Extra theme class for the portal root, e.g. "guest-root" so a sheet opened on a guest page stays dark. */
  themeClassName?: string;
}) {
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  function onTouchStart(e: React.TouchEvent) {
    dragStart.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - dragStart.current));
  }
  function onTouchEnd() {
    if (dragY > 110) onClose();
    dragStart.current = null;
    setDragY(0);
  }

  return createPortal(
    // Inline background: .app-root's own (unlayered) paper background would otherwise win over a utility.
    <div className={`app-root ${themeClassName} fixed inset-0 z-[100000] flex items-end justify-center`} style={{ background: "transparent" }} dir="rtl">
      <div className="app-fade-in absolute inset-0 bg-[#1a1016]/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="app-sheet-in app-pb-safe relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-app-bg shadow-[0_-12px_40px_-12px_rgb(0_0_0/0.35)]"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
      >
        <div className="shrink-0 touch-none px-5 pb-2 pt-3" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-app-line" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black text-app-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-app-card-2 text-app-muted active:scale-90"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">{children}</div>
        {footer && <div className="shrink-0 border-t border-app-line bg-app-bg px-5 pb-4 pt-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
