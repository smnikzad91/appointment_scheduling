// Instagram ad videos: stories (1080×1920, 9:16) and feed posts (1080×1350, 4:5), built from the
// Help Center screenshots (apps/web/public/tutorials/*.webp) and the landing-page copy.
//
//   node scripts/ad-videos/build.mjs              # every video
//   node scripts/ad-videos/build.mjs story-02     # only videos whose id contains "story-02"
//   node scripts/ad-videos/build.mjs post --stills # a frame per second → ad-videos/01-platform-intro/_preview/
//
// Each video is one HTML page whose motion is all CSS animations. The animations are paused and
// stepped frame by frame (Animation.currentTime), each frame is screenshotted by Chromium and piped
// into ffmpeg — so the result is deterministic and never drops frames. Writes
// ad-videos/01-platform-intro/<story|post>/<id>.mp4 (H.264 + silent AAC, 30 fps) and <id>.jpg (a cover frame).
// Text stays inside the area Instagram's own UI doesn't cover. Needs Playwright's Chromium
// (CHROMIUM_PATH to override) and ffmpeg.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = path.join(ROOT, "apps/web");
const OUT = path.join(ROOT, "ad-videos");
/** Default series folder; a video can name its own (`dir`). */
const SERIES = "01-platform-intro";
const ONLY = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "";
// --stills: instead of the videos, one frame per second of each into ad-videos/01-platform-intro/_preview/
const STILLS = process.argv.includes("--stills");
const FPS = 30;

const FONT = readFileSync(path.join(WEB, "public/fonts/Vazirmatn-Variable.woff2")).toString("base64");
const ICON = readFileSync(path.join(WEB, "public/images/logo/nobatet-symbol-v2.png")).toString("base64");
const shotCache = new Map();
const shot = (id) => {
  if (!shotCache.has(id)) {
    const b64 = readFileSync(path.join(WEB, `public/tutorials/${id}.webp`)).toString("base64");
    shotCache.set(id, `data:image/webp;base64,${b64}`);
  }
  return shotCache.get(id);
};

const fa = (v) => String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(chromium.executablePath())) return chromium.executablePath();
  const cache = path.join(homedir(), ".cache/ms-playwright");
  const builds = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const b of builds) {
    const p = path.join(cache, b, "chrome-linux64/chrome");
    if (existsSync(p)) return p;
  }
  if (existsSync("/opt/pw-browsers/chromium")) return "/opt/pw-browsers/chromium";
  throw new Error("No Chromium found — install one (npx playwright install chromium) or set CHROMIUM_PATH");
}

// ── building blocks ───────────────────────────────────────────────────────────────────────────
// Times are in seconds from the start of the video.

/** One entry of a CSS `animation` list. */
const an = (name, start, dur, { ease = "cubic-bezier(.2,.8,.2,1)", fill = "both", iter = 1 } = {}) =>
  `${name} ${Math.round(dur * 1000)}ms ${ease} ${Math.round(start * 1000)}ms ${iter} ${fill}`;
const anims = (...list) => `animation:${list.filter(Boolean).join(",")};`;

/** Visible from `start` to `end`: fades in, then out (no fade-out when `end` is null). */
const scene = (start, end, inner, cls = "") =>
  `<section class="scene ${cls}" style="${anims(an("fadeIn", start, 0.35), end != null && an("fadeOut", end - 0.35, 0.35, { fill: "forwards" }))}">${inner}</section>`;

/** Text whose words rise in one after another; `*phrase*` gets the brand gradient. */
function words(text, start, step = 0.09) {
  let i = 0;
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => {
      const grad = part.startsWith("*");
      return part
        .replace(/\*/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => `<span class="w${grad ? " grad" : ""}" style="${anims(an("wordIn", start + step * i++, 0.55))}">${esc(w)}</span>`)
        .join(" ");
    })
    .join(" ");
}

