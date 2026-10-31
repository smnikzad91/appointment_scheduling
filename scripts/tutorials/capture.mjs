// Captures the Help Center screenshots from the running app (demo data) and records where the
// highlighted buttons/fields are, so the callout frames on /tutorials line up with the real UI.
//
//   node scripts/demo/seed.mjs            # demo salons, stylists, customers, wallets, visits (password demo1234)
//   python3 scripts/demo/make-images.py   # demo photos (optional, but screenshots look broken without)
//   node scripts/tutorials/fake-nodepass.mjs   # stand-in payment API on :3199 for the top-up screens
//   (apps/api on :3001, apps/web on :3000 — or TUTORIAL_API_URL / TUTORIAL_BASE_URL. Run both against a
//   separate demo database, never production: SMS_DRIVER=log on the api; on the web NODEPASS_URL=
//   http://127.0.0.1:3199 NODEPASS_API_KEY=demo, and NEXT_PUBLIC_SITE_URL=https://nobatet.app at build
//   so the share links read nobatet.app. A production build (next build + start) is ~5× faster than dev.)
//   node scripts/tutorials/capture.mjs [shot-id-prefix]
//
// Writes apps/web/public/tutorials/<id>.webp and apps/web/src/content/tutorialShots.json
// ({ id: { w, h, boxes: [{ x, y, w, h }] } }, box values in % of the image). Re-run after UI changes.
// Needs Pillow (webp conversion) and Playwright's Chromium. Mutates the local demo DB (it invites
// a stylist and books an appointment) — never point it at production.

import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = path.join(ROOT, "apps/web/public/tutorials");
const MAP_FILE = path.join(ROOT, "apps/web/src/content/tutorialShots.json");
const BASE = process.env.TUTORIAL_BASE_URL ?? "http://localhost:3000";
const API = process.env.TUTORIAL_API_URL ?? "http://localhost:3001";
const ONLY = process.argv[2] ?? "";
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;

const ACCOUNTS = {
  owner: { phone: "09900000009", home: /\/salon/ },
  stylist: { phone: "09900000010", home: /\/stylist/ },
  customer: { phone: "09900000001", home: /\/dashboard/ },
  // The seed's independent stylist (demo-roya): works in «سالن زیبایی رز» under her own name.
  independent: { phone: "09900009000", home: /\/salon/ },
};

mkdirSync(OUT_DIR, { recursive: true });
const shots = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, "utf8")) : {};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const contexts = {};
const shared = {}; // values passed between shots (e.g. the stylist's setup link)

async function pageFor(as) {
  if (!contexts[as]) {
    const ctx = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      locale: "fa-IR",
      geolocation: { latitude: 35.757, longitude: 51.41 },
      permissions: ["geolocation", "clipboard-read", "clipboard-write"],
      colorScheme: "light",
    });
    // no install banner / dev overlay noise in screenshots
    await ctx.addInitScript(() => {
      try { localStorage.setItem("installBannerSnoozedUntil", String(Date.now() + 864e8)); } catch {}
    });
    const page = await ctx.newPage();
    if (as !== "guest") {
      const acc = ACCOUNTS[as];
      await page.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
      await page.locator("input").first().fill(acc.phone);
      await page.locator("input[type=password]").fill("demo1234");
      await page.getByRole("button", { name: "ورود", exact: true }).click();
      await page.waitForURL(acc.home, { timeout: 30000 });
    }
    contexts[as] = page;
  }
  return contexts[as];
}

function saveMap() {
  writeFileSync(MAP_FILE, JSON.stringify(Object.fromEntries(Object.entries(shots).sort()), null, 1) + "\n");
}

const settle = (page, ms = 900) => page.waitForTimeout(ms);

