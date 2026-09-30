// Instagram Story Highlights from the Help Center guides: every guide becomes a cover slide plus
// one slide per step — the step's screenshot in a phone frame with the same highlight frames as
// /tutorials, and each frame's caption beside it, joined by a leader line. 1080×1920 (9:16) JPGs,
// with the text kept inside the area Instagram's own UI doesn't cover (~250 px top and bottom).
//
//   node scripts/story-highlights/build.mjs            # all panels
//   node scripts/story-highlights/build.mjs register   # preview: guides whose slug contains "register",
//                                                       # written to story-highlights/_preview/
//
// Reads apps/web/src/content/tutorials.ts (titles, text, callouts), tutorialShots.json (frame
// positions) and apps/web/public/tutorials/*.webp — re-run after scripts/tutorials/capture.mjs.
// Writes story-highlights/<panel>/NN_<english_slug>.png (01_register_salon_intro.png,
// 02_your_details.png, …), numbered in publishing order; each run replaces a panel folder's PNGs. Needs Playwright's Chromium (CHROMIUM_PATH to override).

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = path.join(ROOT, "apps/web");
const OUT = path.join(ROOT, "story-highlights");
const ONLY = process.argv[2] ?? "";

const { TUTORIALS, TUTORIAL_ROLES } = await import(path.join(WEB, "src/content/tutorials.ts"));
const SHOTS = JSON.parse(readFileSync(path.join(WEB, "src/content/tutorialShots.json"), "utf8"));
const FONT = readFileSync(path.join(WEB, "public/fonts/Vazirmatn-Variable.woff2")).toString("base64");
const ICON = readFileSync(path.join(WEB, "public/icons/icon-192x192.png")).toString("base64");

/** Panel folders, in the order the highlights are meant to appear. */
const PANELS = [
  { role: "owner", dir: "01-salon-panel", label: "پنل سالن" },
  { role: "stylist", dir: "02-stylist-panel", label: "پنل آرایشگر" },
  { role: "independent", dir: "02-independent-stylist-panel", label: "پنل آرایشگر مستقل" },
  { role: "customer", dir: "03-customer-panel", label: "پنل مشتری" },
];

/**
 * English filename slug per step (by screenshot id), so a phone's file list reads in order and
 * says what each slide is. A guide's cover is "<guide>_intro". A step missing here falls back to
 * "<guide>_step<n>" — add it when adding a guide.
 */