const ICONS = {
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  sms: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>',
  card: '<rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  arrow: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  wallet: '<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

const brand = (start = 0) =>
  `<div class="brand" style="${anims(an("fadeDown", start, 0.6))}"><img src="data:image/png;base64,${ICON}">نوبتت</div>`;

/**
 * A phone showing screenshots in turn: `screens` = [{ id, at, tap?: [x%, y%] }], each shown from
 * `at` until the next one's `at` (slides in from the left, like a new page in an RTL app). `tap`
 * draws a finger tap on the screen 0.5 s before the next screen.
 */
function phone({ height, enter, exit, screens, x = "50%", y, anchor = "center" }) {
  const width = Math.round((height - 28) * (780 / 1688) + 28);
  const pos =
    anchor === "center"
      ? `left:calc(${x} - ${width / 2}px);`
      : anchor === "right"
        ? `right:${x};`
        : `left:${x};`;
  const layers = screens
    .map((s, i) => {
      const next = screens[i + 1]?.at ?? exit ?? 999;
      const inA = i === 0 ? null : an("screenIn", s.at, 0.45);
      const tap = s.tap
        ? `<div class="tap" style="left:${s.tap[0]}%;top:${s.tap[1]}%;${anims(an("tap", next - 0.65, 0.6, { fill: "both" }))}"></div>`
        : "";
      return `<div class="layer" style="z-index:${i + 1};${inA ? anims(inA) : ""}"><img src="${shot(s.id)}">${tap}</div>`;
    })
    .join("");
  return `<div class="phoneWrap" style="top:${y}px;${pos}width:${width}px;height:${height}px;${anims(
    an("phoneIn", enter, 0.9),
    exit != null && an("phoneOut", exit - 0.4, 0.4, { fill: "forwards", ease: "ease-in" }),
  )}"><div class="float" style="${anims(an("float", 0, 4, { ease: "ease-in-out", iter: "infinite" }))}"><div class="phone"><div class="screen">${layers}</div></div></div></div>`;
}

/** Feature rows popping in one after another. */
const featureList = (items, start, step = 0.45) =>
  `<ul class="feats">${items
    .map(
      ([ic, text], i) =>
        `<li style="${anims(an("popIn", start + i * step, 0.55))}"><span class="ic">${icon(ic)}</span><span>${esc(text)}</span></li>`,
    )
    .join("")}</ul>`;

/** Closing call to action: logo, line, pulsing button, address. */
/** Where people reach us — shown on the videos that end with `contact: true`. */
const CONTACT = { instagram: "@nobatet.app", phone: "09024158946" };

const cta = (start, { line, button, sub = "nobatet.app", contact = false }) => `
  <div class="cta">
    <div class="ctaLogo" style="${anims(an("logoPop", start + 0.1, 0.8))}"><img src="data:image/png;base64,${ICON}"></div>
    <div class="ctaName" style="${anims(an("wordIn", start + 0.45, 0.6))}">نوبتت</div>
    <p class="ctaLine">${words(line, start + 0.7, 0.07)}</p>
    <div style="${anims(an("popIn", start + 1.3, 0.6))}"><div class="btn" style="${anims(an("pulse", start + 1.9, 1.2, { ease: "ease-in-out", iter: "infinite", fill: "none" }))}">${esc(button)}<span class="arrow">${icon("arrow")}</span></div></div>
    <div class="url" style="${anims(an("fadeIn", start + 1.8, 0.6))}">${esc(sub)}</div>
    ${
      contact
        ? `<div class="contact" style="${anims(an("popIn", start + 2.1, 0.6))}">
            <span>${icon("instagram")}<b dir="ltr">${esc(CONTACT.instagram)}</b></span>
            <span>${icon("phone")}<b dir="ltr">${fa(CONTACT.phone)}</b></span></div>`
        : ""
    }
  </div>`;

// ── styles ────────────────────────────────────────────────────────────────────────────────────

const style = (W, H) => `
@font-face { font-family: Vazirmatn; src: url(data:font/woff2;base64,${FONT}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${W}px; height: ${H}px; }
body { font-family: Vazirmatn, sans-serif; direction: rtl; color: #f5ede8; overflow: hidden; position: relative; background: #121319; }
.bg { position: absolute; inset: 0; overflow: hidden; }
.blob { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .75; }
.scene { position: absolute; inset: 0; }
.brand { position: absolute; top: var(--top); right: 70px; display: flex; align-items: center; gap: 16px; font-weight: 900; font-size: 40px; color: #efbda0; z-index: 5; }
.brand img { width: 72px; height: 72px; display: block; filter: drop-shadow(0 8px 18px rgb(198 138 114 / .45)); }
.w { display: inline-block; }
.grad { background: linear-gradient(90deg, #efbda0, #c68a72 55%, #9c5e4b); -webkit-background-clip: text; background-clip: text; color: transparent; padding-bottom: .08em; }

/* centred statement */
.hero { position: absolute; left: 70px; right: 70px; top: var(--top); bottom: var(--bottom); display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; gap: 36px; }
.hero h1 { font-size: var(--h1); line-height: 1.4; font-weight: 900; }
.hero p { font-size: var(--p); line-height: 1.7; font-weight: 600; color: #d8ccc6; max-width: 880px; }
.kicker { display: inline-block; font-size: calc(var(--p) * .85); font-weight: 800; color: #efbda0; background: #35292a; padding: 10px 30px; border-radius: 999px; }

/* text beside a phone */
.side { position: absolute; left: 50px; width: var(--sideW); top: var(--top); bottom: var(--bottom); display: flex; flex-direction: column; justify-content: center; gap: 30px; }
.side h2 { font-size: calc(var(--h2) * .88); line-height: 1.45; font-weight: 900; }
.side p { font-size: calc(var(--p) * .92); line-height: 1.75; font-weight: 600; color: #d8ccc6; }
.top { position: absolute; left: 70px; right: 70px; top: var(--top); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 18px; }
.top h2 { font-size: var(--h2); line-height: 1.45; font-weight: 900; }
.top p { font-size: var(--p); font-weight: 700; color: #d8ccc6; }
.stepNum { display: inline-flex; align-items: center; justify-content: center; width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, #efbda0, #c68a72 50%, #9c5e4b); color: #121319; font-weight: 900; font-size: 44px; box-shadow: 0 12px 26px -10px rgb(198 138 114 / .6); }
.swap { position: relative; }
.swap > * { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 24px; }

.feats { list-style: none; display: flex; flex-direction: column; gap: 22px; }
.feats li { display: flex; align-items: center; gap: 20px; font-size: var(--li); font-weight: 800; background: #1e2229; border: 2px solid #2f3540; border-radius: 26px; padding: 18px 22px; box-shadow: 0 14px 30px -16px rgb(0 0 0 / .7); }
.feats .ic { flex: none; width: 66px; height: 66px; border-radius: 18px; background: linear-gradient(135deg, #efbda0, #c68a72 50%, #9c5e4b); color: #121319; display: flex; align-items: center; justify-content: center; }
.feats .ic svg { width: 36px; height: 36px; }

.phoneWrap { position: absolute; z-index: 3; }
.float { width: 100%; height: 100%; }
.phone { width: 100%; height: 100%; padding: 14px; border-radius: 60px; background: #2b344d; box-shadow: 0 50px 80px -30px rgb(0 0 0 / .75), inset 0 0 0 2px rgb(198 138 114 / .35); }
.screen { position: relative; width: 100%; height: 100%; border-radius: 46px; overflow: hidden; background: #111; }
.layer { position: absolute; inset: 0; }
.layer img { width: 100%; display: block; }
.tap { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; background: rgb(255 255 255 / .55); border: 5px solid rgb(224 149 111 / .95); }

.chip { display: inline-flex; align-items: center; gap: 14px; font-size: calc(var(--p) * .9); font-weight: 800; background: #1e2229; color: #f5ede8; border: 2px solid rgb(198 138 114 / .45); padding: 16px 30px; border-radius: 999px; direction: rtl; }
.chip svg { width: 34px; height: 34px; color: #efbda0; }

/* hook: ringing phone */
.ring { position: relative; width: 300px; height: 300px; }
.ring .disc { position: absolute; inset: 0; border-radius: 50%; background: linear-gradient(135deg, #efbda0, #c68a72 50%, #9c5e4b); color: #121319; display: flex; align-items: center; justify-content: center; box-shadow: 0 30px 60px -20px rgb(198 138 114 / .55); }
.ring .disc svg { width: 140px; height: 140px; }
.ring .wave { position: absolute; inset: 0; border-radius: 50%; border: 6px solid #e0956f; }
.ring .ban { position: absolute; inset: -20px; color: #c81e1e; }
.ring .ban svg { width: 100%; height: 100%; stroke-width: 2.2; }
.missed { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; }
.missed span { font-size: calc(var(--p) * .85); font-weight: 800; color: #b42318; background: #fee4e2; padding: 10px 26px; border-radius: 999px; }

.cta { position: absolute; left: 70px; right: 70px; top: var(--top); bottom: var(--bottom); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 26px; }
.ctaLogo img { width: 210px; height: 210px; display: block; filter: drop-shadow(0 30px 50px rgb(198 138 114 / .45)); }
.ctaName { font-size: 92px; font-weight: 900; color: #efbda0; line-height: 1.2; }
.ctaLine { font-size: calc(var(--p) * 1.05); font-weight: 700; line-height: 1.7; color: #d8ccc6; max-width: 860px; }
.btn { display: inline-flex; align-items: center; gap: 18px; margin-top: 20px; font-size: 52px; font-weight: 900; color: #121319; padding: 26px 64px; border-radius: 999px; background: linear-gradient(135deg, #efbda0, #c68a72 50%, #9c5e4b); box-shadow: 0 24px 50px -16px rgb(198 138 114 / .7); }
.btn .arrow svg { width: 50px; height: 50px; display: block; }
.url { font-size: 40px; font-weight: 800; color: #c68a72; direction: ltr; letter-spacing: 1px; }

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes fadeOut { from { opacity: 1 } to { opacity: 0 } }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-30px) } to { opacity: 1; transform: none } }
@keyframes wordIn { from { opacity: 0; transform: translateY(46px) scale(.96); filter: blur(6px) } to { opacity: 1; transform: none; filter: none } }
@keyframes popIn { 0% { opacity: 0; transform: translateY(30px) scale(.85) } 70% { opacity: 1; transform: scale(1.03) } 100% { opacity: 1; transform: none } }
@keyframes logoPop { 0% { opacity: 0; transform: scale(.3) rotate(-25deg) } 70% { opacity: 1; transform: scale(1.08) rotate(4deg) } 100% { opacity: 1; transform: none } }
@keyframes pulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.06) } }
@keyframes phoneIn { from { opacity: 0; transform: translateY(260px) rotate(-6deg) } to { opacity: 1; transform: none } }
@keyframes phoneOut { from { opacity: 1; transform: none } to { opacity: 0; transform: translateY(120px) scale(.94) } }
@keyframes float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
@keyframes screenIn { from { transform: translateX(-100%) } to { transform: none } }
@keyframes tap { 0% { opacity: 0; transform: scale(.4) } 30% { opacity: 1; transform: scale(1) } 100% { opacity: 0; transform: scale(1.5) } }
@keyframes shake { 0%, 100% { transform: rotate(0) } 10%, 30%, 50%, 70% { transform: rotate(-14deg) } 20%, 40%, 60%, 80% { transform: rotate(14deg) } 90% { transform: rotate(0) } }
@keyframes wave { from { opacity: .8; transform: scale(1) } to { opacity: 0; transform: scale(1.8) } }
@keyframes ban { from { opacity: 0; transform: scale(1.6) } to { opacity: 1; transform: none } }
@keyframes drift1 { 0%, 100% { transform: translate(0, 0) } 50% { transform: translate(-120px, 90px) } }
@keyframes drift2 { 0%, 100% { transform: translate(0, 0) } 50% { transform: translate(110px, -80px) } }
@keyframes drift3 { 0%, 100% { transform: translate(0, 0) scale(1) } 50% { transform: translate(60px, 60px) scale(1.15) } }
`;

const background = (W, H) => `<div class="bg">
  <div class="blob" style="width:${W * 0.9}px;height:${W * 0.9}px;right:-${W * 0.3}px;top:-${W * 0.25}px;background:rgb(198 138 114 / .32);${anims(an("drift1", 0, 14, { ease: "ease-in-out", iter: "infinite" }))}"></div>
  <div class="blob" style="width:${W * 0.8}px;height:${W * 0.8}px;left:-${W * 0.3}px;bottom:-${W * 0.2}px;background:rgb(43 52 77 / .9);${anims(an("drift2", 0, 16, { ease: "ease-in-out", iter: "infinite" }))}"></div>
  <div class="blob" style="width:${W * 0.5}px;height:${W * 0.5}px;left:${W * 0.15}px;top:${H * 0.35}px;background:rgb(156 94 75 / .3);opacity:.6;${anims(an("drift3", 0, 12, { ease: "ease-in-out", iter: "infinite" }))}"></div>
</div>`;

/** Format sizes: `top`/`bottom` keep text clear of Instagram's own UI. */
const FORMATS = {
  story: { W: 1080, H: 1920, vars: "--top:250px;--bottom:330px;--h1:96px;--h2:68px;--p:40px;--li:34px;--sideW:480px;" },
  post: { W: 1080, H: 1350, vars: "--top:80px;--bottom:80px;--h1:84px;--h2:60px;--p:36px;--li:34px;--sideW:440px;" },
};

// ── the videos ────────────────────────────────────────────────────────────────────────────────

/** Hook used by the salon-owner videos: a ringing phone that gets crossed out. */
const ringHook = (end, { title, sub }) =>
  scene(
    0,
    end,
    `<div class="hero">
      <div class="ring" style="${anims(an("popIn", 0.1, 0.6))}">
        <div class="wave" style="${anims(an("wave", 0.3, 1, { ease: "ease-out", iter: 3, fill: "none" }))}"></div>
        <div class="disc"><div style="display:flex;${anims(an("shake", 0.3, 1, { iter: 2, ease: "linear", fill: "none" }))}">${icon("phone")}</div></div>
        <div class="ban" style="${anims(an("ban", end - 1.1, 0.4))}">${icon("x")}</div>
      </div>
      <h1>${words(title, 0.5)}</h1>
      <div class="missed">${["تماس بی‌پاسخ", "دفتر خط‌خورده", "مشتری که نیامد"]
        .map((t, i) => `<span style="${anims(an("popIn", 1.3 + i * 0.3, 0.5))}">${t}</span>`)
        .join("")}</div>
      ${sub ? `<p style="${anims(an("fadeIn", end - 1.1, 0.5))}">${esc(sub)}</p>` : ""}
    </div>`,
  );


// ── customer series helpers ──

/** Hero hook: kicker, headline (*word* = gradient), a line under it. */
const hook = (end, { kicker, title, sub, ic }) =>
  scene(
    0,
    end,
    `<div class="hero">${ic ? `<div class="ring" style="width:220px;height:220px;${anims(an("logoPop", 0.1, 0.8))}"><div class="disc">${icon(ic)}</div></div>` : ""}
      ${kicker ? `<span class="kicker" style="${anims(an("popIn", 0.15, 0.5))}">${esc(kicker)}</span>` : ""}
      <h1>${words(title, 0.4)}</h1>
      ${sub ? `<p style="${anims(an("fadeIn", 1.4, 0.6))}">${esc(sub)}</p>` : ""}</div>`,
  );

/** Story: numbered captions over a phone that walks through `steps` (each with an optional tap). */
function storySteps(t0, step, steps) {
  const end = t0 + steps.length * step + 0.4;
  return {
    end,
    html: scene(
      t0,
      end,
      `<div class="top" style="height:260px">${steps
        .map((s, i) => {
          const a = t0 + i * step;
          const out = i < steps.length - 1 ? an("fadeOut", a + step - 0.25, 0.25, { fill: "forwards" }) : null;
          return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:18px;${anims(an("popIn", a + 0.05, 0.5), out)}">
            <span class="stepNum">${s.ic ? icon(s.ic) : fa(i + 1)}</span><h2>${esc(s.text)}</h2></div>`;
        })
        .join("")}</div>
      ${phone({ height: 1030, y: 560, enter: t0, exit: end, screens: steps.map((s, i) => ({ id: s.id, at: t0 + i * step, tap: s.tap })) })}`,
    ),
  };
}

/** Feed post: one point at a time beside the phone (icon, title, text), with progress dots. */
function postPoints(t0, step, points) {
  const end = t0 + points.length * step + 0.3;
  return {
    end,
    html: scene(
      t0,
      end,
      `${brand(t0)}<div class="side" style="top:200px"><div class="swap" style="height:520px">${points
        .map((f, i) => {
          const a = t0 + i * step;
          const out = i < points.length - 1 ? an("fadeOut", a + step - 0.3, 0.3, { fill: "forwards" }) : null;
          const badge = f.ic
            ? `<span class="feats"><span class="ic" style="width:96px;height:96px;border-radius:26px;${anims(an("popIn", a + 0.05, 0.5))}">${icon(f.ic)}</span></span>`
            : `<span class="stepNum" style="width:110px;height:110px;font-size:60px;${anims(an("logoPop", a + 0.05, 0.6))}">${fa(i + 1)}</span>`;
          return `<div style="${anims(an("fadeIn", a, 0.01), out)}">${badge}
            <h2>${words(f.title, a + 0.15, 0.08)}</h2>
            <p style="${anims(an("fadeIn", a + 0.5, 0.5))}">${esc(f.text)}</p></div>`;
        })
        .join("")}</div>
        <div class="dots">${points.map((_, i) => `<i style="${anims(an("dotOn", t0 + i * step, 0.3, { fill: "both" }), i < points.length - 1 && an("dotOff", t0 + (i + 1) * step, 0.3, { fill: "forwards" }))}"></i>`).join("")}</div></div>
      ${phone({ height: 1000, y: 190, x: "50px", anchor: "right", enter: t0, exit: end, screens: points.map((f, i) => ({ id: f.id, at: t0 + i * step, tap: f.tap })) })}`,
    ),
  };
}

/**
 * The customer series (ad-videos/02-for-customers): people who've never booked a salon online —
 * find one nearby, book in a minute, why the pre-payment is safe, and never forgetting a booking.
 * Every one ends on «رزرو نوبت» + nobatet.app.
 */
function customerVideos() {
  const dir = "02-for-customers";
  const ctaLine = "آرایشگاه و سالن زیبایی نزدیک خودتان را پیدا کنید و آنلاین نوبت بگیرید";
  return [
    {
      id: "story-c01-find-salon",
      dir,
      format: "story",
      dur: 16,
      cover: 6,
      body: () => {
        const s = storySteps(3.2, 2.6, [
          { id: "customer-search-1", text: "سالن‌ها را با شهر و خدمت پیدا کنید", ic: "search" },
          { id: "customer-search-2", text: "نزدیک‌ترین سالن‌ها به شما", ic: "pin", tap: [80, 50] },
          { id: "customer-search-3", text: "روی نقشه ببینید", ic: "pin" },
          { id: "customer-book-1", text: "امتیاز، نمونه کار و قیمت‌ها", ic: "star", tap: [50, 89] },
        ]);
        return [
          hook(3.2, { kicker: "آرایشگاه خوب کجاست؟", title: "سالن *نزدیک خودتان* را پیدا کنید", sub: "با امتیاز و نظر مشتری‌های واقعی", ic: "pin" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: ctaLine, button: "پیدا کردن سالن" })),
        ];
      },
    },
    {
      id: "story-c02-book-in-a-minute",
      dir,
      format: "story",
      dur: 19,
      cover: 6,
      body: () => {
        const s = storySteps(3, 2.1, [
          { id: "customer-book-2", text: "خدمت را انتخاب کنید", tap: [50, 96] },
          { id: "customer-book-3", text: "آرایشگر دلخواه، یا «فرقی نمی‌کند»", tap: [50, 78] },
          { id: "customer-book-4", text: "روز و ساعت خالی را بزنید", tap: [85, 61] },
          { id: "customer-book-6", text: "کد پیامکی را وارد کنید" },
          { id: "customer-book-8", text: "پیش‌پرداخت از کیف پول", tap: [50, 96] },
          { id: "customer-book-9", text: "نوبتتان ثبت شد!", ic: "check" },
        ]);
        return [
          hook(3, { kicker: "بدون تماس، بدون انتظار", title: "نوبت آرایشگاه در *کمتر از یک دقیقه*", sub: "هر ساعت از شبانه‌روز، حتی وقتی سالن بسته است", ic: "clock" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: ctaLine, button: "رزرو نوبت" })),
        ];
      },
    },
    {
      id: "story-c03-safe-prepayment",
      dir,
      format: "story",
      dur: 17.5,
      cover: 6,
      body: () => {
        const s = storySteps(3.4, 2.7, [
          { id: "customer-wallet-1", text: "کیف پول را یک بار شارژ کنید", ic: "wallet", tap: [50, 44] },
          { id: "customer-book-7", text: "فقط ۲۵٪ پیش‌پرداخت؛ باقی در سالن", ic: "card" },
          { id: "customer-cancel-1", text: "سالن تایید نکرد؟ پول کامل برمی‌گردد", ic: "shield" },
          { id: "customer-bookings-1", text: "همه نوبت‌ها و وضعیتشان یک‌جا", ic: "calendar" },
        ]);
        return [
          hook(3.4, { kicker: "پرداخت امن", title: "پیش‌پرداخت *مطمئن*، بدون کارت به کارت با سالن", sub: "پول شما تا انجام نوبت نزد نوبتت امانت می‌ماند", ic: "shield" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: "با خیال راحت آنلاین نوبت بگیرید", button: "رزرو نوبت" })),
        ];
      },
    },
    {
      id: "story-c04-never-forget",
      dir,
      format: "story",
      dur: 17,
      cover: 6,
      body: () => {
        const s = storySteps(3.2, 2.5, [
          { id: "customer-bookings-1", text: "پیامک یادآوری قبل از نوبت", ic: "bell" },
          { id: "customer-bookings-2", text: "رزرو دوباره با یک لمس", ic: "repeat", tap: [50, 53] },
          { id: "customer-waitlist-1", text: "روز پر است؟ در لیست انتظار بمانید", ic: "clock", tap: [50, 87] },
          { id: "customer-saved-2", text: "سالن‌های محبوب همیشه دم دست", ic: "heart" },
        ]);
        return [
          hook(3.2, { kicker: "نوبت‌های من", title: "دیگر هیچ نوبتی *یادتان نمی‌رود*", sub: "یادآوری، رزرو دوباره و لیست انتظار؛ همه در یک اپ", ic: "bell" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: ctaLine, button: "رزرو نوبت" })),
        ];
      },
    },
    {
      id: "post-c01-why-nobatet",
      dir,
      format: "post",
      dur: 22,
      cover: 5,
      body: () => {
        const s = postPoints(2.8, 2.6, [
          { id: "customer-search-2", ic: "pin", title: "سالن نزدیک شما", text: "سالن‌ها و آرایشگرهای مستقل اطرافتان را با امتیاز و قیمت ببینید." },
          { id: "customer-book-4", ic: "clock", title: "ساعت‌های واقعاً خالی", text: "فقط وقت‌هایی را می‌بینید که آزادند؛ بدون تماس و بدون معطلی." },
          { id: "customer-book-7", ic: "shield", title: "پیش‌پرداخت امن", text: "۲۵٪ از کیف پول؛ اگر سالن لغو کند یا تایید نکند، کامل برمی‌گردد." },
          { id: "customer-bookings-1", ic: "bell", title: "یادآوری پیامکی", text: "قبل از هر نوبت پیامک می‌گیرید؛ نوبت‌ها همیشه در «نوبت‌های من» است." },
          { id: "customer-review-2", ic: "star", title: "نظر مشتری‌های واقعی", text: "فقط کسانی که نوبت گرفته‌اند نظر می‌دهند؛ شما هم امتیاز بدهید." },
          { id: "customer-bookings-2", ic: "repeat", title: "رزرو دوباره", text: "همان خدمت، همان آرایشگر؛ با یک لمس." },
        ]);
        return [
          hook(2.8, { kicker: "چرا نوبتت؟", title: "نوبت آرایشگاه، *ساده و مطمئن*" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: ctaLine, button: "رزرو نوبت" })),
        ];
      },
    },
    {
      id: "post-c02-first-booking",
      dir,
      format: "post",
      dur: 17,
      cover: 4.5,
      body: () => {
        const s = postPoints(2.6, 2.4, [
          { id: "customer-book-1", title: "سالن را باز کنید", text: "از جستجو یا لینکی که سالن در اینستاگرام گذاشته.", tap: [50, 89] },
          { id: "customer-book-2", title: "خدمت را بزنید", text: "مدت و قیمت هر خدمت از اول معلوم است.", tap: [50, 96] },
          { id: "customer-book-4", title: "ساعت خالی را بزنید", text: "آرایشگر دلخواه، یا «فرقی نمی‌کند».", tap: [85, 61] },
          { id: "customer-book-6", title: "با کد پیامکی وارد شوید", text: "بدون رمز؛ حساب شما همان‌جا ساخته می‌شود." },
          { id: "customer-book-9", title: "تمام!", text: "پیامک تایید و یادآوری برایتان می‌آید." },
        ]);
        return [
          hook(2.6, { kicker: "اولین نوبت آنلاین", title: "*پنج لمس* تا نوبت آرایشگاه" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: ctaLine, button: "رزرو نوبت" })),
        ];
      },
    },
  ];
}


// ── 01-platform-intro: general features; some end with Instagram + the admin's number (2026-10-31) ──

function generalVideos() {
  return [
    {
      id: "story-04-platform-tour",
      format: "story",
      dur: 25,
      cover: 7,
      body: () => {
        const who = storySteps(3.2, 2.4, [
          { id: "owner-home-1", text: "سالن‌ها: نوبت، آرایشگرها و حسابداری", ic: "users" },
          { id: "stylist-home-1", text: "آرایشگرها: برنامه و درآمد خودشان", ic: "scissors" },
          { id: "indie-page-1", text: "آرایشگرهای مستقل: صفحه رزرو با نام خودشان", ic: "link" },
          { id: "customer-book-4", text: "مشتری‌ها: رزرو در چند لمس", ic: "calendar", tap: [85, 61] },
        ]);
        const t1 = who.end;
        const feats = scene(
          t1,
          t1 + 5.2,
          `<div class="side"><h2>${words("هرچه برای نوبت‌دهی *لازم دارید*", t1 + 0.1, 0.08)}</h2>
            ${featureList(
              [
                ["link", "لینک رزرو و کد QR"],
                ["sms", "پیامک یادآوری خودکار"],
                ["wallet", "پیش‌پرداخت با کیف پول"],
                ["chart", "حسابداری و آمار بازدید"],
                ["calendar", "تقویم شمسی و نمای هفته"],
              ],
              t1 + 0.6,
              0.4,
            )}</div>
          ${phone({ height: 920, y: 470, x: "45px", anchor: "right", enter: t1 + 0.2, exit: t1 + 5.2, screens: [{ id: "owner-share-1", at: t1 + 0.2 }, { id: "owner-insights-1", at: t1 + 2.7 }] })}`,
        );
        const end = t1 + 5.2;
        return [
          hook(3.2, { kicker: "نوبتت", title: "*یک اپ* برای سالن، آرایشگر و مشتری", sub: "نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی؛ فارسی و با تقویم شمسی" }),
          who.html,
          feats,
          scene(end, null, cta(end, { line: "سؤالی دارید؟ در اینستاگرام پیام بدهید یا تماس بگیرید", button: "شروع رایگان", contact: true })),
        ];
      },
    },
    {
      id: "story-05-free-month",
      format: "story",
      dur: 18,
      cover: 6,
      body: () => {
        const s = storySteps(3.4, 2.7, [
          { id: "owner-register-1", text: "در چند دقیقه ثبت‌نام کنید" },
          { id: "owner-services-2", text: "خدمات و آرایشگرها را اضافه کنید" },
          { id: "owner-share-1", text: "لینک رزرو را در اینستاگرام بگذارید" },
          { id: "owner-plan-1", text: "یک ماه کامل رایگان، با همه امکانات", ic: "star" },
        ]);
        return [
          hook(3.4, { kicker: "ویژه سالن‌ها و آرایشگرها", title: "*یک ماه رایگان* نوبت‌دهی آنلاین", sub: "بدون کارت بانکی؛ هر وقت خواستید پلن بخرید", ic: "calendar" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: "همین امروز سالن‌تان را آنلاین کنید", button: "شروع رایگان", contact: true })),
        ];
      },
    },
    {
      id: "post-04-all-features",
      format: "post",
      dur: 27,
      cover: 5,
      body: () => {
        const s = postPoints(2.8, 2.6, [
          { id: "owner-share-1", ic: "link", title: "صفحه رزرو، لینک و QR", text: "لینک اختصاصی برای بیو اینستاگرام و پوستر آماده استوری و چاپ." },
          { id: "customer-book-4", ic: "calendar", title: "رزرو آنلاین ۲۴ ساعته", text: "مشتری فقط ساعت‌های خالی هر آرایشگر را می‌بیند؛ بدون تداخل." },
          { id: "owner-prepaid-2", ic: "wallet", title: "پیش‌پرداخت ۲۵٪", text: "از کیف پول مشتری؛ نوبت‌های بی‌خبر کم می‌شوند." },
          { id: "customer-bookings-1", ic: "sms", title: "پیامک یادآوری خودکار", text: "تایید و یادآوری نوبت برای مشتری و آرایشگر." },
          { id: "stylist-home-1", ic: "users", title: "پنل هر آرایشگر", text: "برنامه، ساعت کاری، مرخصی و درآمد هر نفر در اپ خودش." },
          { id: "owner-accounting-1", ic: "chart", title: "حسابداری سالن", text: "درآمد، سهم آرایشگرها، هزینه‌ها و سود خالص ماه شمسی." },
          { id: "owner-insights-1", ic: "search", title: "آمار بازدید", text: "چند نفر صفحه شما را دیدند، از کجا آمدند و چند نفر نوبت گرفتند." },
          { id: "owner-wallet-1", ic: "card", title: "کیف پول و برداشت", text: "شارژ خودکار، پرداخت به آرایشگرها و برداشت به شبا." },
        ]);
        return [
          hook(2.8, { kicker: "امکانات نوبتت", title: "*هشت ابزار* برای مدیریت نوبت سالن" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: "یک ماه رایگان امتحان کنید", button: "شروع رایگان", contact: true })),
        ];
      },
    },
    {
      id: "post-05-whats-new",
      format: "post",
      dur: 17,
      cover: 5,
      body: () => {
        const s = postPoints(2.6, 2.8, [
          { id: "owner-prepaid-1", ic: "wallet", title: "پیش‌پرداخت آنلاین", text: "رزروهای آنلاین با ۲۵٪ پیش‌پرداخت از کیف پول مشتری." },
          { id: "owner-insights-3", ic: "chart", title: "آمار بازدید و رفتار مشتری", text: "منبع بازدید، مسیر رزرو، شلوغی هفته و خدمات پرطرفدار." },
          { id: "owner-share-2", ic: "link", title: "پوستر و کد QR آماده", text: "پوستر استوری، پست و چاپی با رنگ برند سالن شما." },
          { id: "owner-plan-2", ic: "star", title: "پلن مناسب هر سالن", text: "از آرایشگر مستقل تا سالن بزرگ؛ خرید از کیف پول." },
        ]);
        return [
          hook(2.6, { kicker: "تازه‌های نوبتت", title: "امکانات *تازه* نوبتت" }),
          s.html,
          scene(s.end, null, cta(s.end, { line: "نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی", button: "شروع رایگان" })),
        ];
      },
    },
  ];
}


// ── 03-guide-series: one video per Help Center guide (2026-10-31) ──
// Built from apps/web/src/content/tutorials.ts and the frames in tutorialShots.json, like the
// /tutorials pages and the story highlights: cover → one scene per step (title, the screen with its
// numbered frames, caption cards joined by leader lines) → the guide's link.

const { TUTORIALS } = await import(path.join(WEB, "src/content/tutorials.ts"));
const SHOT_BOXES = JSON.parse(readFileSync(path.join(WEB, "src/content/tutorialShots.json"), "utf8"));
const GUIDE_PANELS = [
  { role: "owner", dir: "01-salon-panel", label: "پنل سالن", button: "شروع رایگان" },
  { role: "stylist", dir: "02-stylist-panel", label: "پنل آرایشگر", button: "ورود به پنل" },
  { role: "independent", dir: "03-independent-stylist-panel", label: "آرایشگر مستقل", button: "ثبت‌نام رایگان" },
  { role: "customer", dir: "04-customer-panel", label: "پنل مشتری", button: "رزرو نوبت" },
];

/** A step: title on top, the phone on the right with its frames, captions on the left with leader lines. */
function guideStep(t, i, a, d) {
  const st = t.steps[i];
  const boxes = (SHOT_BOXES[st.shot]?.boxes ?? []).slice(0, 4);
  const labels = (st.callouts ?? []).slice(0, boxes.length);
  const PH = 1040, PT = 560, PR = 60;
  const PW = Math.round((PH - 28) * (780 / 1688) + 28);
  const SW = PW - 28, SH = PH - 28;
  const px = 1080 - PR - PW + 14; // screen's left edge
  const py = PT + 14;
  // caption cards level with their frames, pushed apart (top-down) and kept on screen
  const NH = 108, GAP = 22, NX = 50, NW = 1080 - PR - PW - NX - 46;
  const tops = boxes.map((b) => py + ((b.y + b.h / 2) / 100) * SH - NH / 2);
  let floor = PT;
  for (let k = 0; k < tops.length; k++) {
    tops[k] = Math.max(tops[k], floor);
    floor = tops[k] + NH + GAP;
  }
  let ceil = PT + PH;
  for (let k = tops.length - 1; k >= 0; k--) {
    tops[k] = Math.min(tops[k], ceil - NH);
    ceil = tops[k] - GAP;
  }
  const at = (k) => a + 0.9 + k * 0.55;
  const frames = boxes
    .map(
      (b, k) => `<div class="gBox" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;${anims(an("popIn", at(k), 0.45))}">
        <span class="gNum">${fa(k + 1)}</span></div>`,
    )
    .join("");
  const notes = labels
    .map(
      (c, k) => `<div class="gNote" style="left:${NX}px;top:${tops[k]}px;width:${NW}px;height:${NH}px;${anims(an("popIn", at(k) + 0.15, 0.45))}">
        <span class="gNum static">${fa(k + 1)}</span><span>${esc(c)}</span></div>`,
    )
    .join("");
  const lines = labels
    .map((_, k) => {
      const b = boxes[k];
      const x1 = NX + NW, y1 = tops[k] + NH / 2;
      const x2 = px + (b.x / 100) * SW, y2 = py + ((b.y + b.h / 2) / 100) * SH;
      const mid = (x1 + x2) / 2;
      const dd = `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
      return `<g style="${anims(an("fadeIn", at(k) + 0.1, 0.4))}"><path d="${dd}" fill="none" stroke="#121319" stroke-opacity=".7" stroke-width="10" stroke-linecap="round"/>
        <path d="${dd}" fill="none" stroke="#e0956f" stroke-width="4" stroke-linecap="round"/><circle cx="${x2}" cy="${y2}" r="7" fill="#efbda0"/></g>`;
    })
    .join("");
  return scene(
    a,
    a + d,
    `<div class="top" style="gap:22px">
      <span class="kicker" style="${anims(an("popIn", a + 0.05, 0.45))}">مرحله ${fa(i + 1)} از ${fa(t.steps.length)}</span>
      <h2 style="font-size:62px">${words(st.title, a + 0.2, 0.07)}</h2></div>
    <div class="phoneWrap" style="top:${PT}px;right:${PR}px;width:${PW}px;height:${PH}px;${anims(an("phoneIn", a, 0.7))}">
      <div class="phone"><div class="screen"><div class="layer"><img src="${shot(st.shot)}">${frames}</div></div></div></div>
    ${notes}
    <svg class="gLines" width="1080" height="1920" viewBox="0 0 1080 1920">${lines}</svg>`,
  );
}

