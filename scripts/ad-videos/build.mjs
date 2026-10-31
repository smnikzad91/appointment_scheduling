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
const OUT = path.join(ROOT, "ad-videos/01-platform-intro");
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
const cta = (start, { line, button, sub = "nobatet.app" }) => `
  <div class="cta">
    <div class="ctaLogo" style="${anims(an("logoPop", start + 0.1, 0.8))}"><img src="data:image/png;base64,${ICON}"></div>
    <div class="ctaName" style="${anims(an("wordIn", start + 0.45, 0.6))}">نوبتت</div>
    <p class="ctaLine">${words(line, start + 0.7, 0.07)}</p>
    <div style="${anims(an("popIn", start + 1.3, 0.6))}"><div class="btn" style="${anims(an("pulse", start + 1.9, 1.2, { ease: "ease-in-out", iter: "infinite", fill: "none" }))}">${esc(button)}<span class="arrow">${icon("arrow")}</span></div></div>
    <div class="url" style="${anims(an("fadeIn", start + 1.8, 0.6))}">${esc(sub)}</div>
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
];

const EXTRA_STYLE = `
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
    const dir = path.join(OUT, video.format);
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
      const pdir = path.join(OUT, "_preview");
      mkdirSync(pdir, { recursive: true });
      for (let t = 0.5; t < video.dur; t += 1) {
        await seek(t);
        await page.screenshot({ path: path.join(pdir, `${video.id}_${String(t * 10).padStart(3, "0")}.jpg`), type: "jpeg", quality: 80 });
      }
      await page.close();
      continue;
    }

    const file = path.join(dir, `${video.id}.mp4`);
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
    await page.screenshot({ path: path.join(dir, `${video.id}.jpg`), type: "jpeg", quality: 92 });
    await page.close();
    console.log(`${path.relative(ROOT, file)}  (${video.dur} s, ${W}×${H})`);
  }
} finally {
  await browser.close();
}