const STEP_SLUGS = {
  "owner-register-1": "your_details",
  "owner-register-2": "salon_name_and_province",
  "owner-register-3": "choose_province_and_city",
  "owner-register-4": "add_salon_location",
  "owner-register-5": "finish_signup",
  "owner-home-1": "salon_panel_tour",
  "owner-settings-1": "cover_photo_and_logo",
  "owner-settings-2": "brand_color",
  "owner-stylists-1": "invite_stylist",
  "owner-stylists-2": "stylist_details_and_share",
  "owner-stylists-3": "send_activation_link",
  "owner-services-1": "add_service",
  "owner-services-2": "service_price_and_duration",
  "owner-services-3": "create_category",
  "owner-booking-1": "new_booking",
  "owner-booking-2": "customer_and_stylist",
  "owner-booking-3": "service_and_day",
  "owner-booking-4": "pick_time",
  "owner-manage-1": "pending_bookings",
  "owner-manage-2": "change_status_or_edit",
  "owner-manage-3": "month_calendar",
  "owner-manage-4": "week_view",
  "owner-reviews-1": "approve_reviews",
  "owner-gallery-1": "add_portfolio_photo",
  "owner-gallery-2": "photo_stylist_and_delete",
  "owner-accounting-1": "month_summary",
  "owner-accounting-2": "stylist_balances",
  "owner-accounting-3": "record_stylist_payment",
  "owner-accounting-4": "income_list",
  "owner-accounting-5": "adjust_amount_and_tip",
  "owner-accounting-6": "salon_expenses",
  "owner-accounting-7": "monthly_report",
  "stylist-activate-1": "open_link_set_password",
  "stylist-home-1": "today_page",
  "stylist-appointments-1": "bookings_list",
  "stylist-appointments-2": "booking_details_and_status",
  "stylist-book-1": "new_booking_for_yourself",
  "stylist-book-2": "customer_services_and_time",
  "stylist-reviews-1": "your_reviews",
  "stylist-earnings-1": "month_share_and_balance",
  "stylist-earnings-2": "completed_bookings",
  "stylist-earnings-3": "salon_payments",
  "stylist-expenses-2": "add_expense",
  "stylist-expenses-1": "attach_receipt",
  "stylist-expenses-3": "expense_list_and_search",
  "stylist-expenses-4": "net_income",
  "stylist-schedule-1": "working_days",
  "stylist-schedule-2": "pick_hours",
  "stylist-schedule-3": "add_time_off",
  "stylist-schedule-4": "time_off_days",
  "stylist-services-1": "your_prices_and_durations",
  "stylist-profile-1": "about_you",
  "stylist-profile-2": "portfolio",
  "customer-search-1": "search_and_city_filter",
  "customer-search-2": "nearest_salons",
  "customer-search-3": "map_view",
  "customer-book-1": "start_booking",
  "customer-book-2": "choose_service",
  "customer-book-3": "choose_stylist",
  "customer-book-4": "day_and_time",
  "customer-book-5": "contact_details",
  "customer-book-6": "verification_code",
  "customer-book-7": "confirm_booking",
  "customer-book-8": "booking_done",
  "customer-bookings-1": "upcoming_bookings",
  "customer-bookings-2": "past_bookings",
  "customer-signup-1": "account_details",
  "customer-signup-2": "accept_terms_and_sign_up",
  "customer-signin-1": "sign_in_next_time",
  "customer-review-1": "review_a_visit",
  "customer-review-2": "rating_and_comment",
  "customer-saved-1": "save_favorite_salon",
  "customer-saved-2": "favorites_on_home",
  "customer-waitlist-1": "waitlist_for_full_days",
  "customer-wallet-1": "wallet_card_and_top_up",
  "customer-support-1": "support_ticket",
  "customer-support-2": "write_request",
  "customer-profile-1": "profile_and_password",
  "indie-register-1": "choose_independent_stylist",
  "indie-register-2": "business_name_and_workplace",
  "indie-register-3": "province_city_address_map",
  "indie-home-1": "panel_and_approval",
  "indie-services-1": "services_and_prices",
  "indie-schedule-1": "hours_and_days_off",
  "indie-settings-1": "workplace",
  "indie-appointments-1": "bookings_list",
  "indie-appointments-2": "booking_details_and_place",
  "indie-book-1": "book_with_place",
  "indie-reviews-1": "customer_reviews",
  "indie-accounting-1": "month_summary",
  "indie-accounting-2": "add_expenses",
  "indie-page-1": "your_booking_page",
  "indie-page-2": "workplace_on_page",
  "indie-search-1": "found_in_search",
};

const fa = (v) => String(v).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(chromium.executablePath())) return chromium.executablePath();
  // Playwright may expect a newer build than the one installed; any installed Chromium will do.
  const cache = path.join(homedir(), ".cache/ms-playwright");
  const builds = existsSync(cache) ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse() : [];
  for (const b of builds) {
    const p = path.join(cache, b, "chrome-linux64/chrome");
    if (existsSync(p)) return p;
  }
  throw new Error("No Chromium found — install one (npx playwright install chromium) or set CHROMIUM_PATH");
}