function guideVideos() {
  return GUIDE_PANELS.flatMap((panel) =>
    TUTORIALS.filter((t) => t.role === panel.role).map((t, n) => {
      const steps = t.steps.map((st, i) => ({ i, d: Math.max(3.4, 2.4 + 0.55 * Math.min(4, (SHOT_BOXES[st.shot]?.boxes ?? []).length)) })).filter(({ i }) => t.steps[i].shot && SHOT_BOXES[t.steps[i].shot]);
      const coverEnd = 2.2 + 0.28 * t.steps.length;
      let clock = coverEnd;
      const stepScenes = steps.map(({ i, d }) => {
        const html = guideStep(t, i, clock, d);
        clock += d;
        return html;
      });
      const end = clock;
      const file = `${String(n + 1).padStart(2, "0")}-${t.slug}`;
      return {
        id: `guide-${panel.role}-${file}`,
        file,
        dir: `03-guide-series/${panel.dir}`,
        flat: true,
        format: "story",
        dur: +(end + 3.6).toFixed(1),
        cover: 1.6,
        body: () => [
          scene(
            0,
            coverEnd,
            `<div class="hero" style="gap:26px;justify-content:center">
              <span class="kicker" style="${anims(an("popIn", 0.1, 0.5))}">راهنمای ${esc(panel.label)}</span>
              <h1 style="font-size:78px">${words(t.title, 0.3, 0.07)}</h1>
              <ol class="gList">${t.steps
                .map((st, i) => `<li style="${anims(an("popIn", 0.8 + i * 0.12, 0.4))}"><span>${fa(i + 1)}</span>${esc(st.title)}</li>`)
                .join("")}</ol>
              <p style="font-size:32px;${anims(an("fadeIn", 1.2, 0.5))}">${fa(t.steps.length)} مرحله · حدود ${fa(t.minutes)} دقیقه</p></div>`,
          ),
          ...stepScenes,
          scene(end, null, cta(end, { line: t.summary, button: panel.button, sub: `nobatet.app/tutorials/${t.slug}` })),
        ],
      };
    }),
  );
}


