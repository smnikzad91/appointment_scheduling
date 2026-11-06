"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Heart, Keyboard, Loader2, Maximize, MessageCircle, Minimize, Pause, Pencil, Play, RotateCw, Send, SmilePlus, X, ZoomIn, ZoomOut } from "lucide-react";
import { LIKE, REACTION_NAMES, REACTION_NAMES_EN, REACTIONS, type Reaction } from "@/lib/livechat/reactions";

/**
 * reaction = this viewer's side's reaction (❤️ 👍 …); otherReaction = the other side's, with their name.
 * editable = this viewer sent it, so may change its caption; edited = the caption was changed after sending.
 */
export type LightboxItem = {
  id: string;
  src: string;
  w: number;
  h: number;
  caption?: string;
  meta?: string;
  reaction?: Reaction | null;
  otherReaction?: { who: string; emoji: Reaction };
  editable?: boolean;
  edited?: boolean;
  /** Messages that reply to this image, oldest first. */
  comments?: LightboxComment[];
};
export type LightboxComment = { id: string; who: string; text: string; time: string; mine?: boolean; pending?: boolean };

/** Same file, served as an attachment (the server names it); `download` covers browsers that ignore the header. */
const downloadUrl = (src: string) => `${src}${src.includes("?") ? "&" : "?"}download=1`;

/** The viewer's texts: Persian everywhere; English too for the bilingual admin panel. */
const TEXT = {
  fa: {
    dialog: "نمایش تصویر",
    close: "بستن",
    of: "از",
    shortcuts: "میان‌برهای صفحه‌کلید",
    mouse: "ماوس",
    play: "نمایش خودکار",
    pause: "توقف نمایش خودکار",
    zoomIn: "بزرگ‌نمایی",
    zoomOut: "کوچک‌نمایی",
    zoomReset: (pct: string) => `بزرگ‌نمایی ${pct} درصد؛ بازگشت به اندازه اصلی`,
    actualSize: "اندازه اصلی",
    rotate: "چرخاندن ۹۰ درجه",
    download: "دانلود تصویر",
    newTab: "باز کردن در تب جدید",
    fullscreen: "تمام‌صفحه",
    exitFullscreen: "خروج از تمام‌صفحه",
    prev: "تصویر قبلی",
    next: "تصویر بعدی",
    speed: "سرعت نمایش:",
    seconds: "ثانیه",
    speedTitle: (s: string) => `هر تصویر ${s} ثانیه ([ کندتر، ] تندتر)`,
    captionPh: "توضیح تصویر…",
    save: "ذخیره",
    cancel: "انصراف",
    editHint: "Enter ذخیره · Shift+Enter خط تازه · Esc انصراف",
    editCaption: "ویرایش توضیح تصویر",
    addCaption: "افزودن توضیح",
    react: "واکنش به تصویر",
    yourReaction: (name: string) => `واکنش شما: ${name}؛ تغییر واکنش`,
    reactTitle: "واکنش (۱ تا ۶؛ دوبار ضربه روی تصویر = ❤️)",
    reactions: "واکنش‌ها",
    comments: (n: string) => `نظرها (${n})`,
    commentsTitle: "نظرهای این تصویر (C)",
    commentsRegion: "نظرهای این تصویر",
    edited: "ویرایش‌شده",
    sending: "در حال ارسال…",
    noComments: "هنوز نظری دربارهٔ این تصویر نیست.",
    commentPh: "نظرتان دربارهٔ این تصویر…",
    commentLabel: "نوشتن نظر دربارهٔ این تصویر",
    sendComment: "فرستادن نظر",
    commentNote: "در گفتگو هم به‌عنوان جواب این تصویر نشان داده می‌شود.",
    strip: "تصویرهای این گفتگو",
    nth: (i: string, n: string) => `تصویر ${i} از ${n}`,
    alt: "تصویر پیوست",
    keys: [
      [["←", "→"], "تصویر بعدی / قبلی"],
      [["+", "−"], "بزرگ‌نمایی / کوچک‌نمایی"],
      [["0"], "اندازه اصلی"],
      [["R"], "چرخاندن ۹۰ درجه"],
      [["F"], "تمام‌صفحه / خروج از تمام‌صفحه"],
      [["L"], "❤️ / برداشتن آن"],
      [["1", "…", "6"], `واکنش: ${REACTIONS.join(" ")}`],
      [["E"], "ویرایش توضیح تصویرِ خودتان"],
      [["C"], "نظرهای این تصویر"],
      [["Space", "P"], "شروع / توقف نمایش خودکار"],
      [["[", "]"], "کندتر / تندتر نمایش خودکار"],
      [["Esc"], "توقف نمایش یا برگشت از بزرگ‌نمایی، بعد بستن"],
      [["?"], "نمایش / بستن این راهنما"],
    ] as [string[], string][],
    mouseKeys: [
      ["چرخ ماوس", "بزرگ‌نمایی روی همان نقطه"],
      ["دوبار کلیک", "واکنش ❤️"],
      ["کشیدن", "جابه‌جایی تصویر بزرگ‌شده"],
    ] as [string, string][],
  },
  en: {
    dialog: "Image viewer",
    close: "Close",
    of: "of",
    shortcuts: "Keyboard shortcuts",
    mouse: "Mouse",
    play: "Slideshow",
    pause: "Stop slideshow",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    zoomReset: (pct: string) => `Zoom ${pct}%; back to actual size`,
    actualSize: "Actual size",
    rotate: "Rotate 90°",
    download: "Download image",
    newTab: "Open in a new tab",
    fullscreen: "Full screen",
    exitFullscreen: "Exit full screen",
    prev: "Previous image",
    next: "Next image",
    speed: "Speed:",
    seconds: "s",
    speedTitle: (s: string) => `${s} s per image ([ slower, ] faster)`,
    captionPh: "Image caption…",
    save: "Save",
    cancel: "Cancel",
    editHint: "Enter saves · Shift+Enter new line · Esc cancels",
    editCaption: "Edit the caption",
    addCaption: "Add a caption",
    react: "React to the image",
    yourReaction: (name: string) => `Your reaction: ${name}; change it`,
    reactTitle: "React (1–6; double-tap the image = ❤️)",
    reactions: "Reactions",
    comments: (n: string) => `Comments (${n})`,
    commentsTitle: "Comments on this image (C)",
    commentsRegion: "Comments on this image",
    edited: "edited",
    sending: "sending…",
    noComments: "No comments on this image yet.",
    commentPh: "Your comment on this image…",
    commentLabel: "Write a comment on this image",
    sendComment: "Send comment",
    commentNote: "Also shown in the chat as a reply to this image.",
    strip: "Images in this conversation",
    nth: (i: string, n: string) => `Image ${i} of ${n}`,
    alt: "Attached image",
    keys: [
      [["←", "→"], "Next / previous image"],
      [["+", "−"], "Zoom in / out"],
      [["0"], "Actual size"],
      [["R"], "Rotate 90°"],
      [["F"], "Full screen on / off"],
      [["L"], "❤️ / remove it"],
      [["1", "…", "6"], `React: ${REACTIONS.join(" ")}`],
      [["E"], "Edit your own image's caption"],
      [["C"], "Comments on this image"],
      [["Space", "P"], "Start / stop the slideshow"],
      [["[", "]"], "Slower / faster slideshow"],
      [["Esc"], "Stop the slideshow or zoom, then close"],
      [["?"], "Show / hide this help"],
    ] as [string[], string][],
    mouseKeys: [
      ["Wheel", "Zoom at that point"],
      ["Double-click", "React ❤️"],
      ["Drag", "Move a zoomed image"],
    ] as [string, string][],
  },
};