const STYLE = `
@font-face { font-family: Vazirmatn; src: url(data:font/woff2;base64,${FONT}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1920px; }
body {
  font-family: Vazirmatn, sans-serif; direction: rtl; color: #2a1d26; overflow: hidden; position: relative;
  background: radial-gradient(900px 700px at 100% 0%, #f4e1d4 0%, transparent 70%),
              radial-gradient(800px 600px at 0% 100%, #efe0cf 0%, transparent 70%), #f6efe6;
}
.top { position: absolute; top: 90px; left: 60px; right: 60px; display: flex; justify-content: space-between; align-items: center; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 900; font-size: 38px; color: #86391f; }
.brand img { width: 60px; height: 60px; border-radius: 16px; display: block; }
.chip { font-size: 26px; font-weight: 700; padding: 10px 24px; border-radius: 999px; background: #fffbf6; border: 2px solid #e8dccf; color: #7b6b71; }
.foot { position: absolute; bottom: 70px; left: 0; right: 0; text-align: center; font-size: 26px; color: #7b6b71; direction: ltr; letter-spacing: .5px; }
.foot b { color: #86391f; }

/* step slide */
.head { position: absolute; top: 250px; left: 60px; right: 60px; height: 190px; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; }
.meta { display: flex; gap: 14px; align-items: center; font-size: 26px; font-weight: 700; color: #7b6b71; }
.meta .n { background: #a34a30; color: #fffaf5; padding: 6px 20px; border-radius: 999px; }
.meta .g { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
h1 { font-size: 50px; line-height: 1.35; font-weight: 900; }
.stage { position: absolute; top: 460px; left: 0; right: 0; height: 1010px; }
/* height set by the layout script (the step text below takes what it needs); width follows */
.phone { position: absolute; top: 0; height: 100%; aspect-ratio: 486 / 1010; right: 48px; padding: 12px; border-radius: 52px; background: #2a1d26;
  box-shadow: 0 30px 60px -20px rgb(42 29 38 / .45); }
.phone.solo { right: auto; left: 50%; transform: translateX(-50%); }
.screen { position: relative; width: 100%; height: 100%; border-radius: 40px; overflow: hidden; }
/* the screenshot at its own aspect ratio, cropped at the bottom by .screen; frames in % of it */
.shot { position: relative; width: 100%; }
.shot img { width: 100%; display: block; }
.box { position: absolute; border: 5px solid #ff7a45; border-radius: 16px; box-shadow: 0 0 0 5px rgb(255 122 69 / .3), 0 6px 18px rgb(255 122 69 / .35); }
.num { position: absolute; transform: translate(-50%, -50%); width: 50px; height: 50px; border-radius: 50%; background: #ff7a45; color: #fff; font-weight: 900; font-size: 28px;
  display: flex; align-items: center; justify-content: center; border: 4px solid #fffaf5; box-shadow: 0 4px 10px rgb(0 0 0 / .25); }
.notes { position: absolute; top: 0; left: 50px; width: 450px; height: 100%; }
.note { position: absolute; left: 0; width: 450px; background: #fffbf6; border: 3px solid #ff7a45; border-radius: 26px; padding: 18px 22px;
  display: flex; gap: 16px; align-items: center; box-shadow: 0 10px 24px -12px rgb(42 29 38 / .35); }
.note .num { position: static; transform: none; flex: none; width: 48px; height: 48px; font-size: 26px; border: none; box-shadow: none; }
.note p { font-size: 31px; line-height: 1.5; font-weight: 800; }
svg.lines { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; z-index: 1; pointer-events: none; }
.shot .num { z-index: 2; } /* numbers above the leader lines */
.body { position: absolute; bottom: 230px; left: 60px; right: 60px; display: flex; flex-direction: column; gap: 10px; }
.body p { font-size: 31px; line-height: 1.7; font-weight: 500; }
.body .tip { font-size: 26px; color: #2f6f68; font-weight: 700; }

/* cover slide */
.cover { position: absolute; top: 300px; left: 70px; right: 70px; bottom: 300px; display: flex; flex-direction: column; justify-content: center; gap: 34px; }
.cover .role { align-self: flex-start; font-size: 30px; font-weight: 800; color: #fffaf5; background: #a34a30; padding: 10px 30px; border-radius: 999px; }
.cover h1 { font-size: 76px; line-height: 1.3; }
.cover .sum { font-size: 36px; line-height: 1.75; color: #5b4a52; }
.cover ol { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 18px; margin-top: 10px; }
.cover li { display: flex; gap: 20px; align-items: center; font-size: 33px; font-weight: 700; background: #fffbf6; border: 2px solid #e8dccf; border-radius: 24px; padding: 16px 24px; }
.cover li span { flex: none; width: 52px; height: 52px; border-radius: 50%; background: #f4e1d4; color: #86391f; font-weight: 900; display: flex; align-items: center; justify-content: center; }
.cover .min { font-size: 28px; color: #7b6b71; font-weight: 700; }
`;