// ── 04-one-minute: ~60 s feed posts (4:5) that tell the whole story (2026-10-31) ──

/** A centred title card at any point of the timeline (like `hook`, but starting at `start`). */
const heroAt = (start, end, { kicker, title, sub, ic }) =>
  scene(
    start,
    end,
    `<div class="hero">${ic ? `<div class="ring" style="width:200px;height:200px;${anims(an("logoPop", start + 0.1, 0.7))}"><div class="disc">${icon(ic)}</div></div>` : ""}
      ${kicker ? `<span class="kicker" style="${anims(an("popIn", start + 0.15, 0.5))}">${esc(kicker)}</span>` : ""}
      <h1>${words(title, start + 0.35)}</h1>
      ${sub ? `<p style="${anims(an("fadeIn", start + 1.2, 0.6))}">${esc(sub)}</p>` : ""}</div>`,
  );

/** postPoints at any start time. */
function pointsAt(t0, step, points) {
  return postPoints(t0, step, points);
}

/**
 * Builds a 1-minute post from a list of parts, one after another:
 * { hero: {...}, d } · { points: [...], step } · { ring: {...}, d } · { cta: {...} }.
 */
function minute(id, parts) {
  return {
    id,
    dir: "04-one-minute",
    format: "post",
    get dur() {
      return this._dur;
    },
    cover: 4,
    _dur: 0,
    body() {
      let t = 0;
      const out = [];
      for (const p of parts) {
        if (p.ring) {
          out.push(ringHook(p.d, p.ring));
          t = p.d;
        } else if (p.hero) {
          out.push(t === 0 ? hook(p.d, p.hero) : heroAt(t, t + p.d, p.hero));
          t += p.d;
        } else if (p.points) {
          const s = pointsAt(t, p.step, p.points);
          out.push(s.html);
          t = s.end;
        } else if (p.cta) {
          out.push(scene(t, null, cta(t, p.cta)));
          t += p.cta.contact ? 6 : 5;
        }
      }
      this._dur = +t.toFixed(1);
      return out;
    },
  };
}

