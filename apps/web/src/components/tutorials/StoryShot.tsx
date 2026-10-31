"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import shots from "@/content/tutorialShots.json";
import { toPersianDigits } from "@/lib/persian";
import { Lightbox, type Box } from "./Lightbox";

const SHOTS = shots as Record<string, { w: number; h: number; boxes: Box[] }>;
export const hasShot = (id?: string) => !!id && !!SHOTS[id];

const GRADIENT = "bg-[linear-gradient(115deg,#f6b46b,#f2876a_55%,#e0507a)]";

/** The number badge used on frames, caption cards and step lists (the story slides' look). */
export function Num({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full ${GRADIENT} font-black text-[#1a0f14] ${className}`}>
      {toPersianDigits(n)}
    </span>
  );
}

/**
 * A step's screenshot in a phone frame with its numbered highlight frames (positions are % of the
 * image, from tutorialShots.json). Tapping it opens the zoomable lightbox. Images are served as is:
 * through the image optimizer, a re-captured shot under the same name kept its old cached picture.
 */
export function PhoneShot({
  id,
  alt,
  callouts,
  className = "",
  zoomable = true,
  boxRefs,
}: {
  id: string;
  alt: string;
  callouts?: string[];
  className?: string;
  zoomable?: boolean;
  boxRefs?: React.MutableRefObject<(HTMLSpanElement | null)[]>;
}) {
  const [open, setOpen] = useState(false);
  const shot = SHOTS[id];
  if (!shot) return null;
  const src = `/tutorials/${id}.webp`;
  const screen = (
    <span className="relative block overflow-hidden rounded-[26px] bg-[#1d1520]">
      {/* eslint-disable-next-line @next/next/no-img-element -- plain img: see above */}
      <img src={src} alt={alt} width={shot.w} height={shot.h} loading="lazy" decoding="async" className="block h-auto w-full" />
      {shot.boxes.map((b, i) => (
        <span
          key={i}
          ref={(el) => {
            if (boxRefs) boxRefs.current[i] = el;
          }}
          className="pointer-events-none absolute rounded-[10px] border-[2.5px] border-[#e0956f] motion-safe:animate-[tut-pulse_2.4s_ease-in-out_infinite]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%`, animationDelay: `${i * 0.3}s` }}
          aria-hidden
        >
          <Num n={i + 1} className="absolute -right-2.5 -top-2.5 h-6 w-6 border-2 border-[#f7f0ea] text-[11px] shadow-md" />
          {callouts?.[i] && <span className="sr-only">{callouts[i]}</span>}
        </span>
      ))}
    </span>
  );

  return (
    <div className={`relative ${className}`}>
      <div className="rounded-[34px] bg-[#2a1d26] p-2 shadow-[0_0_0_1.5px_rgb(198_138_114/0.35),0_34px_70px_-26px_rgb(0_0_0/0.85)]">
        {zoomable ? (
          <button type="button" onClick={() => setOpen(true)} className="group relative block w-full text-start" aria-label={`بزرگ‌نمایی تصویر: ${alt}`}>
            {screen}
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white opacity-80 backdrop-blur transition group-hover:opacity-100">
              <Maximize2 className="h-3 w-3" aria-hidden />
              بزرگ‌نمایی
            </span>
          </button>
        ) : (
          screen
        )}
      </div>
      {open && <Lightbox src={src} alt={alt} shot={shot} callouts={callouts} onClose={() => setOpen(false)} />}
    </div>
  );
}

/**
 * The slide's stage: the phone, and beside it (md and up) a caption card per frame placed level
 * with its frame and joined to it by a leader line; on phones the captions are a numbered list
 * under the screenshot.
 */
export function ShotWithNotes({ id, alt, callouts }: { id: string; alt: string; callouts?: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const notesCol = useRef<HTMLOListElement>(null);
  const noteRefs = useRef<(HTMLLIElement | null)[]>([]);
  const boxRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [layout, setLayout] = useState<{ tops: number[]; lines: { x1: number; y1: number; x2: number; y2: number }[]; height: number } | null>(null);
  const labels = (callouts ?? []).slice(0, SHOTS[id]?.boxes.length ?? 0);

  const measure = useCallback(() => {
    const w = wrap.current;
    const col = notesCol.current;
    if (!w || !col || !labels.length || window.innerWidth < 768) return setLayout(null);
    const wr = w.getBoundingClientRect();
    const cr = col.getBoundingClientRect();
    const boxes = boxRefs.current.slice(0, labels.length).map((b) => b?.getBoundingClientRect());
    if (boxes.some((b) => !b)) return;
    const heights = noteRefs.current.slice(0, labels.length).map((n) => n?.offsetHeight ?? 60);
    const gap = 14;
    // each card level with its frame's centre, then pushed apart top-down and pulled back up from the bottom
    const tops = boxes.map((b, i) => b!.top + b!.height / 2 - wr.top - heights[i] / 2);
    const order = tops.map((_, i) => i).sort((a, b) => tops[a] - tops[b]);
    let floor = 0;
    for (const i of order) {
      tops[i] = Math.max(tops[i], floor);
      floor = tops[i] + heights[i] + gap;
    }
    let ceil = wr.height;
    for (const i of [...order].reverse()) {
      tops[i] = Math.min(tops[i], ceil - heights[i]);
      ceil = tops[i] - gap;
    }
    const lines = boxes.map((b, i) => ({
      x1: cr.right - wr.left, // the card's inner (right) edge
      y1: tops[i] + heights[i] / 2,
      x2: b!.left - wr.left + 2, // the frame's outer (left) edge
      y2: b!.top + b!.height / 2 - wr.top,
    }));
    setLayout({ tops, lines, height: wr.height });
  }, [labels.length]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  if (!hasShot(id)) return null;
  return (
    <div ref={wrap} className="relative mx-auto flex w-full max-w-[640px] flex-col items-center md:flex-row md:items-stretch md:gap-14">
      <PhoneShot id={id} alt={alt} callouts={labels} boxRefs={boxRefs} className="w-full max-w-[290px] shrink-0" />
      {labels.length > 0 && (
        <ol ref={notesCol} className="mt-5 flex w-full max-w-[290px] flex-col gap-2.5 md:relative md:mt-0 md:max-w-none md:flex-1">
          {labels.map((c, i) => (
            <li
              key={i}
              ref={(el) => {
                noteRefs.current[i] = el;
              }}
              className="flex items-center gap-3 rounded-2xl border-2 border-[#f2876a]/80 bg-[#1d1520] p-3 shadow-[0_14px_30px_-14px_rgb(0_0_0/0.8)] md:absolute md:inset-x-0"
              style={layout ? { top: layout.tops[i] } : undefined}
            >
              <Num n={i + 1} className="h-7 w-7 text-[13px]" />
              <span className="text-[14px] font-bold leading-6 text-g-ink">{c}</span>
            </li>
          ))}
        </ol>
      )}
      {layout && (
        <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible md:block" aria-hidden>
          {layout.lines.map((l, i) => {
            const mid = (l.x1 + l.x2) / 2;
            const d = `M${l.x1},${l.y1} C${mid},${l.y1} ${mid},${l.y2} ${l.x2},${l.y2}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="#0c090e" strokeOpacity=".7" strokeWidth="6" strokeLinecap="round" />
                <path d={d} fill="none" stroke="#e0956f" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx={l.x2} cy={l.y2} r="4" fill="#f6b46b" />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