// Runs in the page: places the captions beside their frames without overlapping, draws the
// leader lines, and shrinks any text block that doesn't fit its area.
const LAYOUT = `
(() => {
  const fit = (el, min) => {
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollHeight > el.clientHeight + 1 && size > min) { size -= 1; el.style.fontSize = size + "px"; el.querySelectorAll("p").forEach((p) => (p.style.fontSize = size + "px")); }
  };
  document.querySelectorAll("[data-fit]").forEach((el) => fit(el, +el.dataset.fit));
  const stage = document.querySelector(".stage");
  const body = document.querySelector(".body");
  if (!stage) return;
  // The step text takes the room it needs above the bottom safe zone; the phone gets the rest
  // (shrinking the text only if the phone would get too small to read).
  const STAGE_TOP = 460, BODY_BOTTOM = 1920 - 230, MIN_STAGE = 760;
  const shrink = (el, size) => { el.style.fontSize = size + "px"; el.querySelectorAll("p").forEach((p) => (p.style.fontSize = (p.classList.contains("tip") ? size - 4 : size) + "px")); };
  if (body) {
    let size = 31;
    while (BODY_BOTTOM - body.offsetHeight - 30 - STAGE_TOP < MIN_STAGE && size > 20) shrink(body, --size);
    stage.style.height = Math.min(1010, BODY_BOTTOM - body.offsetHeight - 30 - STAGE_TOP) + "px";
  }
  const notes = [...document.querySelectorAll(".note")];
  const badges = [...document.querySelectorAll(".shot .num")];
  if (!notes.length) return;
  const sr = stage.getBoundingClientRect();
  const want = badges.map((b) => { const r = b.getBoundingClientRect(); return { y: r.top - sr.top + r.height / 2, x: r.left - sr.left }; });
  // captions in frame order would cross lines if frames aren't top-to-bottom; place by frame height
  const order = notes.map((_, i) => i).sort((a, b) => want[a].y - want[b].y);
  const GAP = 18, H = stage.clientHeight;
  const hs = notes.map((n) => n.offsetHeight);
  const ys = [];
  let cursor = 0;
  for (const i of order) { const y = Math.max(cursor, want[i].y - hs[i] / 2); ys[i] = y; cursor = y + hs[i] + GAP; }
  // too low: push the stack back up from the bottom
  let floor = H;
  for (const i of [...order].reverse()) { if (ys[i] + hs[i] > floor) ys[i] = floor - hs[i]; floor = ys[i] - GAP; }
  const svg = document.querySelector("svg.lines");
  notes.forEach((n, i) => {
    n.style.top = ys[i] + "px";
    const nr = n.getBoundingClientRect();
    const x1 = nr.right - sr.left, y1 = ys[i] + hs[i] / 2, x2 = want[i].x - 25, y2 = want[i].y; // stop at the badge's edge
    const mid = x1 + (x2 - x1) * 0.45;
    const d = 'M' + x1 + ' ' + y1 + ' H' + mid + ' L' + (mid + 24) + ' ' + y2 + ' H' + x2;
    // a light halo keeps the line visible where it crosses a dark screenshot
    svg.insertAdjacentHTML("beforeend",
      '<path d="' + d + '" fill="none" stroke="#fffaf5" stroke-opacity=".85" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#ff7a45" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>');
  });
})();
`;

function page(inner, panel, slug) {
  return `<!doctype html><html lang="fa"><head><meta charset="utf-8"><style>${STYLE}</style></head><body>
<div class="top"><div class="brand"><img src="data:image/png;base64,${ICON}">نوبتت</div><div class="chip">${esc(panel.label)} · راهنما</div></div>
${inner}
<div class="foot"><b>nobatet.app</b>/tutorials/${esc(slug)}</div>
<script>${LAYOUT}</script></body></html>`;
}

function coverSlide(t, panel) {
  const steps = t.steps.map((s, i) => `<li><span>${fa(i + 1)}</span>${esc(s.title)}</li>`).join("");
  return page(
    `<div class="cover" data-fit="22">
      <div class="role">${esc(TUTORIAL_ROLES.find((r) => r.id === t.role)?.label ?? panel.label)}</div>
      <h1>${esc(t.title)}</h1>
      <p class="sum">${esc(t.summary)}</p>
      <ol>${steps}</ol>
      <p class="min">${fa(t.minutes)} دقیقه · ${fa(t.steps.length)} مرحله</p>
    </div>`,
    panel,
    t.slug,
  );
}