function oneMinuteVideos() {
  const vids = [
    minute("post-60-salon-owners", [
      { ring: { title: "هنوز نوبت‌ها را *تلفنی* می‌گیرید؟" }, d: 3.6 },
      { hero: { kicker: "نوبتت", title: "سالن‌تان را *آنلاین* کنید", sub: "مشتری‌ها ۲۴ ساعته خودشان نوبت می‌گیرند؛ شما فقط تقویم را مدیریت می‌کنید" }, d: 3.6 },
      {
        step: 3.7,
        points: [
          { id: "owner-share-1", ic: "link", title: "صفحه رزرو، لینک و QR", text: "لینک اختصاصی برای بیو اینستاگرام و پوستر آماده استوری و چاپ." },
          { id: "customer-book-4", ic: "calendar", title: "رزرو آنلاین ۲۴ ساعته", text: "مشتری فقط ساعت‌های خالی هر آرایشگر را می‌بیند؛ بدون تداخل." },
          { id: "owner-prepaid-2", ic: "wallet", title: "پیش‌پرداخت ۲۵٪", text: "از کیف پول مشتری؛ نوبت‌های بی‌خبر کم می‌شوند." },
          { id: "customer-bookings-1", ic: "sms", title: "پیامک یادآوری خودکار", text: "تایید و یادآوری برای مشتری و آرایشگر، بدون کار اضافه." },
          { id: "stylist-home-1", ic: "users", title: "پنل هر آرایشگر", text: "برنامه، ساعت کاری، مرخصی و درآمد هر نفر در اپ خودش." },
          { id: "owner-accounting-1", ic: "chart", title: "حسابداری سالن", text: "درآمد، سهم آرایشگرها، هزینه‌ها و سود خالص ماه شمسی." },
          { id: "owner-insights-1", ic: "search", title: "آمار بازدید", text: "چند نفر صفحه شما را دیدند، از کجا آمدند و چند نفر نوبت گرفتند." },
          { id: "owner-reviews-1", ic: "star", title: "نظرات و نمونه کار", text: "نظر مشتری‌های واقعی و گالری کارهای سالن در صفحه رزرو." },
        ],
      },
      { hero: { kicker: "شروع در چند دقیقه", title: "*سه قدم* تا اولین نوبت آنلاین" }, d: 3.6 },
      {
        step: 3.9,
        points: [
          { id: "owner-register-1", title: "ثبت‌نام کنید", text: "نام سالن، شهر و محل روی نقشه؛ چند دقیقه بیشتر طول نمی‌کشد." },
          { id: "owner-services-2", title: "خدمات و آرایشگرها", text: "قیمت و مدت هر خدمت، آرایشگرها و ساعت کاری هر نفر." },
          { id: "owner-share-2", title: "لینک را منتشر کنید", text: "در بیو اینستاگرام بگذارید یا پوستر QR را روی میز پذیرش." },
        ],
      },
      { hero: { kicker: "پیشنهاد ویژه", title: "*یک ماه رایگان* با همه امکانات", sub: "بدون کارت بانکی؛ هر وقت خواستید پلن بخرید", ic: "star" }, d: 3.6 },
      { cta: { line: "سؤالی دارید؟ در اینستاگرام پیام بدهید یا تماس بگیرید", button: "شروع رایگان", contact: true } },
    ]),
    minute("post-60-independent-stylists", [
      { hero: { title: "آرایشگر *مستقل* هستید؟", sub: "با نام خودتان کار می‌کنید؛ در سالن، استودیو یا منزل مشتری", ic: "scissors" }, d: 4.0 },
      { hero: { kicker: "نوبتت", title: "یک *صفحه رزرو* با نام خودتان", sub: "مشتری‌ها مستقیم از تقویم شما نوبت می‌گیرند" }, d: 4.0 },
      {
        step: 4.5,
        points: [
          { id: "indie-page-1", ic: "link", title: "صفحه رزرو شما", text: "نام کاری، نمونه کارها، امتیاز و نشان «آرایشگر مستقل»." },
          { id: "indie-page-2", ic: "pin", title: "در سالن یا در منزل", text: "محل‌های کارتان و محدوده خدمات در منزل؛ مشتری هنگام رزرو انتخاب می‌کند." },
          { id: "indie-services-1", ic: "scissors", title: "خدمات و قیمت‌ها", text: "قیمت و مدت هر خدمت را خودتان تعیین کنید." },
          { id: "indie-schedule-1", ic: "clock", title: "ساعت کاری و مرخصی", text: "فقط ساعت‌هایی که کار می‌کنید رزرو می‌شوند." },
          { id: "indie-wallet-1", ic: "wallet", title: "پیش‌پرداخت به کیف پول شما", text: "۲۵٪ مبلغ هنگام رزرو؛ کمتر شدن مشتری‌هایی که نمی‌آیند." },
          { id: "indie-accounting-1", ic: "chart", title: "درآمد و سود خالص", text: "درآمد، هزینه‌ها و سود ماه، بدون دفتر و ماشین‌حساب." },
          { id: "indie-search-1", ic: "search", title: "پیدا شدن در جستجو", text: "مشتری‌ها با فیلتر «آرایشگران مستقل» شما را پیدا می‌کنند." },
        ],
      },
      { hero: { kicker: "کیت معرفی", title: "لینک، QR و *پوستر آماده*", sub: "برای بیو، استوری و پست اینستاگرام" }, d: 4.0 },
      { step: 4.4, points: [{ id: "indie-share-1", ic: "link", title: "پوستر با نام شما", text: "پوستر استوری و پست با خدمات و کد QR شما، با یک لمس." }] },
      { hero: { kicker: "پیشنهاد ویژه", title: "*یک ماه رایگان* امتحان کنید", sub: "پلن «آرایشگر مستقل»؛ بدون کارت بانکی", ic: "star" }, d: 4.0 },
      { cta: { line: "نوبت‌دهی آنلاین برای آرایشگرهای مستقل", button: "ثبت‌نام رایگان", contact: true } },
    ]),
    minute("post-60-customers", [
      { hero: { kicker: "نوبت آرایشگاه", title: "دیگر *تماس نگیرید*، منتظر نمانید", sub: "خط اشغال، جواب ندادن، «فردا زنگ بزنید»…", ic: "phone" }, d: 4.2 },
      { hero: { kicker: "نوبتت", title: "نوبت آرایشگاه، *آنلاین* و هر ساعت", sub: "سالن، خدمت، آرایشگر و ساعت دلخواه را خودتان انتخاب کنید" }, d: 4.2 },
      {
        step: 4.4,
        points: [
          { id: "customer-search-2", ic: "pin", title: "سالن نزدیک شما", text: "سالن‌ها و آرایشگرهای مستقل اطراف، با امتیاز و قیمت." },
          { id: "customer-book-2", title: "خدمت را بزنید", text: "مدت و قیمت هر خدمت از اول معلوم است.", tap: [50, 96] },
          { id: "customer-book-3", title: "آرایشگر دلخواه", text: "یا «فرقی نمی‌کند» تا همه ساعت‌های خالی را ببینید.", tap: [50, 78] },
          { id: "customer-book-4", title: "ساعت خالی را بزنید", text: "فقط ساعت‌هایی که واقعاً آزادند.", tap: [85, 61] },
          { id: "customer-book-9", ic: "check", title: "تمام!", text: "پیامک تایید و یادآوری برایتان می‌آید." },
        ],
      },
      { hero: { kicker: "خیالتان راحت", title: "پیش‌پرداخت *امن*", sub: "۲۵٪ از کیف پول؛ اگر سالن لغو کند یا تایید نکند، کامل برمی‌گردد", ic: "shield" }, d: 4.2 },
      {
        step: 4.4,
        points: [
          { id: "customer-wallet-1", ic: "wallet", title: "کیف پول", text: "یک بار شارژ کنید؛ پیش‌پرداخت‌ها و برگشت پول همین‌جاست." },
          { id: "customer-bookings-1", ic: "bell", title: "نوبت‌های من", text: "وضعیت هر نوبت، یادآوری پیامکی و لغو در صورت نیاز." },
          { id: "customer-bookings-2", ic: "repeat", title: "رزرو دوباره", text: "همان خدمت، همان آرایشگر؛ با یک لمس." },
          { id: "customer-review-2", ic: "star", title: "نظر بدهید", text: "به سالن و آرایشگر امتیاز بدهید؛ فقط مشتری‌های واقعی." },
        ],
      },
      { cta: { line: "آرایشگاه و سالن زیبایی نزدیک خودتان را پیدا کنید و آنلاین نوبت بگیرید", button: "رزرو نوبت" } },
    ]),
    minute("post-60-platform-overview", [
      { hero: { kicker: "نوبتت", title: "*یک اپ* برای همه دنیای زیبایی", sub: "سالن، آرایشگر، آرایشگر مستقل و مشتری؛ فارسی و با تقویم شمسی" }, d: 4.2 },
      {
        step: 5.2,
        points: [
          { id: "owner-home-1", ic: "users", title: "صاحب سالن", text: "نوبت‌ها، آرایشگرها، پیش‌پرداخت، حسابداری و آمار بازدید در یک پنل." },
          { id: "stylist-home-1", ic: "scissors", title: "آرایشگر سالن", text: "برنامه امروز، ساعت کاری، مرخصی، درآمد و کیف پول خودش." },
          { id: "indie-page-1", ic: "link", title: "آرایشگر مستقل", text: "صفحه رزرو با نام خودش؛ در سالن یا در منزل مشتری." },
          { id: "customer-book-4", ic: "calendar", title: "مشتری", text: "پیدا کردن سالن نزدیک و رزرو آنلاین در چند لمس." },
        ],
      },
      { hero: { kicker: "چرا نوبتت؟", title: "کمتر *تماس*، کمتر *غیبت*، بیشتر *نوبت*" }, d: 4.2 },
      {
        step: 5.0,
        points: [
          { id: "customer-bookings-1", ic: "sms", title: "پیامک یادآوری", text: "مشتری فراموش نمی‌کند؛ صندلی خالی نمی‌ماند." },
          { id: "owner-prepaid-2", ic: "wallet", title: "پیش‌پرداخت آنلاین", text: "۲۵٪ از کیف پول، با قوانین روشن برگشت پول." },
          { id: "owner-share-1", ic: "link", title: "لینک و پوستر QR", text: "از اینستاگرام مستقیم به صفحه رزرو." },
          { id: "owner-insights-1", ic: "chart", title: "آمار و حسابداری", text: "بدانید مشتری از کجا می‌آید و سود ماه چقدر است." },
        ],
      },
      { hero: { kicker: "پیشنهاد ویژه", title: "*یک ماه رایگان* برای سالن‌ها و آرایشگرها", ic: "star" }, d: 4.2 },
      { cta: { line: "سؤالی دارید؟ در اینستاگرام پیام بدهید یا تماس بگیرید", button: "شروع رایگان", contact: true } },
    ]),
  ];
  for (const v of vids) v.body(); // fixes each one's length
  return vids;
}