async function hideNoise(page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
      *, *::before, *::after { caret-color: transparent !important; }`,
  });
}

/** One screenshot. `run` gets the page ready; `mark` returns locators to frame, in callout order. */
async function shot(id, as, run, mark = () => []) {
  if (ONLY && !id.startsWith(ONLY)) return;
  const page = await pageFor(as);
  try {
    await run(page);
    await hideNoise(page);
    await settle(page, 700);
    const boxes = [];
    for (const loc of mark(page)) {
      const b = await loc.first().boundingBox();
      if (!b) throw new Error(`highlight not found for ${id}`);
      const pad = 4;
      boxes.push({
        x: +(((b.x - pad) / VIEWPORT.width) * 100).toFixed(2),
        y: +(((b.y - pad) / VIEWPORT.height) * 100).toFixed(2),
        w: +(((b.width + pad * 2) / VIEWPORT.width) * 100).toFixed(2),
        h: +(((b.height + pad * 2) / VIEWPORT.height) * 100).toFixed(2),
      });
    }
    const png = path.join(OUT_DIR, `${id}.png`);
    await page.screenshot({ path: png });
    execFileSync("python3", ["-c", `from PIL import Image; Image.open(${JSON.stringify(png)}).convert("RGB").save(${JSON.stringify(png.replace(/\.png$/, ".webp"))}, "WEBP", quality=74, method=6)`]);
    unlinkSync(png);
    shots[id] = { w: VIEWPORT.width * SCALE, h: VIEWPORT.height * SCALE, boxes };
    saveMap(); // after every shot, so a later failure never loses earlier boxes
    console.log("✓", id, boxes.length ? `(${boxes.length} highlights)` : "");
  } catch (err) {
    console.log("✗", id, String(err.message).split("\n")[0]);
  }
}

const go = (url) => async (page) => {
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle" });
  await settle(page, 1200);
};
const inSheet = (page) => page.locator('[role="dialog"]').last();
const scrollTo = async (loc) => {
  await loc.first().evaluate((el) => el.scrollIntoView({ block: "center" }));
  await settle(loc.page(), 400);
};

// ─────────────────────────────── Salon owners ───────────────────────────────

await shot("owner-register-1", "guest", go("/signup-salon"), (p) => [p.getByLabel("نام", { exact: true }), p.getByLabel("شماره موبایل"), p.getByLabel("رمز عبور")]);
await shot("owner-register-2", "guest", async (p) => {
  await go("/signup-salon")(p);
  await p.getByLabel("نام سالن").fill("سالن زیبایی نیلوفر");
  await scrollTo(p.getByRole("button", { name: /^استان/ }).or(p.getByRole("button", { name: "انتخاب کنید" })));
}, (p) => [p.getByLabel("نام سالن"), p.locator('button[aria-haspopup="dialog"]').first()]);
await shot("owner-register-3", "guest", async (p) => {
  await p.locator('button[aria-haspopup="dialog"]').first().click();
  await settle(p);
  await inSheet(p).getByRole("searchbox").fill("تهران");
}, (p) => [inSheet(p).getByRole("searchbox"), inSheet(p).getByRole("option").first()]);
await shot("owner-register-4", "guest", async (p) => {
  await inSheet(p).getByRole("option").first().locator("button").click();
  await settle(p);
  await inSheet(p).getByRole("option", { name: "تهران" }).locator("button").click();
  await settle(p);
  await scrollTo(p.getByText("محل سالن روی نقشه"));
}, (p) => [p.locator(".leaflet-container"), p.getByRole("button", { name: /موقعیت من/ })]);
await shot("owner-register-5", "guest", async (p) => {
  await scrollTo(p.getByRole("button", { name: "ثبت‌نام و ساخت سالن" }));
}, (p) => [p.getByRole("button", { name: "ثبت‌نام و ساخت سالن" })]);

await shot("owner-home-1", "owner", go("/salon"), (p) => [p.getByRole("navigation").last()]);

await shot("owner-settings-1", "owner", go("/salon/settings"), (p) => [p.getByText(/برای افزودن، تغییر/).first().locator("xpath=ancestor::section[1] | ancestor::div[3]").first()]);
await shot("owner-settings-2", "owner", async (p) => {
  await scrollTo(p.getByText("رنگ برند").first());
}, (p) => [p.getByRole("button", { name: /^رنگ #/ }).first().locator("..")]);

await shot("owner-stylists-1", "owner", go("/salon/stylists"), (p) => [p.getByRole("button", { name: "دعوت آرایشگر" })]);
await shot("owner-stylists-2", "owner", async (p) => {
  await p.getByRole("button", { name: "دعوت آرایشگر" }).click();
  await settle(p);
  const s = inSheet(p);
  await s.getByLabel("نام", { exact: true }).fill("الهام");
  await s.getByLabel("نام خانوادگی").fill("نوری");
  await s.getByLabel("شماره موبایل").fill("09900000777");
}, (p) => [inSheet(p).getByLabel("نام", { exact: true }), inSheet(p).getByLabel("شماره موبایل"), inSheet(p).getByText("سهم آرایشگر از درآمد").locator("..")]);
await shot("owner-stylists-3", "owner", async (p) => {
  const s = inSheet(p);
  const res = p.waitForResponse((r) => r.url().includes("/stylists") && r.request().method() === "POST");
  await s.getByRole("button", { name: /دعوت|افزودن|ساخت/ }).last().click();
  const body = await (await res).json().catch(() => ({}));
  if (body.setupToken) shared.setupToken = body.setupToken;
  await settle(p, 1500);
  // The guide shouldn't show a local URL or a real token: shorten the printed link.
  await p.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.nodeValue?.includes("/set-password/")) n.nodeValue = "…/set-password/a8F3kQ…";
    }
  });
}, (p) => [inSheet(p).getByRole("button", { name: /ارسال|کپی/ }).first(), inSheet(p).locator("svg:has(title)").first()]);

await shot("owner-services-1", "owner", go("/salon/services"), (p) => [p.getByRole("button", { name: "افزودن خدمت" }).first(), p.getByRole("button", { name: "دسته‌بندی‌ها", exact: true })]);
await shot("owner-services-2", "owner", async (p) => {
  await p.getByRole("button", { name: "افزودن خدمت" }).first().click();
  await settle(p);
  const s = inSheet(p);
  await s.getByLabel("نام خدمت").fill("کراتینه مو");
}, (p) => [inSheet(p).getByLabel("نام خدمت"), inSheet(p).getByRole("button", { name: /^دسته‌بندی:/ }), inSheet(p).getByText("قیمت (تومان)").locator("..")]);
await shot("owner-services-3", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await p.getByRole("button", { name: "دسته‌بندی‌ها", exact: true }).click();
  await settle(p);
}, (p) => [inSheet(p).getByPlaceholder(/نام دسته جدید/), inSheet(p).getByRole("button", { name: /^ویرایش / }).first(), inSheet(p).getByRole("button", { name: /^بردن .* به (بالا|پایین)$/ }).first()]);

await shot("owner-booking-1", "owner", async (p) => {
  await go("/salon/appointments")(p);
}, (p) => [p.getByRole("button", { name: /نوبت جدید|ثبت نوبت|افزودن/ }).first()]);
await shot("owner-booking-2", "owner", async (p) => {
  await p.getByRole("button", { name: /نوبت جدید|ثبت نوبت|افزودن/ }).first().click();
  await settle(p, 1500);
  await inSheet(p).locator('input[type="tel"], input[inputmode="tel"]').first().fill("09121112233");
}, (p) => [inSheet(p).locator('input[type="tel"], input[inputmode="tel"]').first(), inSheet(p).getByRole("radiogroup", { name: "آرایشگر" })]);
await shot("owner-booking-3", "owner", async (p) => {
  const s = inSheet(p);
  await s.locator('button[aria-pressed="false"]').first().click();
  await settle(p, 400);
  await scrollTo(s.getByRole("button", { name: /^ساعت شروع:/ }));
}, (p) => [inSheet(p).locator("button").filter({ hasText: /^امروز/ }).first(), inSheet(p).getByRole("button", { name: /^ساعت شروع:/ })]);
await shot("owner-booking-4", "owner", async (p) => {
  await inSheet(p).getByRole("button", { name: /^ساعت شروع:/ }).click();
  await settle(p);
}, (p) => [inSheet(p).getByRole("button", { name: /^۱۶:۰۰/ })]);
await pageFor("owner").then((p) => p.keyboard.press("Escape"));

// Managing an existing appointment (nothing is changed — the sheet is only opened).
await shot("owner-manage-1", "owner", async (p) => {
  await go("/salon/appointments")(p);
  await p.getByRole("tab", { name: /منتظر/ }).click();
  await settle(p, 900);
}, (p) => [p.getByRole("tab", { name: /منتظر/ }), p.locator("main button").filter({ hasText: "(نمونه)" }).first()]);
await shot("owner-manage-2", "owner", async (p) => {
  await p.locator("main button").filter({ hasText: "(نمونه)" }).first().click();
  await settle(p, 1200);
}, (p) => ["ویرایش نوبت", "تایید نوبت", "انجام شد", "مشتری نیامد"].map((n) => inSheet(p).getByRole("button", { name: n })));
await pageFor("owner").then((p) => p.keyboard.press("Escape"));
await shot("owner-manage-3", "owner", async (p) => {
  await go("/salon/appointments")(p);
  await p.getByRole("tab", { name: "ماه" }).click();
  await settle(p, 900);
  await p.getByRole("gridcell").filter({ has: p.locator("span.rounded-full") }).first().click();
  await settle(p, 600);
}, (p) => [p.getByRole("tab", { name: "ماه" }), p.getByRole("gridcell", { selected: true }), p.locator("main button").filter({ hasText: "(نمونه)" }).first()]);
await shot("owner-manage-4", "owner", async (p) => {
  await p.getByRole("tab", { name: "هفته" }).click();
  await settle(p, 900);
  await p.getByRole("button", { name: "هفته بعد" }).click(); // the demo's busier week
  await settle(p, 700);
  // filter chips at the top of the screen keeps the evening bookings in view below them
  await p.getByRole("radiogroup", { name: "آرایشگر" }).evaluate((el) => {
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 70);
  });
  await settle(p, 400);
}, (p) => [p.getByRole("radiogroup", { name: "آرایشگر" }), p.locator('main button[aria-label*=" تا "]').first()]);
await pageFor("owner").then(async (p) => {
  await p.getByRole("tab", { name: "فهرست" }).click().catch(() => {}); // leave the default view for later shots
});

await shot("owner-gallery-1", "owner", go("/salon/gallery"), (p) => [p.locator("main").getByRole("button", { name: /افزودن/ }).first(), p.locator("main button:has(img)").first()]);
await shot("owner-gallery-2", "owner", async (p) => {
  await p.locator("main button:has(img)").first().click();
  await settle(p, 1200);
}, (p) => [inSheet(p).getByRole("button", { name: /^کار کدام آرایشگر است؟:/ }), inSheet(p).getByRole("button", { name: /حذف عکس/ })]);
await pageFor("owner").then((p) => p.keyboard.press("Escape"));

// Accounting — the demo's completed appointments are in the previous Jalali month.
const prevMonth = async (p) => {
  await p.getByRole("button", { name: "ماه قبل" }).click();
  await settle(p, 1500);
};
await shot("owner-accounting-1", "owner", async (p) => {
  await go("/salon/accounting")(p);
  await prevMonth(p);
}, (p) => [p.getByRole("button", { name: "ماه قبل" }).locator(".."), p.getByText(/^سود خالص سالن/).locator("..")]);
await shot("owner-accounting-2", "owner", async (p) => {
  await scrollTo(p.getByRole("tab", { name: "آرایشگرها" }));
}, (p) => [p.getByRole("tablist").first(), p.locator("main button").filter({ hasText: "سارا احمدی" }).first().getByText(/^طلب/)]);
await shot("owner-accounting-3", "owner", async (p) => {
  await p.locator("main button").filter({ hasText: "سارا احمدی" }).first().click();
  await settle(p, 1200);
  await scrollTo(inSheet(p).getByLabel("مبلغ"));
}, (p) => [inSheet(p).getByLabel("مبلغ").locator("xpath=ancestor::label[1]"), inSheet(p).getByRole("button", { name: /^تاریخ پرداخت:/ })]);
await shot("owner-accounting-4", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await p.getByRole("tab", { name: /درآمدها/ }).click();
  await settle(p, 1000);
  await scrollTo(p.getByRole("tab", { name: /درآمدها/ }));
}, (p) => [p.locator("main button").filter({ hasText: "(نمونه)" }).first()]);
await shot("owner-accounting-5", "owner", async (p) => {
  await p.locator("main button").filter({ hasText: "(نمونه)" }).first().click();
  await settle(p, 1200);
}, (p) => [inSheet(p).getByText("مبلغی که مشتری پرداخت کرد").locator(".."), inSheet(p).getByText("انعام برای آرایشگر (اختیاری)").locator("..")]);
await shot("owner-accounting-6", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await p.getByRole("tab", { name: "هزینه‌ها" }).click();
  await settle(p, 800);
  await p.getByRole("button", { name: "افزودن هزینه" }).click();
  await settle(p, 1000);
}, (p) => [inSheet(p).getByRole("button", { name: "اجاره", exact: true }).locator(".."), inSheet(p).getByLabel("مبلغ").locator("xpath=ancestor::label[1]")]);
await shot("owner-accounting-7", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await p.getByRole("button", { name: "خروجی اکسل یا PDF" }).click();
  await settle(p, 1000);
}, (p) => [inSheet(p).locator("button").filter({ hasText: "CSV" }), inSheet(p).locator("button").filter({ hasText: "PDF / چاپ" })]);
await pageFor("owner").then((p) => p.keyboard.press("Escape"));

// ─────────────────────────────── Stylists ───────────────────────────────

if (shared.setupToken) {
  await shot("stylist-activate-1", "guest", go(`/set-password/${shared.setupToken}`), (p) => [p.getByLabel("رمز عبور", { exact: true }), p.getByLabel("تکرار رمز عبور")]);
}
await shot("stylist-home-1", "stylist", go("/stylist"), (p) => [p.getByText("برنامه امروز").first()]);
await shot("stylist-appointments-1", "stylist", go("/stylist/appointments"), (p) => [p.getByRole("tablist").first()]);
await shot("stylist-appointments-2", "stylist", async (p) => {
  const card = p.locator("main button, main a").filter({ hasText: /:/ }).first();
  await card.click();
  await settle(p, 1200);
}, (p) => [inSheet(p).getByRole("button", { name: /تأیید|تایید|انجام شد/ }).first()]);
await pageFor("stylist").then((p) => p.keyboard.press("Escape"));

await shot("stylist-book-1", "stylist", go("/stylist/appointments"), (p) => [p.getByRole("button", { name: "ثبت نوبت برای مشتری" })]);
await shot("stylist-book-2", "stylist", async (p) => {
  await p.getByRole("button", { name: "ثبت نوبت برای مشتری" }).click();
  await settle(p, 1500);
  await inSheet(p).locator('input[type="tel"], input[inputmode="tel"]').first().fill("09121112233");
}, (p) => [inSheet(p).locator('input[type="tel"], input[inputmode="tel"]').first(), inSheet(p).getByText("خدمات", { exact: true }).locator("xpath=following-sibling::*[1]")]);
await pageFor("stylist").then((p) => p.keyboard.press("Escape"));

await shot("stylist-schedule-1", "stylist", go("/stylist/schedule"), (p) => [p.getByRole("switch").first(), p.locator('button[aria-haspopup="dialog"]').first(), p.locator('button[aria-haspopup="dialog"]').nth(1)]);
await shot("stylist-schedule-2", "stylist", async (p) => {
  await p.locator('button[aria-haspopup="dialog"]').first().click();
  await settle(p);
}, (p) => [inSheet(p).locator("button[aria-pressed=true]")]);
await shot("stylist-schedule-3", "stylist", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await scrollTo(p.getByRole("button", { name: "ثبت مرخصی" }));
}, (p) => [p.getByRole("button", { name: "ثبت مرخصی" })]);
await shot("stylist-schedule-4", "stylist", async (p) => {
  await p.getByRole("button", { name: "ثبت مرخصی" }).click();
  await settle(p);
}, (p) => [inSheet(p).getByRole("button", { name: /^از روز:/ }), inSheet(p).getByRole("button", { name: /^تا روز:/ })]);
await pageFor("stylist").then((p) => p.keyboard.press("Escape"));

await shot("stylist-earnings-1", "stylist", async (p) => {
  await go("/stylist/earnings")(p);
  await p.getByRole("button", { name: "ماه قبل" }).click();
  await settle(p, 1500);
}, (p) => [
  p.getByRole("button", { name: "ماه قبل" }).locator(".."),
  p.locator("main section").filter({ hasText: /سهم شما در/ }).first(),
  p.getByText(/مانده طلب شما|حساب شما با سالن تسویه|پیش‌دریافت/).first().locator(".."),
]);
await shot("stylist-earnings-2", "stylist", async (p) => {
  await scrollTo(p.getByText("نوبت‌های انجام‌شده").first());
}, (p) => [p.getByText("نوبت‌های انجام‌شده").first().locator("..").locator("xpath=following-sibling::*[1]")]);
await shot("stylist-earnings-3", "stylist", async (p) => {
  await scrollTo(p.getByText("پرداخت‌های سالن به شما").first());
}, (p) => [p.getByText("پرداخت‌های سالن به شما").first().locator("..").locator("xpath=following-sibling::*[1]")]);

await shot("stylist-services-1", "stylist", go("/stylist/services"), (p) => [p.locator("main input").first()]);
await shot("stylist-profile-1", "stylist", go("/stylist/profile"), (p) => [p.locator("main textarea").first()]);
await shot("stylist-profile-2", "stylist", async (p) => {
  await scrollTo(p.getByText("نمونه کارهای من").first());
}, (p) => [p.locator("main").getByRole("button", { name: /افزودن/ }).last()]);

// ─────────────────────────────── Customers ───────────────────────────────

await shot("customer-search-1", "guest", go("/salons"), (p) => [p.getByRole("searchbox", { name: "جستجوی سالن" }), p.locator('button[aria-haspopup="dialog"]').first()]);
await shot("customer-search-2", "guest", async (p) => {
  await p.getByRole("button", { name: /نزدیک من/ }).click();
  await settle(p, 2500);
}, (p) => [p.getByRole("button", { name: /نزدیک من/ }), p.getByRole("radiogroup", { name: "مرتب‌سازی" })]);
await shot("customer-search-3", "guest", async (p) => {
  await p.getByRole("tab", { name: "نقشه" }).click();
  await settle(p, 2500);
}, (p) => [p.getByRole("tab", { name: "نقشه" })]);

await shot("customer-book-1", "guest", go("/s/demo-rose"), (p) => [p.getByRole("button", { name: /رزرو نوبت/ }).last()]);
await shot("customer-book-2", "guest", async (p) => {
  await p.getByRole("button", { name: /رزرو نوبت/ }).last().click();
  await settle(p, 1200);
  await inSheet(p).locator("button").filter({ hasText: "کوتاهی مو" }).first().click();
}, (p) => [inSheet(p).locator("button").filter({ hasText: "کوتاهی مو" }).first(), inSheet(p).getByRole("button", { name: "ادامه" })]);
await shot("customer-book-3", "guest", async (p) => {
  await inSheet(p).getByRole("button", { name: "ادامه" }).click();
  await settle(p, 1200);
}, (p) => [inSheet(p).locator("button").filter({ hasText: "فرقی نمی‌کند" }).first()]);
const day = (p) => inSheet(p).getByRole("listbox", { name: "انتخاب روز" }).locator("button").nth(1);
const slot = (p) => inSheet(p).locator("button[aria-pressed]:not([disabled])").filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ }).first();
await shot("customer-book-4", "guest", async (p) => {
  await inSheet(p).locator("button").filter({ hasText: "فرقی نمی‌کند" }).first().click();
  await settle(p, 1500);
  await day(p).click();
  await settle(p, 1800);
  await slot(p).click();
  await settle(p, 400);
}, (p) => [day(p), inSheet(p).locator("button[aria-pressed=true]").filter({ hasText: /^[۰-۹]{2}:[۰-۹]{2}$/ }).first()]);
const nameInput = (p) => inSheet(p).locator('input[type="text"]').first();
const lastNameInput = (p) => inSheet(p).locator('input[type="text"]').nth(1);
const phoneInput = (p) => inSheet(p).locator('input[type="tel"]').first();
await shot("customer-book-5", "guest", async (p) => {
  await inSheet(p).getByRole("button", { name: "ادامه" }).click();
  await settle(p, 1000);
  await nameInput(p).fill("نگار");
  await lastNameInput(p).fill("رضایی");
  await phoneInput(p).fill("09900000099"); // a new demo number (removed by the seed): an empty wallet
}, (p) => [nameInput(p).locator("../.."), phoneInput(p), inSheet(p).getByRole("button", { name: "ارسال کد تایید" })]);
await shot("customer-book-6", "guest", async (p) => {
  // The demo API answers with the code (devCode), which the sheet would fill and submit at once;
  // keep it out of the page so the code screen stays, and type it in the next shot.
  await p.route("**/auth/otp/request", async (route) => {
    const res = await route.fetch();
    const body = await res.json().catch(() => ({}));
    shared.devCode = body.devCode;
    delete body.devCode;
    await route.fulfill({ response: res, json: body });
  });
  await inSheet(p).getByRole("button", { name: "ارسال کد تایید" }).click();
  await settle(p, 1500);
  await p.unroute("**/auth/otp/request");
}, (p) => [inSheet(p).getByLabel("رقم 1 کد تایید").locator("..")]);
// A new guest's wallet is empty: the summary shows the 25% pre-payment and the top-up box.
await shot("customer-book-7", "guest", async (p) => {
  if (shared.devCode) await inSheet(p).getByLabel("رقم 1 کد تایید").pressSequentially(shared.devCode, { delay: 80 });
  await settle(p, 2500);
  await scrollTo(inSheet(p).getByText(/^پیش‌پرداخت از کیف پول/));
}, (p) => [inSheet(p).getByText(/^پیش‌پرداخت از کیف پول/).locator(".."), inSheet(p).getByText(/موجودی کیف پول برای پیش‌پرداخت کافی نیست/).locator("..")]);
// The signed-in demo customer has money in the wallet: same booking, paid from it.
await shot("customer-book-8", "customer", async (p) => {
  await go("/s/demo-rose")(p);
  await p.getByRole("button", { name: /رزرو نوبت/ }).last().click();
  await settle(p, 1200);
  await inSheet(p).locator("button").filter({ hasText: "کوتاهی مو" }).first().click();
  await inSheet(p).getByRole("button", { name: "ادامه" }).click();
  await settle(p, 1200);
  await inSheet(p).locator("button").filter({ hasText: "فرقی نمی‌کند" }).first().click();
  await settle(p, 1500);
  await inSheet(p).getByRole("listbox", { name: "انتخاب روز" }).locator("button").nth(2).click();
  await settle(p, 1800);
  await slot(p).click();
  await settle(p, 400);
  await inSheet(p).getByRole("button", { name: "ادامه" }).click();
  await settle(p, 2500);
  await scrollTo(inSheet(p).getByRole("button", { name: /از کیف پول و ثبت رزرو/ }));
}, (p) => [inSheet(p).getByRole("button", { name: /از کیف پول و ثبت رزرو/ })]);
await shot("customer-book-9", "customer", async (p) => {
  await inSheet(p).getByRole("button", { name: /از کیف پول و ثبت رزرو/ }).click();
  await settle(p, 2500);
});

await shot("customer-bookings-1", "customer", go("/dashboard/bookings"), (p) => [
  p.getByRole("tab").first(),
  p.getByText(/در انتظار تایید|تایید شده/).first(),
  p.getByRole("button", { name: "لغو نوبت" }).first(),
]);
await shot("customer-bookings-2", "customer", async (p) => {
  await p.getByRole("tab", { name: /گذشته/ }).click();
  await settle(p, 1500);
}, (p) => [p.getByRole("tab", { name: /گذشته/ }), p.locator("main").getByRole("link", { name: /رزرو دوباره/ }).first()]);

// Account: sign-up (not submitted) and sign-in.
await shot("customer-signup-1", "guest", async (p) => {
  await go("/signup")(p);
  await p.getByLabel("نام", { exact: true }).fill("نگار");
  await p.getByLabel("نام خانوادگی").fill("رضایی");
  await p.getByLabel("ایمیل").fill("negar@example.com");
  await p.getByLabel("شماره موبایل").fill("09123334455");
}, (p) => [p.getByLabel("نام", { exact: true }), p.getByLabel("ایمیل"), p.getByLabel("شماره موبایل"), p.getByLabel("رمز عبور")]);
await shot("customer-signup-2", "guest", async (p) => {
  await p.getByLabel("رمز عبور").fill("Negar1405x");
  // the square itself — the label's centre is the terms/privacy links
  await p.locator('label:has(input[type="checkbox"]) > span[aria-hidden]').first().click();
  await scrollTo(p.getByRole("button", { name: "ساخت حساب" }));
}, (p) => [p.locator('label:has(input[type="checkbox"])').first(), p.getByRole("button", { name: "ساخت حساب" })]);
await shot("customer-signin-1", "guest", go("/signin"), (p) => [p.getByLabel("ایمیل یا شماره موبایل"), p.getByLabel("رمز عبور"), p.getByRole("link", { name: /فراموش/ })]);

// Reviews: editing one sends it back to "pending", which the owner moderation shot below uses.
await shot("customer-review-1", "customer", async (p) => {
  await go("/dashboard/bookings")(p);
  await p.getByRole("tab", { name: /گذشته/ }).click();
  await settle(p, 1200);
}, (p) => [p.getByRole("button", { name: "ویرایش نظر درباره سالن" }).first()]);
await shot("customer-review-2", "customer", async (p) => {
  await p.getByRole("button", { name: "ویرایش نظر درباره سالن" }).first().click();
  await settle(p, 1000);
  await inSheet(p).getByRole("radio", { name: /^۵ ستاره/ }).click();
  await inSheet(p).getByLabel("متن نظر").fill("برخورد عالی و کار تمیز؛ حتماً دوباره می‌آیم.");
  await settle(p, 400);
}, (p) => [inSheet(p).getByRole("radiogroup", { name: "امتیاز" }), inSheet(p).getByLabel("متن نظر"), inSheet(p).getByRole("button", { name: "ذخیره تغییرات" })]);
if ("customer-review-2".startsWith(ONLY)) {
  const p = await pageFor("customer");
  await inSheet(p).getByRole("button", { name: "ذخیره تغییرات" }).click().catch(() => {});
  await settle(p, 1500);
}

// Saved salons (the demo customer already saved demo-rose — shown, not toggled).
await shot("customer-saved-1", "customer", go("/s/demo-rose"), (p) => [p.getByRole("button", { name: /سالن‌های محبوب/ }).first()]);
await shot("customer-saved-2", "customer", go("/dashboard"), (p) => [p.locator("main a").filter({ hasText: "(نمونه)" }).filter({ hasNotText: "نوبت بعدی" }).first()]);

// Wallet, support, profile.
await shot("customer-wallet-1", "customer", go("/dashboard/finance"), (p) => [p.getByPlaceholder("۲۰۰٬۰۰۰"), p.getByRole("button", { name: "ادامه", exact: true }), p.getByText("موجودی", { exact: true }).first().locator("..")]);
await shot("customer-support-1", "customer", go("/dashboard/support"), (p) => [p.getByRole("button", { name: "تیکت جدید" }).or(p.getByRole("link", { name: "تیکت جدید" })).first()]);
await shot("customer-support-2", "customer", async (p) => {
  await p.getByRole("button", { name: "تیکت جدید" }).or(p.getByRole("link", { name: "تیکت جدید" })).first().click();
  await settle(p, 1200);
}, (p) => [p.getByPlaceholder(/به‌طور خلاصه/), p.getByPlaceholder(/جزئیات/)]);
await shot("customer-profile-1", "customer", async (p) => {
  await go("/dashboard")(p);
  await scrollTo(p.getByRole("link", { name: /امنیت و رمز عبور/ }));
}, (p) => [p.getByRole("link", { name: /ویرایش پروفایل/ }), p.getByRole("link", { name: /امنیت و رمز عبور/ })]);

// Moderation — the customer's edited review above is now waiting.
await shot("owner-reviews-1", "owner", go("/salon/reviews"), (p) => [p.getByRole("tab").first(), p.getByRole("button", { name: "تایید و نمایش" }).first(), p.getByRole("button", { name: "رد", exact: true }).first()]);
await shot("stylist-reviews-1", "stylist", async (p) => {
  await go("/stylist/reviews")(p);
  await p.getByRole("tab", { name: "منتشرشده" }).click();
  await settle(p, 900);
}, (p) => [p.getByRole("tab", { name: "منتشرشده" }), p.getByRole("button", { name: "پنهان کردن" }).first()]);

// ─────────────────────────────── Stylist expenses ───────────────────────────────

await shot("stylist-expenses-1", "stylist", go("/stylist/expenses"), (p) => [
  p.getByRole("button", { name: "افزودن هزینه" }),
  p.getByRole("button", { name: "ماه قبل" }).locator(".."),
  p.getByRole("tablist").first(),
]);
await shot("stylist-expenses-2", "stylist", async (p) => {
  await p.getByRole("button", { name: "افزودن هزینه" }).click();
  await settle(p, 1000);
  const s = inSheet(p);
  await s.getByRole("button", { name: "ابزار و تعمیرات" }).or(s.getByRole("button", { name: /ابزار/ })).first().click();
  await s.locator("input").first().fill("650000");
  await s.getByPlaceholder(/رنگ مو و اکسیدان/).fill("قیچی کوتاهی حرفه‌ای");
}, (p) => [inSheet(p).getByText("دسته", { exact: true }).locator(".."), inSheet(p).locator("input").first(), inSheet(p).getByText("افزودن عکس رسید")]);
await shot("stylist-expenses-3", "stylist", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
}, (p) => [p.getByText(/^جمع هزینه‌ها/), p.locator("main button").filter({ hasText: "رنگ مو و اکسیدان" }).first()]);
// «زیان خالص» when the month's costs exceed the share — frame the costs + net row either way.
await shot("stylist-expenses-4", "stylist", go("/stylist/earnings"), (p) => [p.getByText(/^(درآمد|زیان) خالص$/).first().locator("../..")]);

// ─────────────────────────────── Waitlist ───────────────────────────────
// demo-roya has one fully booked day (the seed's bride): step through the days until the
// "tell me when a time opens up" button shows.

await shot("customer-waitlist-1", "customer", async (p) => {
  const salon = await (await fetch(`${API}/salons/demo-roya`)).json();
  const bridal = salon.services.find((sv) => sv.name.includes("عروس"));
  await go(`/s/demo-roya?book=1&services=${bridal.id}`)(p);
  const days = p.getByRole("listbox", { name: "انتخاب روز" }).getByRole("option").or(p.getByRole("listbox", { name: "انتخاب روز" }).locator("button"));
  const n = await days.count();
  for (let i = 0; i < n; i++) {
    await days.nth(i).click();
    await settle(p, 900);
    if (await p.getByRole("button", { name: /اگر وقتی خالی شد خبرم کن/ }).isVisible()) break;
  }
}, (p) => [p.getByRole("button", { name: /اگر وقتی خالی شد خبرم کن/ })]);

// ─────────────────────────────── Independent stylists ───────────────────────────────

await shot("indie-register-1", "guest", go("/signup-salon?type=independent"), (p) => [
  p.getByRole("radio", { name: /آرایشگر مستقل هستم/ }),
  p.getByLabel("نام", { exact: true }),
  p.getByLabel("شماره موبایل"),
]);
await shot("indie-register-2", "guest", async (p) => {
  await p.getByLabel("نام کاری").fill("رزا میکاپ");
  await p.getByRole("checkbox", { name: /در یک سالن، با نام خودم/ }).click();
  await p.getByRole("checkbox", { name: /خدمات در منزل مشتری/ }).click();
  await settle(p, 500);
  await p.getByLabel("نام سالنی که در آن کار می‌کنید").fill("سالن زیبایی رز");
  await scrollTo(p.getByRole("checkbox", { name: /در یک سالن، با نام خودم/ }));
}, (p) => [p.getByLabel("نام کاری"), p.getByRole("checkbox", { name: /در یک سالن، با نام خودم/ }), p.getByLabel("نام سالنی که در آن کار می‌کنید")]);
await shot("indie-register-3", "guest", async (p) => {
  await scrollTo(p.getByText("محل کار روی نقشه"));
}, (p) => [p.getByLabel(/آدرس سالن محل کار|آدرس محل کار/), p.locator(".leaflet-container")]);

await shot("indie-home-1", "independent", go("/salon"), (p) => [p.getByRole("navigation").last(), p.getByRole("link", { name: /صفحه رزرو/ }).first()]);
await shot("indie-services-1", "independent", go("/salon/services"), (p) => [p.getByRole("button", { name: "افزودن خدمت" }), p.getByText(/پیامک یادآوری:/).first()]);
await shot("indie-schedule-1", "independent", go("/salon/schedule"), (p) => [p.getByRole("switch").first(), p.locator('button[aria-haspopup="dialog"]').first(), p.locator('button[aria-haspopup="dialog"]').nth(1)]);
await shot("indie-settings-1", "independent", async (p) => {
  await go("/salon/settings")(p);
  await scrollTo(p.getByRole("switch", { name: "استودیو شخصی" }));
}, (p) => [p.getByRole("switch", { name: "در یک سالن، با نام خودم" }), p.getByText("نام سالنی که در آن کار می‌کنید").locator("..")]);

await shot("indie-appointments-1", "independent", go("/salon/appointments"), (p) => [
  p.getByRole("button", { name: "ثبت نوبت برای مشتری" }),
  p.locator("main button").filter({ hasText: "(نمونه)" }).first(),
]);
await shot("indie-appointments-2", "independent", async (p) => {
  await p.locator("main button").filter({ hasText: "شینیون عروس" }).first().click();
  await settle(p, 1000);
}, (p) => [inSheet(p).getByText("محل", { exact: true }).locator(".."), inSheet(p).getByText("نشانی مشتری", { exact: true }).locator("..")]);
await shot("indie-book-1", "independent", async (p) => {
  await go("/salon/appointments")(p);
  await p.getByRole("button", { name: "ثبت نوبت برای مشتری" }).click();
  await settle(p, 1500);
  const s = inSheet(p);
  await s.locator('input[type="tel"], input[inputmode="tel"]').first().fill("09121112233");
  await s.getByRole("button", { name: "در منزل مشتری", exact: true }).first().click();
  await settle(p, 500);
  await s.getByPlaceholder(/شهر، خیابان/).fill("تهران، پونک، خیابان عدل، پلاک ۸");
  await scrollTo(s.getByText("محل انجام نوبت"));
}, (p) => [inSheet(p).getByText("محل انجام نوبت").locator(".."), inSheet(p).getByPlaceholder(/شهر، خیابان/)]);

await shot("indie-accounting-1", "independent", async (p) => {
  await p.keyboard.press("Escape");
  await go("/salon/accounting")(p);
}, (p) => [p.getByText(/^(سود|زیان) خالص/).first().locator(".."), p.getByRole("tablist").first()]);
await shot("indie-accounting-2", "independent", async (p) => {
  await p.getByRole("tab", { name: /هزینه‌ها/ }).click();
  await settle(p, 1000);
}, (p) => [p.getByRole("tab", { name: /هزینه‌ها/ }), p.locator("main button").filter({ hasText: "اجاره صندلی" }).first()]);

await shot("indie-page-1", "guest", go("/s/demo-roya"), (p) => [p.getByText("آرایشگر مستقل", { exact: true }).first(), p.getByRole("button", { name: /رزرو نوبت/ }).last()]);
await shot("indie-page-2", "guest", async (p) => {
  await go("/s/demo-roya")(p);
  await scrollTo(p.getByText("اطلاعات و ساعات کاری"));
}, (p) => [p.getByText("در سالن زیبایی رز", { exact: true }).first(), p.getByText(/محدوده خدمات در منزل/).first()]);
await shot("indie-search-1", "guest", async (p) => {
  await go("/salons")(p);
  await p.getByRole("radio", { name: "آرایشگران مستقل" }).click();
  await settle(p, 1500);
}, (p) => [p.getByRole("radio", { name: "آرایشگران مستقل" }), p.locator("main a").filter({ hasText: "رویا میکاپ" }).first()]);
await shot("indie-reviews-1", "independent", go("/salon/reviews"), (p) => [p.getByRole("button", { name: "تایید و نمایش" }).first()]);

// ───────────── Wallet, plans, insights, share kit, pre-paid bookings (2026-10-31) ─────────────
// The demo web runs with NODEPASS_URL pointing at scripts/tutorials/fake-nodepass.mjs, so «ادامه»
// on a top-up opens the real card-to-card screen without reaching nodepass.

const panel = (p, title) => p.locator("section").filter({ has: p.getByRole("heading", { name: title, exact: true }) }).first();
/** Scrolls `loc` to just under the sticky panel header. */
const scrollTop = async (loc) => {
  await loc.first().evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70 }));
  await settle(loc.page(), 500);
};

/** Starts a top-up of `amount` toman on the wallet page and opens the card-to-card screen. */
async function startTopUp(p, amount) {
  const cancel = p.getByRole("button", { name: "لغو", exact: true });
  if (await cancel.count()) {
    await cancel.first().click(); // a pending one from an earlier run
    await settle(p, 1200);
  }
  await p.getByPlaceholder("۲۰۰٬۰۰۰").fill(String(amount));
  await p.getByRole("button", { name: "ادامه", exact: true }).click();
  await settle(p, 1800);
}
const exactBox = (p) => p.locator('label:has(input[type="checkbox"])').filter({ hasText: "تأیید می‌کنم" });

await shot("owner-wallet-1", "owner", go("/salon/wallet"), (p) => [p.getByPlaceholder("۲۰۰٬۰۰۰"), p.locator("button").filter({ hasText: /^۵۰۰٬۰۰۰$/ }).first(), p.getByRole("button", { name: "ادامه", exact: true })]);
await shot("owner-wallet-2", "owner", async (p) => {
  await startTopUp(p, 500000);
  await p.getByRole("button", { name: "کپی", exact: true }).first().click();
  await p.getByRole("button", { name: "کپی مبلغ دقیق" }).click();
  await settle(p, 300);
}, (p) => [p.getByText("مبلغ دقیق (ریال)").locator(".."), p.getByRole("alert").filter({ hasText: "توجه بسیار مهم" }), exactBox(p)]);
await shot("owner-wallet-3", "owner", async (p) => {
  await exactBox(p).click();
  await settle(p, 300);
  await scrollTo(p.getByRole("button", { name: "واریز کردم" }));
}, (p) => [exactBox(p), p.getByRole("button", { name: "واریز کردم" })]);
await shot("owner-wallet-4", "owner", async (p) => {
  await p.getByRole("button", { name: "لغو", exact: true }).first().click();
  await settle(p, 1200);
  await scrollTo(p.getByRole("button", { name: /برداشت از کیف پول/ }));
}, (p) => [p.getByRole("button", { name: /برداشت از کیف پول/ }), p.getByText("موجودی", { exact: true }).first().locator("..")]);
await shot("owner-wallet-5", "owner", async (p) => {
  await p.getByRole("button", { name: /برداشت از کیف پول/ }).click();
  await settle(p, 1000);
}, (p) => [inSheet(p).getByLabel("مبلغ (تومان)"), inSheet(p).getByLabel("شماره شبا"), inSheet(p).getByRole("button", { name: "ثبت درخواست برداشت" })]);

await shot("owner-plan-1", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await go("/salon/settings")(p);
  await scrollTop(p.locator("#subscription"));
}, (p) => [p.locator("#subscription"), p.getByRole("button", { name: /پلن از کیف پول/ })]);
await shot("owner-plan-2", "owner", async (p) => {
  await p.getByRole("button", { name: /پلن از کیف پول/ }).click();
  await settle(p, 1200);
  await inSheet(p).locator("button").filter({ hasText: "سالن رشد" }).first().click();
  await settle(p, 400);
}, (p) => [inSheet(p).locator("button").filter({ hasText: "سالن رشد" }).first(), inSheet(p).getByRole("button", { name: /^[۰-۹]+ ماه$/ }).first().locator(".."), inSheet(p).getByRole("button", { name: /از کیف پول$/ })]);

await shot("owner-insights-1", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await go("/salon/insights/visits")(p);
}, (p) => [panel(p, "روند بازدیدکننده‌ها (روزانه)"), p.getByRole("radiogroup").or(p.getByRole("tablist")).first()]);
await shot("owner-insights-2", "owner", async (p) => {
  await scrollTop(panel(p, "مسیر رزرو"));
}, (p) => [panel(p, "مسیر رزرو")]);
await shot("owner-insights-3", "owner", async (p) => {
  await scrollTop(panel(p, "از کجا آمدند"));
}, (p) => [panel(p, "از کجا آمدند")]);
await shot("owner-insights-4", "owner", go("/salon/insights/customers"), (p) => [panel(p, "نکته‌های کلیدی")]);
await shot("owner-insights-5", "owner", async (p) => {
  await scrollTop(panel(p, "شلوغی هفته"));
}, (p) => [panel(p, "شلوغی هفته")]);

await shot("owner-share-1", "owner", go("/salon/share"), (p) => [p.getByRole("button", { name: "کپی", exact: true }).first().locator(".."), p.locator("main svg").filter({ has: p.locator("title") }).first()]);
await shot("owner-share-2", "owner", async (p) => {
  await p.getByRole("radio", { name: "پست مربع" }).click(); // square: the whole preview fits on screen
  await settle(p, 800);
  await scrollTop(p.getByRole("radiogroup", { name: "اندازه پوستر" }));
}, (p) => [p.getByRole("radiogroup", { name: "اندازه پوستر" }), p.getByLabel("پیش‌نمایش پوستر")]);

// Pre-paid online bookings: the seed's in «سالن زیبایی رز» (customer نیلوفر قاسمی), waiting for the
// salon. The list cards don't show the pre-payment, so open the candidates until one does.
const pendingCards = (p) => p.locator("main button").filter({ hasText: "در انتظار تایید" }).filter({ hasText: "نیلوفر قاسمی" });
await shot("owner-prepaid-1", "owner", async (p) => {
  await go("/salon/appointments")(p);
  await p.getByRole("tab", { name: /منتظر تایید/ }).click();
  await settle(p, 1200);
  const n = await pendingCards(p).count();
  for (let i = 0; i < n; i++) {
    await pendingCards(p).nth(i).click();
    await settle(p, 900);
    const prepaid = await inSheet(p).getByText("پیش‌پرداخت (کیف پول)").count();
    await p.keyboard.press("Escape");
    await settle(p, 600);
    if (prepaid) {
      shared.prepaidCard = i;
      break;
    }
  }
  if (shared.prepaidCard === undefined) throw new Error("no pre-paid booking in the list");
  await scrollTo(pendingCards(p).nth(shared.prepaidCard));
}, (p) => [pendingCards(p).nth(shared.prepaidCard ?? 0)]);
await shot("owner-prepaid-2", "owner", async (p) => {
  await pendingCards(p).nth(shared.prepaidCard ?? 0).click();
  await settle(p, 1000);
  await scrollTo(inSheet(p).getByRole("button", { name: /تایید/ }).first());
}, (p) => [inSheet(p).getByText("پیش‌پرداخت (کیف پول)").locator(".."), inSheet(p).getByRole("button", { name: /تایید/ }).first()]);

await shot("stylist-wallet-1", "stylist", go("/stylist/wallet"), (p) => [p.getByText("موجودی", { exact: true }).first().locator(".."), p.getByRole("button", { name: /برداشت از کیف پول/ })]);
await shot("stylist-share-1", "stylist", go("/stylist/share"), (p) => [p.getByRole("button", { name: /کپی/ }).first().locator(".."), p.getByLabel("پیش‌نمایش پوستر")]);

await shot("indie-wallet-1", "independent", go("/salon/wallet"), (p) => [p.getByPlaceholder("۲۰۰٬۰۰۰"), p.getByText("موجودی", { exact: true }).first().locator("..")]);
await shot("indie-plan-1", "independent", async (p) => {
  await go("/salon/settings")(p);
  await scrollTop(p.locator("#subscription"));
}, (p) => [p.locator("#subscription"), p.getByRole("button", { name: /پلن از کیف پول/ })]);
await shot("indie-share-1", "independent", go("/salon/share"), (p) => [p.getByRole("button", { name: /کپی/ }).first().locator(".."), p.getByLabel("پیش‌نمایش پوستر")]);

await shot("customer-wallet-2", "customer", async (p) => {
  await go("/dashboard/finance")(p);
  await startTopUp(p, 200000);
}, (p) => [p.getByRole("button", { name: "کپی", exact: true }).first().locator("../.."), p.getByRole("button", { name: "کپی مبلغ دقیق" }), p.getByRole("alert").filter({ hasText: "توجه بسیار مهم" })]);
if ("customer-wallet-2".startsWith(ONLY)) {
  const p = await pageFor("customer");
  await p.getByRole("button", { name: "لغو", exact: true }).first().click().catch(() => {});
  await settle(p, 800);
}
await shot("customer-cancel-1", "customer", async (p) => {
  await go("/dashboard/bookings")(p);
  const card = p.locator("main").locator("article, li, div").filter({ hasText: "پیش‌پرداخت" }).filter({ has: p.getByRole("button", { name: "لغو نوبت" }) }).last();
  await card.getByRole("button", { name: "لغو نوبت" }).first().click();
  await settle(p, 1000);
}, (p) => [inSheet(p).getByText(/پیش‌پرداخت/).first(), inSheet(p).getByRole("button", { name: /لغو/ }).last()]);

await browser.close();