function stepSlide(t, i, panel) {
  const s = t.steps[i];
  const shot = s.shot && SHOTS[s.shot];
  const file = s.shot && path.join(WEB, "public/tutorials", `${s.shot}.webp`);
  const img = file && existsSync(file) ? `data:image/webp;base64,${readFileSync(file).toString("base64")}` : null;
  const boxes = shot?.boxes ?? [];
  const callouts = s.callouts ?? [];
  let stage = "";
  if (img) {
    // Frames are % of the screenshot, like /tutorials; each number sits on the frame's left edge,
    // where its caption's leader line ends.
    // A frame with another frame to its left on the same row gets its number on its top edge
    // instead, so its line runs along the gap above the row rather than through the other frame.
    const frames = boxes.map((b, k) => {
      const blocked = boxes.some((o, j) => j !== k && o.y < b.y + b.h && b.y < o.y + o.h && o.x + o.w <= b.x + 1);
      const at = blocked ? `left:${b.x + Math.min(8, b.w / 2)}%;top:${b.y}%` : `left:max(26px, ${b.x}%);top:${b.y + b.h / 2}%`;
      return `<div class="box" style="left:calc(${b.x}% - 5px);top:calc(${b.y}% - 5px);width:calc(${b.w}% + 10px);height:calc(${b.h}% + 10px)"></div>
        <div class="num" style="${at}">${fa(k + 1)}</div>`;
    });
    const notes = boxes.map((_, k) => callouts[k]).map((c, k) => (c ? `<div class="note"><span class="num">${fa(k + 1)}</span><p>${esc(c)}</p></div>` : "")).join("");
    const solo = !notes;
    stage = `<div class="stage">
      <div class="phone${solo ? " solo" : ""}"><div class="screen"><div class="shot" style="aspect-ratio:${shot.w} / ${shot.h}"><img src="${img}">${frames.join("")}</div></div></div>
      ${solo ? "" : `<div class="notes">${notes}</div><svg class="lines"></svg>`}
    </div>`;
  }
  const tip = s.tip ? `<p class="tip">نکته: ${esc(s.tip)}</p>` : "";
  return page(
    `<div class="head">
      <div class="meta"><span class="n">مرحله ${fa(i + 1)} از ${fa(t.steps.length)}</span><span class="g">${esc(t.title)}</span></div>
      <h1 data-fit="34" style="max-height:136px;overflow:hidden">${esc(s.title)}</h1>
    </div>
    ${stage}
    <div class="body"><p>${esc(s.body)}</p>${tip}</div>`,
    panel,
    t.slug,
  );
}

const browser = await chromium.launch({ executablePath: chromiumPath() });
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const tab = await ctx.newPage();
let total = 0;

for (const panel of PANELS) {
  const guides = TUTORIALS.filter((t) => t.role === panel.role && t.slug.includes(ONLY));
  if (!guides.length) continue;
  const dir = path.join(OUT, ONLY ? "_preview" : panel.dir);
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/\.(jpg|png)$/.test(f)) unlinkSync(path.join(dir, f));
  let n = 0;
  const count = guides.reduce((sum, t) => sum + 1 + t.steps.length, 0);
  // two-digit prefixes keep phones sorting 02 before 10; more than 99 slides would break that
  if (count > 99) throw new Error(`${panel.dir}: ${count} slides — more than two digits can order`);
  for (const t of guides) {
    const guide = t.slug.replace(/-/g, "_");
    const slides = [
      [`${guide}_intro`, coverSlide(t, panel)],
      ...t.steps.map((st, i) => [STEP_SLUGS[st.shot] ?? `${guide}_step${i + 1}`, stepSlide(t, i, panel)]),
    ];
    for (const [name, html] of slides) {
      n++;
      await tab.setContent(html, { waitUntil: "load" });
      await tab.evaluate(() => document.fonts.ready);
      const file = path.join(dir, `${String(n).padStart(2, "0")}_${name}.png`);
      await tab.screenshot({ path: file, type: "png" });
    }
  }
  total += n;
  console.log(`${panel.dir}: ${n} slides`);
}

await browser.close();
console.log(`done: ${total} slides in ${path.relative(process.cwd(), OUT) || OUT}`);