const VIDEOS = [
  // ── Stories (9:16) ──
  {
    id: "story-01-salon-online-booking",
    format: "story",
    dur: 16.5,
    cover: 9.5,
    body: () => [
      ringHook(3.6, { title: "هنوز نوبت‌ها را *تلفنی* می‌گیرید؟" }),
      scene(
        3.6,
        8,
        `<div class="top"><span class="kicker" style="${anims(an("popIn", 3.7, 0.5))}">۲۴ ساعته، بدون تماس</span>
          <h2>${words("با *نوبتت* مشتری‌ها خودشان آنلاین نوبت می‌گیرند", 3.85, 0.08)}</h2></div>
        ${phone({ height: 1020, y: 610, enter: 4.2, exit: 8, screens: [{ id: "customer-book-4", at: 4.2, tap: [88, 61] }, { id: "customer-book-9", at: 6.4 }] })}`,
      ),
      scene(
        8,
        12.6,
        `<div class="side"><h2>${words("شما فقط *تقویم* را مدیریت می‌کنید", 8.1, 0.08)}</h2>
          ${featureList(
            [
              ["sms", "پیامک یادآوری خودکار"],
              ["card", "بیعانه با درگاه داخلی"],
              ["calendar", "تقویم شمسی"],
              ["shield", "بدون تداخل نوبت"],
              ["users", "پنل جدا برای هر آرایشگر"],
            ],
            8.7,
            0.4,
          )}</div>
        ${phone({ height: 920, y: 470, x: "45px", anchor: "right", enter: 8.2, exit: 12.6, screens: [{ id: "owner-home-1", at: 8.2 }, { id: "owner-manage-1", at: 10.4 }] })}`,
      ),
      scene(12.6, null, cta(12.6, { line: "نرم‌افزار نوبت‌دهی آنلاین آرایشگاه و سالن زیبایی", button: "شروع رایگان" })),
    ],
  },
  {
    id: "story-02-customer-booking",
    format: "story",
    dur: 17,
    cover: 5,
    body: () => {
      const steps = [
        { id: "customer-search-1", text: "سالن نزدیک خودتان را پیدا کنید", tap: [55, 62] },
        { id: "customer-book-2", text: "خدمت را انتخاب کنید", tap: [50, 95] },
        { id: "customer-book-3", text: "آرایشگر دلخواه را بزنید", tap: [50, 78] },
        { id: "customer-book-4", text: "روز و ساعت خالی را بزنید", tap: [88, 61] },
        { id: "customer-book-9", text: "تمام! نوبتتان ثبت شد" },
      ];
      const t0 = 3.2, step = 2.1, end = t0 + steps.length * step + 0.4;
      return [
        scene(
          0,
          t0,
          `<div class="hero"><span class="kicker" style="${anims(an("popIn", 0.1, 0.5))}">نوبت آرایشگاه</span>
            <h1>${words("بدون *تماس* و بدون *انتظار*", 0.35)}</h1>
            <p style="${anims(an("fadeIn", 1.4, 0.6))}">خدمت، آرایشگر و ساعت دلخواه را خودتان انتخاب کنید؛ هر ساعت از شبانه‌روز</p></div>`,
        ),
        scene(
          t0,
          end,
          `<div class="top" style="height:240px">${steps
            .map((s, i) => {
              const a = t0 + i * step;
              const out = i < steps.length - 1 ? an("fadeOut", a + step - 0.25, 0.25, { fill: "forwards" }) : null;
              return `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;gap:18px;${anims(an("popIn", a + 0.05, 0.5), out)}">
                <span class="stepNum">${fa(i + 1)}</span><h2>${esc(s.text)}</h2></div>`;
            })
            .join("")}</div>
          ${phone({ height: 1040, y: 540, enter: t0, exit: end, screens: steps.map((s, i) => ({ id: s.id, at: t0 + i * step, tap: s.tap })) })}`,
        ),
        scene(end, null, cta(end, { line: "سالن زیبایی نزدیک خودتان را پیدا کنید و آنلاین نوبت بگیرید", button: "رزرو نوبت" })),
      ];
    },
  },
  {
    id: "story-03-independent-stylist",
    format: "story",
    dur: 16.5,
    cover: 5.5,
    body: () => [
      scene(
        0,
        3.2,
        `<div class="hero"><div class="ring" style="width:240px;height:240px;${anims(an("logoPop", 0.1, 0.8))}"><div class="disc">${icon("scissors")}</div></div>
          <h1>${words("آرایشگر *مستقل* هستید؟", 0.4)}</h1>
          <p style="${anims(an("fadeIn", 1.3, 0.6))}">با نام خودتان کار می‌کنید، در سالن یا در منزل</p></div>`,
      ),
      scene(
        3.2,
        7.8,
        `<div class="top"><h2>${words("یک *صفحه رزرو* با نام خودتان", 3.3, 0.08)}</h2>
          <div class="chip" style="${anims(an("popIn", 4.2, 0.5))}">${icon("link")}لینکش را در بیو اینستاگرام بگذارید</div></div>
        ${phone({ height: 1000, y: 600, enter: 3.6, exit: 7.8, screens: [{ id: "indie-page-1", at: 3.6 }] })}`,
      ),
      scene(
        7.8,
        12.8,
        `<div class="side"><h2>${words("همه‌چیز در *یک اپ*", 7.9, 0.08)}</h2>
          ${featureList(
            [
              ["scissors", "خدمات و قیمت‌ها"],
              ["clock", "ساعت کاری و مرخصی"],
              ["sms", "پیامک یادآوری خودکار"],
              ["star", "نظرات مشتری‌ها"],
              ["chart", "درآمد و سود خالص"],
            ],
            8.4,
            0.4,
          )}</div>
        ${phone({ height: 920, y: 470, x: "45px", anchor: "right", enter: 8, exit: 12.8, screens: [{ id: "indie-schedule-1", at: 8 }, { id: "indie-accounting-1", at: 10.4 }] })}`,
      ),
      scene(12.8, null, cta(12.8, { line: "نوبت‌دهی آنلاین برای آرایشگرهای مستقل", button: "ثبت‌نام رایگان" })),
    ],
  },

  // ── Feed posts (4:5) ──
  {
    id: "post-01-salon-features",
    format: "post",
    dur: 19,
    cover: 5.2,
    body: () => {
      const feats = [
        { id: "owner-manage-1", ic: "calendar", title: "تقویم نوبت‌دهی", text: "نمای روزانه و هفتگی برای هر آرایشگر، با جابه‌جایی و لغو نوبت در چند ثانیه." },
        { id: "customer-book-7", ic: "sms", title: "یادآوری پیامکی", text: "پیامک تأیید و یادآوری خودکار قبل از نوبت، برای کم‌کردن غیبت مشتری." },
        { id: "stylist-home-1", ic: "users", title: "پنل آرایشگر", text: "هر آرایشگر نوبت‌ها، ساعت کاری و مرخصی‌هایش را در اپ خودش می‌بیند." },
        { id: "owner-home-1", ic: "link", title: "لینک و QR اختصاصی", text: "صفحه رزرو سالن شما برای بیو اینستاگرام، واتساپ یا کارت ویزیت." },
        { id: "owner-accounting-1", ic: "chart", title: "حسابداری و گزارش", text: "درآمد، سهم آرایشگرها و سود خالص سالن به تفکیک ماه شمسی." },
      ];
      const t0 = 3.4, step = 2.5, end = t0 + feats.length * step + 0.3;
      return [
        ringHook(t0, { title: "مدیریت نوبت سالن، *بدون تلفن و دفتر*" }),
        scene(
          t0,
          end,
          `${brand(t0)}<div class="side" style="top:200px"><div class="swap" style="height:520px">${feats
            .map((f, i) => {
              const a = t0 + i * step;
              const out = i < feats.length - 1 ? an("fadeOut", a + step - 0.3, 0.3, { fill: "forwards" }) : null;
              return `<div style="${anims(an("fadeIn", a, 0.01), out)}">
                <span class="feats"><span class="ic" style="width:96px;height:96px;border-radius:26px;${anims(an("popIn", a + 0.05, 0.5))}">${icon(f.ic)}</span></span>
                <h2>${words(f.title, a + 0.15, 0.08)}</h2>
                <p style="${anims(an("fadeIn", a + 0.5, 0.5))}">${esc(f.text)}</p></div>`;
            })
            .join("")}</div>
            <div class="dots">${feats.map((_, i) => `<i style="${anims(an("dotOn", t0 + i * step, 0.3, { fill: "both" }), i < feats.length - 1 && an("dotOff", t0 + (i + 1) * step, 0.3, { fill: "forwards" }))}"></i>`).join("")}</div></div>
          ${phone({ height: 1000, y: 190, x: "50px", anchor: "right", enter: t0, exit: end, screens: feats.map((f, i) => ({ id: f.id, at: t0 + i * step })) })}`,
        ),
        scene(end, null, cta(end, { line: "هرچه یک سالن برای مدیریت نوبت لازم دارد؛ کاملاً فارسی و با تقویم شمسی", button: "شروع رایگان" })),
      ];
    },
  },
  {
    id: "post-02-how-it-works",
    format: "post",
    dur: 16.5,
    cover: 4,
    body: () => {
      const steps = [
        { id: "owner-services-2", title: "سالن را تعریف کنید", text: "خدمات، قیمت و مدت هر خدمت، آرایشگرها و ساعت کاری هر نفر." },
        { id: "owner-home-1", title: "لینک رزرو را منتشر کنید", text: "در بیو اینستاگرام بگذارید یا QR آن را روی میز پذیرش چاپ کنید." },
        { id: "owner-manage-1", title: "نوبت‌ها خودکار ثبت می‌شوند", text: "مشتری فقط ساعت‌های خالی را می‌بیند و پیامک یادآوری خودکار می‌رود." },
      ];
      const t0 = 2.8, step = 3.2, end = t0 + steps.length * step + 0.3;
      return [
        scene(
          0,
          t0,
          `<div class="hero"><span class="kicker" style="${anims(an("popIn", 0.1, 0.5))}">نوبت‌دهی آنلاین سالن</span>
            <h1>${words("*سه قدم* تا اولین نوبت آنلاین", 0.35)}</h1></div>`,
        ),
        scene(
          t0,
          end,
          `${brand(t0)}<div class="side" style="top:200px"><div class="swap" style="height:560px">${steps
            .map((s, i) => {
              const a = t0 + i * step;
              const out = i < steps.length - 1 ? an("fadeOut", a + step - 0.3, 0.3, { fill: "forwards" }) : null;
              return `<div style="${anims(an("fadeIn", a, 0.01), out)}">
                <span class="stepNum" style="width:110px;height:110px;font-size:60px;${anims(an("logoPop", a + 0.05, 0.6))}">${fa(i + 1)}</span>
                <h2>${words(s.title, a + 0.2, 0.08)}</h2>
                <p style="${anims(an("fadeIn", a + 0.6, 0.5))}">${esc(s.text)}</p></div>`;
            })
            .join("")}</div></div>
          ${phone({ height: 1000, y: 190, x: "50px", anchor: "right", enter: t0, exit: end, screens: steps.map((s, i) => ({ id: s.id, at: t0 + i * step })) })}`,
        ),
        scene(end, null, cta(end, { line: "چند دقیقه دیگر لینک رزرو اختصاصی سالن شما آماده است", button: "شروع رایگان" })),
      ];
    },
  },
  {
    id: "post-03-customer-booking",
    format: "post",
    dur: 16,
    cover: 4.5,
    body: () => {
      const steps = [
        { id: "customer-search-1", text: "سالن نزدیک خودتان را پیدا کنید", tap: [55, 62] },
        { id: "customer-book-2", text: "خدمت را انتخاب کنید", tap: [50, 95] },
        { id: "customer-book-3", text: "آرایشگر دلخواه را بزنید", tap: [50, 78] },
        { id: "customer-book-4", text: "روز و ساعت خالی را بزنید", tap: [88, 61] },
        { id: "customer-book-9", text: "تمام! نوبتتان ثبت شد" },
      ];
      const t0 = 2.8, step = 2.1, end = t0 + steps.length * step + 0.4;
      return [
        scene(
          0,
          t0,
          `<div class="hero"><span class="kicker" style="${anims(an("popIn", 0.1, 0.5))}">نوبت آرایشگاه</span>
            <h1>${words("بدون *تماس* و بدون *انتظار*", 0.35)}</h1></div>`,
        ),
        scene(
          t0,
          end,
          `${brand(t0)}<div class="side" style="top:200px"><div class="swap" style="height:360px">${steps
            .map((s, i) => {
              const a = t0 + i * step;
              const out = i < steps.length - 1 ? an("fadeOut", a + step - 0.25, 0.25, { fill: "forwards" }) : null;
              return `<div style="${anims(an("popIn", a + 0.05, 0.5), out)}"><span class="stepNum">${fa(i + 1)}</span><h2>${esc(s.text)}</h2></div>`;
            })
            .join("")}</div></div>
          ${phone({ height: 1000, y: 190, x: "50px", anchor: "right", enter: t0, exit: end, screens: steps.map((s, i) => ({ id: s.id, at: t0 + i * step, tap: s.tap })) })}`,
        ),
        scene(end, null, cta(end, { line: "آرایشگاه و سالن زیبایی نزدیک خودتان را پیدا کنید و آنلاین نوبت بگیرید", button: "رزرو نوبت" })),
      ];
    },
  },

  ...generalVideos(),

  // ── 02-for-customers: people trying their first online booking (2026-10-31) ──
  ...customerVideos(),

  // ── 03-guide-series: every Help Center guide ──
  ...guideVideos(),

  // ── 04-one-minute: whole-story feed posts ──
  ...oneMinuteVideos(),
];

