// Captures the Help Center screenshots from the running app (demo data) and records where the
// highlighted buttons/fields are, so the callout frames on /tutorials line up with the real UI.
//
//   node scripts/demo/seed.mjs            # demo salons, stylists, customers (password demo1234)
//   python3 scripts/demo/make-images.py   # demo photos (optional, but screenshots look broken without)
//   (apps/api on :3001, apps/web on :3000)
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
const ONLY = process.argv[2] ?? "";
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;

const ACCOUNTS = {
  owner: { phone: "09900000009", home: /\/salon/ },
  stylist: { phone: "09900000010", home: /\/stylist/ },
  customer: { phone: "09900000001", home: /\/dashboard/ },
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
      permissions: ["geolocation"],
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

await shot("owner-services-1", "owner", go("/salon/services"), (p) => [p.getByRole("button", { name: "افزودن خدمت" }), p.getByRole("button", { name: "مدیریت دسته‌بندی‌ها" })]);
await shot("owner-services-2", "owner", async (p) => {
  await p.getByRole("button", { name: "افزودن خدمت" }).click();
  await settle(p);
  const s = inSheet(p);
  await s.getByLabel("نام خدمت").fill("کراتینه مو");
}, (p) => [inSheet(p).getByLabel("نام خدمت"), inSheet(p).getByRole("button", { name: /^دسته‌بندی:/ }), inSheet(p).getByText("قیمت (تومان)").locator("..")]);
await shot("owner-services-3", "owner", async (p) => {
  await p.keyboard.press("Escape");
  await settle(p);
  await p.getByRole("button", { name: "مدیریت دسته‌بندی‌ها" }).click();
}, (p) => [inSheet(p).getByRole("button", { name: "افزودن دسته" })]);

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
  await p.getByRole("tab", { name: "تقویم" }).click();
  await settle(p, 900);
  await p.getByRole("gridcell").filter({ has: p.locator("span.rounded-full") }).first().click();
  await settle(p, 600);
}, (p) => [p.getByRole("tab", { name: "تقویم" }), p.getByRole("gridcell", { selected: true }), p.locator("main button").filter({ hasText: "(نمونه)" }).first()]);
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
const phoneInput = (p) => inSheet(p).locator('input[type="tel"]').first();
await shot("customer-book-5", "guest", async (p) => {
  await inSheet(p).getByRole("button", { name: "ادامه" }).click();
  await settle(p, 1000);
  await nameInput(p).fill("نگار رضایی");
  await phoneInput(p).fill("09900000001");
}, (p) => [nameInput(p), phoneInput(p), inSheet(p).getByRole("button", { name: "ارسال کد تایید" })]);
await shot("customer-book-6", "guest", async (p) => {
  const res = p.waitForResponse((r) => r.url().includes("/otp/request"));
  await inSheet(p).getByRole("button", { name: "ارسال کد تایید" }).click();
  shared.devCode = (await (await res).json().catch(() => ({}))).devCode;
  await settle(p, 1000);
}, (p) => [inSheet(p).getByLabel("رقم 1 کد تایید").locator("..")]);
await shot("customer-book-7", "guest", async (p) => {
  if (shared.devCode) await inSheet(p).getByLabel("رقم 1 کد تایید").pressSequentially(shared.devCode, { delay: 80 });
  await settle(p, 2500);
  await scrollTo(inSheet(p).getByRole("button", { name: "تایید نهایی رزرو" }));
}, (p) => [inSheet(p).getByRole("button", { name: "تایید نهایی رزرو" })]);
await shot("customer-book-8", "guest", async (p) => {
  await inSheet(p).getByRole("button", { name: "تایید نهایی رزرو" }).click();
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
await shot("customer-wallet-1", "customer", go("/dashboard/finance"), (p) => [p.getByRole("button", { name: "افزودن کارت" }).or(p.getByRole("link", { name: "افزودن کارت" })).first(), p.getByRole("button", { name: "واریز جدید" }).or(p.getByRole("link", { name: "واریز جدید" })).first()]);
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

await browser.close();