const MIN = 1;
const sideways = (deg: number) => (((deg / 90) % 2) + 2) % 2 === 1;
const MAX = 4;
const STEP = 1.5;
const TAP_ZOOM = 2.5;
/** Swipe down to close (touch / pen): far enough, or a quick flick. */
const PULL_CLOSE_PX = 120;
const PULL_FLICK_PX_PER_MS = 0.5;
/** Pinch an unzoomed image below this fraction of its size and let go = close. */
const PINCH_CLOSE = 0.7;
/** Slideshow: seconds each image stays on screen (after it has loaded); the viewer's pick is remembered. */
const SPEEDS = [2, 4, 8] as const;
const DEFAULT_SPEED = 4;
const SPEED_KEY = "lightbox-slide-seconds";
const savedSpeed = () => {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    return (SPEEDS as readonly number[]).includes(v) ? v : DEFAULT_SPEED;
  } catch {
    return DEFAULT_SPEED; // storage blocked (private mode etc.)
  }
};

/** s = zoom, x/y = pan (px), r = rotation in degrees (cumulative, so 270→360 animates forward), fit = extra scale so a sideways image fits the stage. */
type View = { id: string; s: number; x: number; y: number; r: number; fit: number };
type Pt = { x: number; y: number };

/**
 * Full-screen viewer for live chat images (ported from the owner's mychatbot project): Esc / ✕ / backdrop
 * closes, arrows or swipe move between the conversation's images (RTL: ← = next), thumbnails below. Zoom:
 * wheel / pinch / + − 0 keys / buttons, drag to pan while zoomed; rotate (R), download, full screen (F),
 * slideshow (Space; 2/4/8 s with [ ]), swipe down or pinch in to close, «?» lists the shortcuts.
 * Reactions (❤️ 👍 😂 …, one per side) from the picker or 1–6; double-tap / double-click = ❤️ (with
 * `onReact`; without it, double-tap toggles zoom). Caption editing (E) and comments on the image (C).
 * Keys are caught before the chat box's own Esc handler.
 */