const EXTRA_STYLE = `
.gBox { position: absolute; border: 5px solid #e0956f; border-radius: 16px; box-shadow: 0 0 0 5px rgb(239 189 160 / .45), 0 6px 18px rgb(156 94 75 / .45); }
.gNum { position: absolute; right: -20px; top: -20px; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(115deg, #efbda0, #c68a72 55%, #9c5e4b); color: #121319; font-weight: 900; font-size: 24px; display: flex; align-items: center; justify-content: center; border: 3px solid #f5ede8; }
.gNum.static { position: static; flex: none; width: 52px; height: 52px; font-size: 26px; border: none; }
.gNote { position: absolute; z-index: 4; display: flex; align-items: center; gap: 16px; background: #1e2229; border: 3px solid #c68a72; border-radius: 26px; padding: 10px 18px; font-size: 28px; font-weight: 800; line-height: 1.4; box-shadow: 0 14px 30px -12px rgb(0 0 0 / .7); }
.gLines { position: absolute; inset: 0; z-index: 3; overflow: visible; pointer-events: none; }
.gList { list-style: none; display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 860px; text-align: right; }
.gList li { display: flex; align-items: center; gap: 18px; font-size: 32px; font-weight: 800; background: #1e2229; border: 2px solid #2f3540; border-radius: 22px; padding: 12px 20px; }
.gList li span { flex: none; width: 46px; height: 46px; border-radius: 50%; background: #35292a; color: #efbda0; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 6px; }
.contact span { display: inline-flex; align-items: center; gap: 14px; font-size: calc(var(--p) * .95); font-weight: 800; background: #1e2229; border: 2px solid rgb(198 138 114 / .5); padding: 14px 28px; border-radius: 999px; }
.contact svg { width: 38px; height: 38px; color: #efbda0; }
.contact b { font-weight: 900; letter-spacing: .5px; }
.stepNum svg { width: 46px; height: 46px; }
.dots { display: flex; gap: 12px; margin-top: 10px; }
.dots i { display: block; height: 12px; width: 12px; border-radius: 999px; background: #2f3540; }
@keyframes dotOn { from { width: 12px; background: #2f3540 } to { width: 44px; background: #c68a72 } }
@keyframes dotOff { from { width: 44px; background: #c68a72 } to { width: 12px; background: #2f3540 } }
`;

function html(video) {
  const f = FORMATS[video.format];
  return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>${style(f.W, f.H)}${EXTRA_STYLE}</style></head>
<body style="${f.vars}">${background(f.W, f.H)}${video.body().join("")}</body></html>`;
}

// ── render ────────────────────────────────────────────────────────────────────────────────────

const browser = await chromium.launch({ executablePath: chromiumPath() });
try {
  for (const video of VIDEOS.filter((v) => v.id.includes(ONLY))) {
    const { W, H } = FORMATS[video.format];
    const dir = path.join(OUT, video.dir ?? SERIES, video.flat ? "" : video.format);
    mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(html(video), { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
    });
    const seek = (t) =>
      page.evaluate((ms) => {
        for (const a of document.getAnimations()) {
          a.pause();
          a.currentTime = ms;
        }
      }, t * 1000);

    if (STILLS) {
      const pdir = path.join(OUT, video.dir ?? SERIES, "_preview");
      mkdirSync(pdir, { recursive: true });
      for (let t = 0.5; t < video.dur; t += 1) {
        await seek(t);
        await page.screenshot({ path: path.join(pdir, `${video.id}_${String(t * 10).padStart(3, "0")}.jpg`), type: "jpeg", quality: 80 });
      }
      await page.close();
      continue;
    }

    const file = path.join(dir, `${video.file ?? video.id}.mp4`);
    const ff = spawn(
      "ffmpeg",
      ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
        "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-map", "0:v", "-map", "1:a", "-shortest",
        "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", file],
      { stdio: ["pipe", "inherit", "inherit"] },
    );
    const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));

    const frames = Math.round(video.dur * FPS);
    for (let i = 0; i < frames; i++) {
      await seek(i / FPS);
      const jpg = await page.screenshot({ type: "jpeg", quality: 95 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await done;

    await seek(video.cover);
    await page.screenshot({ path: path.join(dir, `${video.file ?? video.id}.jpg`), type: "jpeg", quality: 92 });
    await page.close();
    console.log(`${path.relative(ROOT, file)}  (${video.dur} s, ${W}×${H})`);
  }
} finally {
  await browser.close();
}