export function ImageLightbox({
  items,
  index,
  onIndex,
  onClose,
  onReact,
  onCaption,
  onComment,
  lang = "fa",
}: {
  items: LightboxItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  /** Sets this viewer's reaction to the image; null removes it. */
  onReact?: (item: LightboxItem, reaction: Reaction | null) => void;
  /** Saves a new caption for an `editable` item; resolves to an error message, or null when saved. */
  onCaption?: (item: LightboxItem, caption: string) => Promise<string | null>;
  /** Sends a comment on the image (a chat reply linked to it); resolves to an error message, or null when sent. */
  onComment?: (item: LightboxItem, text: string) => Promise<string | null>;
  lang?: "fa" | "en";
}) {
  const T = TEXT[lang];
  const n = (v: number) => v.toLocaleString(lang === "fa" ? "fa-IR" : "en-US");
  const reactionName = (r: Reaction) => (lang === "fa" ? REACTION_NAMES : REACTION_NAMES_EN)[r];
  const item = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Not every browser can (iPhone Safari only does it for videos): no button there. */
  const [canFull] = useState(() => Boolean(document.fullscreenEnabled));
  const [full, setFull] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  // Zoom belongs to one image: moving to another starts unzoomed (no reset effect needed).
  const [stored, setStored] = useState<View | null>(null);
  const view: View = stored && stored.id === item?.id ? stored : { id: item?.id ?? "", s: 1, x: 0, y: 0, r: 0, fit: 1 };
  const zoomed = view.s > 1.01;

  // Gesture bookkeeping (refs: they change on every pointer move).
  const pointers = useRef(new Map<number, Pt>());
  /** "swipe" starts undecided; its first real movement locks it to sideways (change image) or "pull" (down = close). */
  const gesture = useRef<{ kind: "pan" | "pinch" | "swipe" | "pull"; start: Pt; view: View; dist?: number; mid?: Pt; moved: boolean; trail?: { y: number; t: number }[] } | null>(null);
  const lastTap = useRef<{ t: number; p: Pt } | null>(null);
  const suppressClick = useRef(false);
  const lastPointerType = useRef("mouse");
  const [dragging, setDragging] = useState(false);
  /** How far the image has been pulled down (px); the backdrop fades with it. */
  const [pull, setPull] = useState(0);
  const [closing, setClosing] = useState(false);
  /** Pinching an unzoomed image smaller than fit (1 = not shrunk); below PINCH_CLOSE on release closes. */
  const [shrink, setShrink] = useState(1);
  /** The big heart that pops where the image was double-tapped (key restarts the animation). */
  const [burst, setBurst] = useState<{ key: number; x: number; y: number; emoji?: Reaction } | null>(null);
  const [picker, setPicker] = useState(false);
  /** Caption being edited; it belongs to one image, so moving to another simply drops it. */
  const [editing, setEditing] = useState<{ id: string; text: string; saving?: boolean; error?: string } | null>(null);
  const draft = editing && editing.id === item?.id ? editing : null;
  /** The comments panel stays open while moving between images; the unsent text is per viewer. */
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState<{ text: string; busy?: boolean; error?: string }>({ text: "" });
  const commentsRef = useRef<HTMLOListElement>(null);
  const comments = item?.comments ?? [];
  const hasComments = Boolean(onComment || comments.length);
  /** 0..1: how close a swipe-down or pinch-in is to closing; drives the backdrop and bars fading. */
  const dismiss = Math.min(1, Math.max(pull / 400, (1 - shrink) / (1 - PINCH_CLOSE) / 2));
  const [help, setHelp] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(savedSpeed); // only rendered client-side (after a click), so storage is readable here
  const setSpeed = (v: number) => {
    setSpeedState(v);
    try {
      localStorage.setItem(SPEED_KEY, String(v));
    } catch {}
  };
  /** One step slower (+1) or faster (−1) along SPEEDS. */
  const stepSpeed = (dir: 1 | -1) => {
    const i = (SPEEDS as readonly number[]).indexOf(speed);
    setSpeed(SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, (i < 0 ? 1 : i) + dir))]);
  };
  /** The image whose file has finished loading: the slideshow counts from then, not from the switch. */
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [tabHidden, setTabHidden] = useState(false);
  /** True while the current press is the one that dismissed the help panel. */
  const pressClosedHelp = useRef(false);

  /** Keeps the zoomed image covering the stage (no panning it out of sight). */
  const clamp = (v: View): View => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img || v.s <= 1) return { ...v, s: Math.max(MIN, v.s), x: 0, y: 0 };
    const side = sideways(v.r);
    const w = (side ? img.offsetHeight : img.offsetWidth) * v.fit * v.s;
    const h = (side ? img.offsetWidth : img.offsetHeight) * v.fit * v.s;
    const maxX = Math.max(0, (w - stage.clientWidth) / 2);
    const maxY = Math.max(0, (h - stage.clientHeight) / 2);
    return { ...v, x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) };
  };

  /** Zoom to `s`, keeping the point `at` (client coords; default: stage centre) still on screen. */
  const zoomTo = (s: number, at?: Pt, from: View = view) => {
    const stage = stageRef.current;
    const next = Math.min(MAX, Math.max(MIN, s));
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const px = at ? at.x - (r.left + r.width / 2) : 0;
    const py = at ? at.y - (r.top + r.height / 2) : 0;
    const k = next / from.s;
    setStored(clamp({ ...from, s: next, x: px - (px - from.x) * k, y: py - (py - from.y) * k }));
  };
  /** Back to fit-to-screen; the rotation stays. */
  const reset = () => setStored(view.r ? { ...view, s: 1, x: 0, y: 0 } : null);

  /** Quarter turn clockwise, unzoomed; a sideways image is shrunk to fit the stage. */
  const rotate = () => {
    const stage = stageRef.current;
    const img = imgRef.current;
    const r = view.r + 90;
    let fit = 1;
    if (stage && img && sideways(r) && img.offsetWidth && img.offsetHeight) {
      fit = Math.min(1, stage.clientWidth / img.offsetHeight, stage.clientHeight / img.offsetWidth);
    }
    setStored({ id: view.id, s: 1, x: 0, y: 0, r, fit });
  };

  const canPlay = items.length > 1;
  /** Starting on the last image begins again from the first; starting while zoomed goes back to fit. */
  const togglePlay = () => {
    if (!canPlay) return;
    if (!playing) {
      if (zoomed) reset();
      if (!hasNext) onIndex(0);
    }
    setPlaying(!playing);
  };
  // The countdown only runs while it's actually being watched: not zoomed in, help closed, tab visible, image loaded.
  const running = playing && !draft && !showComments && !dismiss && !zoomed && !help && !tabHidden && loadedId === item?.id;
  const advance = useEffectEvent(() => onIndex(hasNext ? index + 1 : 0)); // loops back to the first
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => advance(), speed * 1000);
    return () => clearTimeout(t);
  }, [running, index, speed]); // a new speed starts the current image's countdown over
  // Fetch the next file ahead so the switch doesn't wait on the network.
  const upcoming = playing ? items[hasNext ? index + 1 : 0]?.src : undefined;
  useEffect(() => {
    if (upcoming) new Image().src = upcoming;
  }, [upcoming]);

  /** Fullscreen is the viewer itself, not the page; Esc there is the browser's and only leaves fullscreen. */
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  };
  // The stage changes size: a sideways image's fit-to-stage scale has to be worked out again.
  const onFullChange = useEffectEvent(() => {
    setFull(document.fullscreenElement === rootRef.current);
    if (sideways(view.r))
      requestAnimationFrame(() => {
        const stage = stageRef.current;
        const img = imgRef.current;
        if (stage && img && img.offsetWidth && img.offsetHeight) {
          setStored({ ...view, s: 1, x: 0, y: 0, fit: Math.min(1, stage.clientWidth / img.offsetHeight, stage.clientHeight / img.offsetWidth) });
        }
      });
  });

  /** Double-tap / double-click: ❤️ (never takes a reaction back, like Instagram) with a heart at that point; zoom toggle when reacting isn't offered. */
  const doubleTap = (p: Pt) => {
    if (!onReact) {
      if (zoomed) reset();
      else zoomTo(TAP_ZOOM, p);
      return;
    }
    const r = stageRef.current?.getBoundingClientRect();
    if (r) setBurst({ key: performance.now(), x: p.x - r.left, y: p.y - r.top });
    if (item.reaction !== LIKE) onReact(item, LIKE);
  };
  /** Picking your current reaction again takes it back; a new one pops in the middle of the image. */
  const react = (emoji: Reaction) => {
    if (!onReact) return;
    setPicker(false);
    if (item.reaction === emoji) return onReact(item, null);
    const st = stageRef.current;
    if (st) setBurst({ key: performance.now(), x: st.clientWidth / 2, y: st.clientHeight / 2, emoji });
    onReact(item, emoji);
  };
  const toggleComments = () => {
    if (!showComments) setPlaying(false);
    setShowComments(!showComments);
  };

  const canEdit = Boolean(onCaption && item?.editable);
  const startEdit = () => {
    if (!canEdit) return;
    setPlaying(false);
    setEditing({ id: item.id, text: item.caption ?? "" });
  };
  const saveEdit = async () => {
    if (!draft || draft.saving || !onCaption) return;
    if (draft.text.trim() === (item.caption ?? "").trim()) return setEditing(null); // nothing changed
    setEditing({ ...draft, saving: true, error: undefined });
    const error = await onCaption(item, draft.text);
    setEditing((cur) => (cur?.id !== draft.id ? cur : error ? { ...draft, saving: false, error } : null));
  };

  const sendComment = async () => {
    const text = comment.text.trim();
    if (!text || comment.busy || !onComment) return;
    setComment({ text, busy: true });
    const error = await onComment(item, text);
    setComment(error ? { text, error } : { text: "" });
  };

  // Newest comment in view when the panel opens, the image changes or a comment arrives.
  useEffect(() => {
    const ol = commentsRef.current;
    if (ol) ol.scrollTop = ol.scrollHeight;
  }, [showComments, item?.id, comments.length]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    // Typing (caption / comment): keys are text, except Esc, which backs out of that (not the viewer / chat box).
    if ((e.target as HTMLElement | null)?.closest?.("textarea,input")) {
      if (e.key === "Escape" && (draft || showComments)) {
        e.preventDefault();
        e.stopPropagation();
        if (draft) setEditing(null);
        else setShowComments(false);
      }
      return;
    }
    if (e.key === "?" || e.key === "؟") setHelp((h) => !h); // ؟ = Shift+/ on a Persian keyboard
    else if (e.key === " " || e.key === "p" || e.key === "P" || e.key === "ح") togglePlay(); // ح = P on a Persian keyboard
    else if (playing && (e.key === "[" || e.key === "ج")) stepSpeed(1); // ج / چ = [ / ] on a Persian keyboard
    else if (playing && (e.key === "]" || e.key === "چ")) stepSpeed(-1);
    else if (e.key === "Escape") {
      if (help) setHelp(false);
      else if (picker) setPicker(false);
      else if (showComments) setShowComments(false);
      else if (playing) setPlaying(false);
      else if (zoomed) reset();
      else onClose();
    } else if (e.key === "ArrowLeft" && hasNext && !zoomed) onIndex(index + 1);
    else if (e.key === "ArrowRight" && hasPrev && !zoomed) onIndex(index - 1);
    else if (e.key === "+" || e.key === "=") zoomTo(view.s * STEP);
    else if (e.key === "-" || e.key === "_") zoomTo(view.s / STEP);
    else if (e.key === "0") reset();
    else if (onReact && (e.key === "l" || e.key === "L" || e.key === "م")) react(LIKE); // م = L on a Persian keyboard
    else if (onReact && /^[1-6۱-۶]$/.test(e.key)) react(REACTIONS[Number(e.key.replace(/[۰-۹]/, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))) - 1]);
    else if (canEdit && (e.key === "e" || e.key === "E" || e.key === "ث")) startEdit(); // ث = E on a Persian keyboard
    else if (hasComments && (e.key === "c" || e.key === "C" || e.key === "ز")) toggleComments(); // ز = C on a Persian keyboard
    else if (e.key === "r" || e.key === "R" || e.key === "ق") rotate(); // ق = R on a Persian keyboard
    else if (canFull && (e.key === "f" || e.key === "F" || e.key === "ب")) toggleFull(); // ب = F on a Persian keyboard
    else return;
    e.preventDefault();
    e.stopPropagation(); // the chat box would close on Esc too
  });

  // Wheel / trackpad pinch (ctrlKey): needs a non-passive listener to stop the page zooming.
  const onWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
    zoomTo(view.s * factor, { x: e.clientX, y: e.clientY });
  });

  // Keep the current thumbnail in view as you move through the images.
  useEffect(() => {
    stripRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    const h = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", h, true);
    const stage = stageRef.current;
    const w = (e: WheelEvent) => onWheel(e);
    stage?.addEventListener("wheel", w, { passive: false });
    const vis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    const fs = () => onFullChange();
    document.addEventListener("fullscreenchange", fs);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", h, true);
      stage?.removeEventListener("wheel", w);
      document.removeEventListener("visibilitychange", vis);
      document.removeEventListener("fullscreenchange", fs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); // closing the viewer leaves fullscreen too
      document.body.style.overflow = overflow;
      back?.focus?.();
    };
  }, []);

  /** Finish a dismiss gesture with a short exit (drop off the bottom / shrink away), then close. */
  const dismissNow = (how: "drop" | "shrink") => {
    setClosing(true);
    if (how === "drop") setPull(window.innerHeight);
    else setShrink(0.2);
    setTimeout(onClose, 180);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button,a")) return;
    // The primary pointer starts a new gesture: forget fingers whose "up" never arrived.
    if (e.isPrimary) pointers.current.clear();
    lastPointerType.current = e.pointerType;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // No pointer capture yet: it would retarget a plain click/dblclick to the stage (= "backdrop").
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      const [a, b] = pts;
      setDragging(true);
      for (const id of pointers.current.keys()) if (e.currentTarget.hasPointerCapture(id) === false) e.currentTarget.setPointerCapture(id);
      setPull(0);
      gesture.current = { kind: "pinch", start: a, view, dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, moved: true };
    } else if (pts.length === 1) {
      gesture.current = { kind: zoomed ? "pan" : "swipe", start: { x: e.clientX, y: e.clientY }, view, moved: false, trail: [{ y: e.clientY, t: performance.now() }] };
      setDragging(zoomed);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b || !g.dist || !g.mid) return;
      const target = g.view.s * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist);
      // Started at fit and pinching in: shrink the image toward closing instead of stopping at 100%.
      if (g.view.s <= 1.01 && target < 1) {
        setShrink(Math.max(0.3, target));
        setStored({ ...g.view, s: 1, x: 0, y: 0 }); // rotation stays
      } else {
        setShrink(1);
        zoomTo(target, g.mid, g.view);
      }
      return;
    }
    const dx = e.clientX - g.start.x;
    const dy = e.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) > 6) {
      g.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId); // a real drag: keep it even outside the stage
      if (g.kind === "swipe" && e.pointerType !== "mouse" && dy > Math.abs(dx)) {
        g.kind = "pull";
        setDragging(true); // the image follows the finger without the easing
      }
    }
    if (g.kind === "pull") {
      setPull(Math.max(0, dy));
      const now = performance.now();
      g.trail = [...(g.trail ?? []).filter((p) => now - p.t < 100), { y: e.clientY, t: now }]; // last 100 ms, for the flick speed
    }
    if (g.kind === "pan" && g.moved) setStored(clamp({ ...g.view, x: g.view.x + dx, y: g.view.y + dy }));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.delete(e.pointerId)) return;
    const g = gesture.current;
    if (g?.kind === "pinch" && shrink < 1) {
      // The pinch ends as soon as one finger lifts: small enough = close, else spring back.
      setDragging(false);
      if (e.type !== "pointercancel" && shrink < PINCH_CLOSE) dismissNow("shrink");
      else setShrink(1);
    }
    if (pointers.current.size > 0) {
      // pinch → one finger left: carry on as a pan from here
      const [p] = [...pointers.current.values()];
      gesture.current = { kind: "pan", start: p, view, moved: true };
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (!g) return;
    if (g.moved) suppressClick.current = true;
    const dx = e.clientX - g.start.x;
    if (g.kind === "pull") {
      const dy = e.clientY - g.start.y;
      // Flick = moving down fast at the moment of release (a slow start doesn't count against it).
      const now = performance.now();
      const from = (g.trail ?? []).find((p) => now - p.t < 100);
      const flick = dy > 50 && !!from && (e.clientY - from.y) / Math.max(16, now - from.t) > PULL_FLICK_PX_PER_MS;
      if (e.type !== "pointercancel" && (dy > PULL_CLOSE_PX || flick)) {
        dismissNow("drop");
      } else setPull(0); // not far enough: springs back
      return;
    }
    if (g.kind === "swipe" && g.moved && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - g.start.y)) {
      if (dx > 0 && hasNext) onIndex(index + 1); // swipe right → next (RTL)
      else if (dx < 0 && hasPrev) onIndex(index - 1);
      return;
    }
    // Double-tap (touch / pen; the mouse uses dblclick) at the tapped point.
    if (!g.moved && e.pointerType !== "mouse" && e.target === imgRef.current) {
      const now = performance.now();
      const p = { x: e.clientX, y: e.clientY };
      if (lastTap.current && now - lastTap.current.t < 300 && Math.hypot(p.x - lastTap.current.p.x, p.y - lastTap.current.p.y) < 30) {
        lastTap.current = null;
        doubleTap(p);
      } else lastTap.current = { t: now, p };
    }
  };

  if (!item) return null;
  const btn = "shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur disabled:opacity-30 disabled:hover:bg-white/10";
  const pct = Math.round(view.s * 100);
  /** Bars fade out quickly as the image is pulled down or pinched small. */
  const barsFade = dismiss ? { opacity: Math.max(0, 1 - dismiss * 3), transition: dragging ? "none" : "opacity 0.2s" } : undefined;
  // Portal: a transformed / blurred ancestor would otherwise trap `fixed` inside it.
  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={T.dialog}
      dir="rtl"
      lang={lang}
      className={`fixed inset-0 z-[100001] flex flex-col backdrop-blur-sm motion-safe:animate-[app-fade-in_0.2s_ease-out] ${dragging ? "" : "transition-[background-color] duration-200"} ${closing ? "pointer-events-none" : ""}`}
      style={{ backgroundColor: `rgb(0 0 0 / ${0.95 * (closing ? 0 : 1 - dismiss)})` }}
      onPointerDownCapture={(e) => {
        // Any press outside the help panel / reaction picker (and their buttons) just closes them.
        const t = e.target as HTMLElement;
        const closeHelp = help && !t.closest("#lightbox-help,[aria-controls='lightbox-help']");
        const closePicker = picker && !t.closest("#lightbox-reactions,[aria-controls='lightbox-reactions']");
        pressClosedHelp.current = closeHelp || closePicker;
        if (closeHelp) setHelp(false);
        if (closePicker) setPicker(false);
      }}
    >
      <div style={barsFade} className="relative z-10 flex items-center gap-2 px-2 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-3">
        <button ref={closeRef} type="button" onClick={onClose} aria-label={T.close} className={btn}>
          <X className="h-5 w-5" />
        </button>
        {items.length > 1 && (
          <span className="whitespace-nowrap text-sm tabular-nums text-white/80 max-sm:hidden">
            {n(index + 1)} {T.of} {n(items.length)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setHelp((h) => !h)}
          aria-label={T.shortcuts}
          aria-expanded={help}
          aria-controls="lightbox-help"
          title={`${T.shortcuts} (?)`}
          className={`${btn} max-sm:hidden ${help ? "bg-white/25" : ""}`}
        >
          <Keyboard className="h-5 w-5" />
        </button>
        {canPlay && (
          <button
            type="button"
            onClick={togglePlay}
            aria-pressed={playing}
            aria-label={playing ? T.pause : T.play}
            title={`${playing ? T.pause : T.play} (Space)`}
            className={`${btn} ${playing ? "bg-white/25" : ""}`}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
        )}
        {help && (
          <div id="lightbox-help" role="region" aria-label={T.shortcuts} className="absolute right-3 top-full mt-1 w-80 rounded-2xl border border-white/15 bg-zinc-900/95 p-4 text-sm shadow-2xl max-sm:hidden">
            <p className="mb-2.5 font-bold">{T.shortcuts}</p>
            <dl className="space-y-2">
              {T.keys.map(([keys, what]) => (
                <div key={what} className="flex items-center justify-between gap-3">
                  <dt className="text-white/75">{what}</dt>
                  <dd className="flex shrink-0 items-center gap-1" dir="ltr">
                    {keys.map((k) => (
                      <kbd key={k} className="flex h-7 min-w-7 items-center justify-center rounded-md border border-b-2 border-white/20 bg-white/10 px-1.5 font-mono text-xs font-bold">
                        {k}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mb-2.5 mt-4 font-bold">{T.mouse}</p>
            <dl className="space-y-1.5">
              {T.mouseKeys.map(([how, what]) => (
                <div key={how} className="flex items-center justify-between gap-3">
                  <dt className="text-white/75">{what}</dt>
                  <dd className="shrink-0 text-xs text-white/60">{how}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        <div className="mr-auto flex items-center gap-1 sm:gap-1.5">
          <button type="button" onClick={() => zoomTo(view.s * STEP)} disabled={view.s >= MAX} aria-label={T.zoomIn} title={`${T.zoomIn} (+)`} className={btn}>
            <ZoomIn className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={!zoomed}
            title={`${T.actualSize} (0)`}
            aria-label={T.zoomReset(n(pct))}
            className="h-10 min-w-11 shrink-0 rounded-full px-1 text-xs font-bold tabular-nums text-white/80 hover:bg-white/10 disabled:hover:bg-transparent sm:h-11 sm:min-w-14 sm:px-2"
          >
            {n(pct)}%
          </button>
          <button type="button" onClick={() => zoomTo(view.s / STEP)} disabled={!zoomed} aria-label={T.zoomOut} title={`${T.zoomOut} (−)`} className={btn}>
            <ZoomOut className="h-5 w-5" />
          </button>
          <button type="button" onClick={rotate} aria-label={T.rotate} title={`${T.rotate} (R)`} className={`${btn} mr-1.5`}>
            <RotateCw className="h-5 w-5" />
          </button>
          <a href={downloadUrl(item.src)} download aria-label={T.download} title={T.download} className={btn}>
            <Download className="h-5 w-5" />
          </a>
          <a href={item.src} target="_blank" rel="noreferrer" aria-label={T.newTab} title={T.newTab} className={`${btn} max-sm:hidden`}>
            <ExternalLink className="h-5 w-5" />
          </a>
          {canFull && (
            <button
              type="button"
              onClick={toggleFull}
              aria-pressed={full}
              aria-label={full ? T.exitFullscreen : T.fullscreen}
              title={`${full ? T.exitFullscreen : T.fullscreen} (F)`}
              className={`${btn} max-sm:hidden`}
            >
              {full ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      <div
        ref={stageRef}
        className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden px-3 ${zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (pressClosedHelp.current) return; // that press closed the help panel, not the viewer
          if (e.target === e.currentTarget && !zoomed) onClose(); // backdrop
        }}
        onDoubleClick={(e) => {
          // Touch double-taps are handled in onPointerUp; browsers also fire a dblclick for them.
          if (e.target !== imgRef.current || lastPointerType.current !== "mouse") return;
          doubleTap({ x: e.clientX, y: e.clientY });
        }}
      >
        {burst &&
          (burst.emoji ? (
            <span
              key={burst.key}
              aria-hidden="true"
              onAnimationEnd={() => setBurst(null)}
              className="animate-heart-burst pointer-events-none absolute z-10 -ml-14 -mt-14 flex h-28 w-28 select-none items-center justify-center text-8xl leading-none drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              style={{ left: burst.x, top: burst.y }}
            >
              {burst.emoji}
            </span>
          ) : (
            <Heart
              key={burst.key}
              aria-hidden="true"
              onAnimationEnd={() => setBurst(null)}
              className="animate-heart-burst pointer-events-none absolute z-10 -ml-12 -mt-12 h-24 w-24 fill-white text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
              style={{ left: burst.x, top: burst.y }}
            />
          ))}
        {running && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-white/10">
            <div key={`${item.id}-${speed}`} className="h-full origin-right bg-white/70" style={{ animation: `slideCountdown ${speed}s linear both` }} />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-guarded file */}
        <img
          ref={imgRef}
          key={item.id}
          onLoad={() => setLoadedId(item.id)}
          onError={() => setLoadedId(item.id)} // a missing file shouldn't stall the slideshow
          src={item.src}
          alt={item.caption || T.alt}
          width={item.w}
          height={item.h}
          draggable={false}
          style={{ transform: `translate(${view.x}px, ${view.y + pull}px) rotate(${view.r}deg) scale(${view.s * view.fit * shrink * (1 - Math.min(pull / 1500, 0.15))})`, opacity: closing && shrink < 1 ? 0 : undefined }}
          className={`h-auto max-h-full w-auto max-w-full rounded-lg object-contain will-change-transform ${dragging ? "" : "transition-[transform,opacity] duration-150 ease-out"} ${zoomed ? "" : "cursor-zoom-in"} ${playing ? "animate-slide-fade" : ""}`}
        />
        {hasPrev && !zoomed && (
          <button type="button" onClick={() => onIndex(index - 1)} aria-label={T.prev} className={`${btn} absolute right-3 top-1/2 -translate-y-1/2 max-sm:hidden`}>
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
        {hasNext && !zoomed && (
          <button type="button" onClick={() => onIndex(index + 1)} aria-label={T.next} className={`${btn} absolute left-3 top-1/2 -translate-y-1/2 max-sm:hidden`}>
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
      </div>

      <div style={barsFade} className="relative z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {playing && (
          <div className="flex items-center justify-center gap-2 pt-3 text-xs text-white/70">
            <span id="lightbox-speed">{T.speed}</span>
            <div role="radiogroup" aria-labelledby="lightbox-speed" className="flex rounded-full bg-white/10 p-0.5">
              {SPEEDS.map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={speed === v}
                  onClick={() => setSpeed(v)}
                  title={T.speedTitle(n(v))}
                  className={`min-h-8 rounded-full px-3 font-bold tabular-nums transition ${speed === v ? "bg-white text-zinc-900" : "text-white/80 hover:bg-white/10"}`}
                >
                  {n(v)} {T.seconds}
                </button>
              ))}
            </div>
          </div>
        )}
        {(item.caption || item.meta || onReact || canEdit || hasComments) && (
          <div className="space-y-1 px-4 pt-3 text-center text-white">
            {draft ? (
              <form
                className="mx-auto max-w-xl space-y-1.5 text-right"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveEdit();
                }}
              >
                <textarea
                  autoFocus
                  value={draft.text}
                  onChange={(e) => setEditing({ ...draft, text: e.target.value, error: undefined })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void saveEdit();
                    }
                  }}
                  onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                  rows={2}
                  maxLength={1000}
                  dir="auto"
                  disabled={draft.saving}
                  placeholder={T.captionPh}
                  aria-label={T.captionPh}
                  data-no-draft
                  className="w-full resize-none rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm leading-6 text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none disabled:opacity-60"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" disabled={draft.saving} className="flex min-h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-bold text-zinc-900 disabled:opacity-60">
                    {draft.saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {T.save}
                  </button>
                  <button type="button" onClick={() => setEditing(null)} disabled={draft.saving} className="min-h-9 rounded-lg px-3 text-xs font-bold text-white/80 hover:bg-white/10">
                    {T.cancel}
                  </button>
                  {draft.error ? (
                    <span role="alert" className="text-xs text-rose-300">
                      {draft.error}
                    </span>
                  ) : (
                    <span className="text-[11px] text-white/45 max-sm:hidden">{T.editHint}</span>
                  )}
                </div>
              </form>
            ) : (
              (item.caption || canEdit) && (
                <div className="mx-auto flex max-w-xl items-start justify-center gap-1">
                  {item.caption && <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6">{item.caption}</p>}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={startEdit}
                      title={`${T.editCaption} (E)`}
                      aria-label={item.caption ? T.editCaption : T.addCaption}
                      className={`flex shrink-0 items-center justify-center gap-1 rounded-full text-white/70 hover:bg-white/10 hover:text-white ${item.caption ? "-my-0.5 h-7 w-7" : "h-8 px-3 text-xs font-bold"}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {!item.caption && T.addCaption}
                    </button>
                  )}
                </div>
              )
            )}
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/60">
              {onReact && (
                <span className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setPicker(!picker)}
                    aria-haspopup="true"
                    aria-expanded={picker}
                    aria-controls="lightbox-reactions"
                    aria-label={item.reaction ? T.yourReaction(reactionName(item.reaction)) : T.react}
                    title={T.reactTitle}
                    className={`-my-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 ${picker ? "bg-white/15" : ""}`}
                  >
                    {item.reaction ? (
                      <span key={item.reaction} className="animate-heart-pop text-xl leading-none">
                        {item.reaction}
                      </span>
                    ) : (
                      <SmilePlus className="h-5 w-5 text-white/80" />
                    )}
                  </button>
                  {picker && (
                    <span
                      id="lightbox-reactions"
                      role="group"
                      aria-label={T.reactions}
                      dir="ltr"
                      className="absolute bottom-full left-1/2 z-20 mb-3 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/15 bg-zinc-900/95 p-1 shadow-2xl motion-safe:animate-[app-fade-in_0.15s_ease-out]"
                    >
                      {REACTIONS.map((r, i) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => react(r)}
                          aria-pressed={item.reaction === r}
                          aria-label={reactionName(r)}
                          title={`${reactionName(r)} (${n(i + 1)})`}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none transition-transform hover:scale-125 ${item.reaction === r ? "bg-white/20" : ""}`}
                        >
                          {r}
                        </button>
                      ))}
                    </span>
                  )}
                </span>
              )}
              {hasComments && (
                <button
                  type="button"
                  onClick={toggleComments}
                  aria-expanded={showComments}
                  aria-controls="lightbox-comments"
                  aria-label={T.comments(n(comments.length))}
                  title={T.commentsTitle}
                  className={`-my-2 flex h-10 shrink-0 items-center justify-center gap-1 rounded-full px-2 hover:bg-white/10 ${showComments ? "bg-white/15 text-white" : "text-white/80"}`}
                >
                  <MessageCircle className="h-5 w-5" />
                  {comments.length > 0 && <span className="text-xs font-bold tabular-nums">{n(comments.length)}</span>}
                </button>
              )}
              {item.meta && <span>{item.meta}</span>}
              {item.edited && <span className="text-white/45">({T.edited})</span>}
              {item.otherReaction && (
                <span className="flex items-center gap-1 text-white/75" title={`${item.otherReaction.who}: ${reactionName(item.otherReaction.emoji)}`}>
                  <span className="text-sm leading-none">{item.otherReaction.emoji}</span>
                  {item.otherReaction.who}
                </span>
              )}
            </div>
            {showComments && (
              <div id="lightbox-comments" role="region" aria-label={T.commentsRegion} className="mx-auto mt-2 max-w-xl rounded-2xl border border-white/10 bg-white/[0.06] p-2 text-right">
                {comments.length ? (
                  <ol ref={commentsRef} className="max-h-36 space-y-1.5 overflow-y-auto px-1 [scrollbar-width:thin]">
                    {comments.map((c) => (
                      <li key={c.id} className={`flex flex-col ${c.mine ? "items-start" : "items-end"} ${c.pending ? "opacity-60" : ""}`}>
                        <span className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-1.5 text-sm leading-6 ${c.mine ? "rounded-tr-md bg-white/15" : "rounded-tl-md bg-white/[0.07]"}`}>{c.text}</span>
                        <span className="mt-0.5 px-1 text-[10px] text-white/45">
                          {c.who} — {c.pending ? T.sending : c.time}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-2 text-center text-xs text-white/50">{T.noComments}</p>
                )}
                {onComment && (
                  <form
                    className="mt-2 flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendComment();
                    }}
                  >
                    <input
                      autoFocus
                      value={comment.text}
                      onChange={(e) => setComment({ text: e.target.value })}
                      maxLength={1000}
                      dir="auto"
                      disabled={comment.busy}
                      placeholder={T.commentPh}
                      aria-label={T.commentLabel}
                      data-no-draft
                      className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white placeholder:text-white/40 focus:border-white/45 focus:outline-none disabled:opacity-60"
                    />
                    <button type="submit" disabled={comment.busy || !comment.text.trim()} aria-label={T.sendComment} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-900 disabled:opacity-40">
                      {comment.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 -scale-x-100" />}
                    </button>
                  </form>
                )}
                {comment.error && (
                  <p role="alert" className="mt-1 text-xs text-rose-300">
                    {comment.error}
                  </p>
                )}
                {onComment && !comment.error && <p className="mt-1 text-[10px] text-white/40">{T.commentNote}</p>}
              </div>
            )}
          </div>
        )}
        {items.length > 1 && (
          <div ref={stripRef} role="tablist" aria-label={T.strip} className="justify-center-safe mt-3 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
            {items.map((it, i) => (
              <button
                key={it.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={T.nth(n(i + 1), n(items.length))}
                data-active={i === index || undefined}
                onClick={() => onIndex(i)}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg transition ${i === index ? "opacity-100 ring-2 ring-white" : "opacity-50 hover:opacity-90"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- private, cookie-guarded file */}
                <img src={it.src} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
