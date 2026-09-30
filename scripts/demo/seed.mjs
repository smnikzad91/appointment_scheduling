// Demo data: 5 salons with stylists, services, bookings, approved reviews, gallery and the home-page
// showcase, plus one independent stylist (demo-roya, 09900009000: works in «سالن زیبایی رز» under
// her own name and visits homes) — so every panel has something to show. Everything is tagged so it
// can be removed: slug "demo-…", phones "0990000…", names end in «(نمونه)».
//
//   node scripts/demo/seed.mjs            # (re)create — removes old demo data first
//   node scripts/demo/seed.mjs --remove   # delete all demo data
//
// Run from the repo root with packages/database/.env (salon_migrator) or any role with DML.
// Images come from scripts/demo/make-images.py (run it first). All demo users' password: demo1234

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { placeCenter } from "../../packages/iran-locations/index.ts";

const require = createRequire(import.meta.url);
for (const line of readFileSync(new URL("../../packages/database/.env", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { PrismaClient } = require("@appointment-scheduling/database");
const bcrypt = require("bcryptjs");
const db = new PrismaClient();

const TAG = "(نمونه)";
const PHONE = (n) => `0990000${String(n).padStart(4, "0")}`;
const IMG = (f) => `/uploads/demo/${f}`;

// Deterministic randomness, so re-seeding gives the same data.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const SALONS = [
  { name: "سالن زیبایی رز", province: "تهران", city: "تهران", slug: "demo-rose",
    address: "خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲", desc: "کوتاهی، رنگ و مراقبت مو با تیمی باتجربه در قلب تهران." },
  { name: "آتلیه موی مهتاب", province: "خراسان رضوی", city: "مشهد", slug: "demo-mahtab",
    address: "بلوار سجاد، سجاد ۱۴، طبقه دوم", desc: "تخصص در رنگ‌های فانتزی، بالیاژ و احیای مو." },
  { name: "سالن نگین", province: "اصفهان", city: "اصفهان", slug: "demo-negin",
    address: "خیابان چهارباغ بالا، کوچه ۸", desc: "آرایش عروس، شینیون و خدمات ناخن." },
  { name: "خانه زیبایی یاس", province: "فارس", city: "شیراز", slug: "demo-yas",
    address: "خیابان ملاصدرا، روبروی بانک ملت", desc: "فضایی آرام برای مراقبت پوست و مو." },
  { name: "سالن آرامیس", province: "مازندران", city: "ساری", slug: "demo-aramis",
    address: "خیابان فرهنگ، نبش کوچه دوم", desc: "کراتینه، پروتئین‌تراپی و کوتاهی مو." },
];
const CATALOG = [
  { cat: "مو", items: [["کوتاهی مو", 45, 350_000], ["رنگ مو", 150, 1_800_000], ["بالیاژ", 240, 3_500_000], ["کراتینه", 180, 2_600_000], ["براشینگ", 40, 300_000]] },
  { cat: "ناخن", items: [["مانیکور", 45, 400_000], ["کاشت ناخن", 120, 1_200_000], ["ژلیش", 60, 550_000]] },
  { cat: "پوست و آرایش", items: [["پاکسازی پوست", 75, 900_000], ["اصلاح ابرو", 20, 150_000], ["شینیون", 90, 1_500_000]] },
];
const STYLISTS = [["سارا", "احمدی"], ["مریم", "کریمی"], ["نازنین", "رضایی"], ["الهام", "موسوی"], ["نگار", "حسینی"],
  ["فاطمه", "جعفری"], ["زهرا", "کاظمی"], ["پریسا", "نوری"], ["شیما", "صادقی"], ["لیلا", "محمدی"], ["هانیه", "رحیمی"], ["مینا", "اکبری"]];
const BIOS = ["۸ سال تجربه در رنگ و لایت؛ عاشق رنگ‌های طبیعی.", "متخصص کوتاهی‌های مدرن و فرم‌دهی مو.",
  "کاشت و طراحی ناخن با جدیدترین متدها.", "آرایش عروس و شینیون با سابقه ۱۰ ساله.", "مراقبت پوست و پاکسازی تخصصی."];
const CUSTOMERS = [["آیدا", "شریفی"], ["نیلوفر", "قاسمی"], ["سمیرا", "باقری"], ["رویا", "امینی"],
  ["تینا", "یزدانی"], ["کیمیا", "فرهادی"], ["مهسا", "طاهری"], ["یسنا", "کریمیان"]];
const COMMENTS = {
  5: ["عالی بود، دقیقاً همون چیزی که می‌خواستم! حتماً دوباره میام.", "برخورد فوق‌العاده و کار بی‌نقص. ممنونم 🌸",
    "رنگ موم خیلی قشنگ شد، همه ازم می‌پرسن کجا رفتم.", "محیط تمیز و آرام، کار حرفه‌ای. پیشنهاد می‌کنم.", "سر وقت شروع شد و نتیجه عالی بود."],
  4: ["کار خوب بود، فقط کمی منتظر موندم.", "راضی بودم، قیمت هم منصفانه بود.", "نتیجه خوب بود، دفعه بعد کمی کوتاه‌تر می‌خوام."],
  3: ["بد نبود ولی انتظار بیشتری داشتم.", "کار متوسط بود، شلوغ بود و عجله داشتن."],
};
const CAPTIONS = ["بالیاژ عسلی", "کوتاهی باب", "رنگ شکلاتی", "شینیون عروس", "کراتینه", "طراحی ناخن", "لایت دودی", "فر درشت"];

async function remove() {
  const salons = await db.salon.findMany({ where: { slug: { startsWith: "demo-" } }, select: { id: true } });
  const salonIds = salons.map((s) => s.id);
  const users = await db.user.findMany({ where: { phone: { startsWith: "0990000" } }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const stylistIds = (await db.stylist.findMany({ where: { salonId: { in: salonIds } }, select: { id: true } })).map((s) => s.id);
  const apptWhere = { OR: [{ salonId: { in: salonIds } }, { customerId: { in: userIds } }] };
  const apptIds = (await db.appointment.findMany({ where: apptWhere, select: { id: true } })).map((a) => a.id);
  const banner = await db.homeBanner.findUnique({ where: { id: "singleton" } });
  await db.$transaction([
    ...(banner?.imageUrl?.startsWith("/uploads/demo/") ? [db.homeBanner.delete({ where: { id: "singleton" } })] : []),
    db.featuredSalon.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.featuredStylist.deleteMany({ where: { stylistId: { in: stylistIds } } }),
    db.review.deleteMany({ where: { appointmentId: { in: apptIds } } }),
    db.appointmentService.deleteMany({ where: { appointmentId: { in: apptIds } } }),
    db.notification.deleteMany({ where: { userId: { in: userIds } } }),
    db.appointment.deleteMany({ where: { id: { in: apptIds } } }),
    db.favoriteSalon.deleteMany({ where: { OR: [{ salonId: { in: salonIds } }, { userId: { in: userIds } }] } }),
    db.waitlistEntry.deleteMany({ where: { OR: [{ salonId: { in: salonIds } }, { customerId: { in: userIds } }] } }),
    db.galleryImage.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.stylistPayout.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.salonExpense.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.stylistExpense.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.workingHour.deleteMany({ where: { stylistId: { in: stylistIds } } }),
    db.timeOff.deleteMany({ where: { stylistId: { in: stylistIds } } }),
    db.stylistService.deleteMany({ where: { stylistId: { in: stylistIds } } }),
    db.stylist.deleteMany({ where: { id: { in: stylistIds } } }),
    db.service.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.serviceCategory.deleteMany({ where: { salonId: { in: salonIds } } }),
    db.salon.deleteMany({ where: { id: { in: salonIds } } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  console.log(`removed ${salonIds.length} demo salons, ${userIds.length} demo users, ${apptIds.length} appointments`);
}

async function create() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  let phoneNo = 1;
  const newUser = (first, last, role) =>
    db.user.create({ data: { phone: PHONE(phoneNo++), passwordHash, firstName: first, lastName: `${last} ${TAG}`, role } });

  const customers = [];
  for (const [f, l] of CUSTOMERS) customers.push(await newUser(f, l, "CUSTOMER"));

  const now = new Date();
  const allStylists = [];
  const createdSalons = [];
  let stylistNo = 0;
  for (const [s, info] of SALONS.entries()) {
    const owner = await newUser(pick(["مهسا", "رها", "ساناز", "پگاه"]), `مدیر ${info.name.split(" ").at(-1)}`, "SALON_OWNER");
    const [clat, clng] = placeCenter(info.province, info.city);
    const salon = await db.salon.create({
      data: {
        ownerId: owner.id, name: `${info.name} ${TAG}`, slug: info.slug, description: info.desc,
        province: info.province, city: info.city, address: info.address, phone: `021${String(22000000 + s * 1111).slice(0, 8)}`,
        instagram: info.slug.replace("demo-", "demo.salon."), logoUrl: IMG(`salon${s}-logo.jpg`), coverImageUrl: IMG(`salon${s}-cover.jpg`),
        latitude: +(clat + (rnd() - 0.5) * 0.03).toFixed(6), longitude: +(clng + (rnd() - 0.5) * 0.03).toFixed(6), status: "ACTIVE",
      },
    });
    createdSalons.push(salon);

    const services = [];
    for (const [order, group] of CATALOG.entries()) {
      const cat = await db.serviceCategory.create({ data: { salonId: salon.id, name: group.cat, order } });
      for (const [name, minutes, price] of group.items) {
        if (rnd() < 0.25) continue; // salons don't all offer everything
        const priceToman = Math.round((price * (0.85 + rnd() * 0.4)) / 10_000) * 10_000;
        services.push(await db.service.create({ data: { salonId: salon.id, categoryId: cat.id, name, durationMinutes: minutes, priceToman } }));
      }
    }

    const stylists = [];
    const count = s === 0 ? 3 : 2 + (s % 2);
    for (let k = 0; k < count; k++) {
      const [f, l] = STYLISTS[stylistNo++ % STYLISTS.length];
      const u = await newUser(f, l, "STYLIST");
      const st = await db.stylist.create({
        data: { userId: u.id, salonId: salon.id, displayName: `${f} ${l}`, bio: pick(BIOS), commissionPercent: pick([20, 25, 30, 35]),
          avatarUrl: IMG(`salon${s}-stylist${k}-avatar.jpg`), coverImageUrl: IMG(`salon${s}-stylist${k}-cover.jpg`) },
      });
      // Saturday–Thursday (6,0,1,2,3,4), 10:00–20:00; Friday off.
      await db.workingHour.createMany({ data: [6, 0, 1, 2, 3, 4].map((d) => ({ stylistId: st.id, dayOfWeek: d, startMinute: 600, endMinute: 1200 })) });
      const mine = services.filter((_, i) => (i + k) % count !== 0 || services.length < 4);
      await db.stylistService.createMany({ data: mine.map((sv) => ({ stylistId: st.id, serviceId: sv.id })) });
      stylists.push({ ...st, services: mine });
      allStylists.push(st);
    }

    for (let g = 0; g < 6; g++) {
      await db.galleryImage.create({ data: { salonId: salon.id, stylistId: stylists[g % stylists.length].id, url: IMG(`salon${s}-gallery${g}.jpg`), caption: pick(CAPTIONS),
        createdAt: new Date(now - (g + 1) * 3 * 864e5) } });
    }

    // Past completed visits with reviews (ratings skew high, first salon highest) + a few upcoming bookings.
    const pastVisits = 5 + ((4 - s) % 5) + 2;
    for (let v = 0; v < pastVisits + 4; v++) {
      const past = v < pastVisits;
      const st = pick(stylists);
      const svc = st.services.length ? pick(st.services) : services[0];
      const day = new Date(now);
      day.setDate(day.getDate() + (past ? -(3 + Math.floor(rnd() * 60)) : 1 + Math.floor(rnd() * 10)));
      if (day.getDay() === 5) day.setDate(day.getDate() + (past ? -1 : 1)); // not on Friday
      day.setHours(10 + Math.floor(rnd() * 8), pick([0, 30]), 0, 0);
      const endAt = new Date(+day + svc.durationMinutes * 6e4);
      const tip = past && rnd() < 0.3 ? pick([50_000, 100_000, 200_000]) : null;
      const appt = await db.appointment.create({
        data: {
          salonId: salon.id, stylistId: st.id, customerId: pick(customers).id, startAt: day, endAt, priceToman: svc.priceToman,
          status: past ? (rnd() < 0.1 ? pick(["CANCELLED", "NO_SHOW"]) : "COMPLETED") : pick(["CONFIRMED", "CONFIRMED", "PENDING"]),
          ...(past && { completedAt: endAt, chargedToman: svc.priceToman, stylistCommissionPercent: st.commissionPercent, tipToman: tip,
            stylistShareToman: Math.round((svc.priceToman * st.commissionPercent) / 100) + (tip ?? 0) }),
          services: { create: { serviceId: svc.id, priceToman: svc.priceToman, durationMinutes: svc.durationMinutes } },
        },
      });
      if (appt.status !== "COMPLETED") {
        if (appt.status === "CANCELLED" || appt.status === "NO_SHOW") {
          await db.appointment.update({ where: { id: appt.id }, data: { completedAt: null, chargedToman: null, stylistCommissionPercent: null, tipToman: null, stylistShareToman: null } });
        }
        continue;
      }
      const bias = s === 0 ? 0.85 : s === 3 ? 0.35 : 0.6;
      const rating = rnd() < bias ? 5 : rnd() < 0.75 ? 4 : 3;
      const status = v === pastVisits - 1 ? "PENDING" : "APPROVED"; // one waiting for moderation per salon
      const createdAt = new Date(+endAt + 36e5 * 3);
      await db.review.create({ data: { appointmentId: appt.id, salonId: salon.id, target: "SALON", rating, comment: pick(COMMENTS[rating]), status,
        moderatedAt: status === "APPROVED" ? createdAt : null, createdAt } });
      await db.review.create({ data: { appointmentId: appt.id, salonId: salon.id, target: "STYLIST", stylistId: st.id,
        rating: Math.min(5, rating + (rnd() < 0.3 ? 1 : 0)), comment: rnd() < 0.5 ? pick(COMMENTS[Math.min(5, rating + 1)]) : null, status,
        moderatedAt: status === "APPROVED" ? createdAt : null, createdAt } });
    }
  }

  // A stylist's own work costs (stylist panel «هزینه‌های من»), this month.
  const expenseDay = (d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 12);
  for (const [category, amountToman, d, description] of [
    ["SUPPLIES", 850_000, 2, "رنگ مو و اکسیدان"],
    ["TOOLS", 1_400_000, 6, "سشوار حرفه‌ای"],
    ["TRANSPORT", 180_000, 9, "رفت‌وآمد برای خرید مواد"],
  ]) {
    await db.stylistExpense.create({
      data: { stylistId: allStylists[0].id, salonId: allStylists[0].salonId, category, amountToman, spentAt: expenseDay(d), description },
    });
  }

  await createIndependent(passwordHash, customers, createdSalons[0], now);

  // A couple of favourites for the first customer, so /dashboard shows them.
  await db.favoriteSalon.createMany({ data: createdSalons.slice(0, 2).map((s) => ({ userId: customers[0].id, salonId: s.id })) });

  // Home page showcase — only if the admin hasn't set one up yet.
  if (!(await db.homeBanner.findUnique({ where: { id: "singleton" } }))?.imageUrl) {
    await db.homeBanner.upsert({ where: { id: "singleton" }, create: { imageUrl: IMG("banner.jpg"), linkUrl: "https://example.com", title: `پخش لوازم آرایشی ${TAG}`, active: true },
      update: { imageUrl: IMG("banner.jpg"), linkUrl: "https://example.com", title: `پخش لوازم آرایشی ${TAG}`, active: true } });
  }
  const taken = new Set((await db.featuredSalon.findMany()).map((f) => f.priority));
  for (const salon of createdSalons.slice(0, 3)) {
    const priority = [1, 2, 3].find((p) => !taken.has(p));
    if (!priority) break;
    taken.add(priority);
    await db.featuredSalon.create({ data: { salonId: salon.id, priority } });
  }
  const takenSt = new Set((await db.featuredStylist.findMany()).map((f) => f.priority));
  for (const st of [allStylists[0], allStylists[3], allStylists[5]].filter(Boolean)) {
    const priority = [1, 2, 3].find((p) => !takenSt.has(p));
    if (!priority) break;
    takenSt.add(priority);
    await db.featuredStylist.create({ data: { stylistId: st.id, priority } });
  }

  const counts = await Promise.all([
    db.salon.count({ where: { slug: { startsWith: "demo-" } } }), db.stylist.count({ where: { salon: { slug: { startsWith: "demo-" } } } }),
    db.appointment.count({ where: { salon: { slug: { startsWith: "demo-" } } } }), db.review.count({ where: { salon: { slug: { startsWith: "demo-" } } } }),
  ]);
  console.log(`created ${counts[0]} salons, ${counts[1]} stylists, ${customers.length} customers, ${counts[2]} appointments, ${counts[3]} reviews`);
  console.log(`logins (password demo1234): customer ${customers[0].phone}; owner/stylist phones from ${PHONE(CUSTOMERS.length + 1)} upward`);
}

/**
 * An independent stylist: her own business (Salon kind INDEPENDENT, she's its only stylist, 0%
 * commission) working in «سالن زیبایی رز» under her own name, plus home visits.
 */
async function createIndependent(passwordHash, customers, hostSalon, now) {
  const user = await db.user.create({
    data: { phone: PHONE(9000), passwordHash, firstName: "رویا", lastName: `کاظمی ${TAG}`, role: "INDEPENDENT_STYLIST" },
  });
  const salon = await db.salon.create({
    data: {
      ownerId: user.id, kind: "INDEPENDENT", name: `رویا میکاپ ${TAG}`, slug: "demo-roya",
      description: "میکاپ و شینیون عروس با نام خودم؛ در سالن زیبایی رز یا در منزل شما.",
      province: hostSalon.province, city: hostSalon.city, address: hostSalon.address, phone: PHONE(9000),
      instagram: "demo.roya.makeup", logoUrl: IMG("salon2-stylist0-avatar.jpg"), coverImageUrl: IMG("salon2-cover.jpg"),
      latitude: hostSalon.latitude, longitude: hostSalon.longitude, status: "ACTIVE",
      serviceLocations: ["IN_SALON", "CLIENT_HOME"], hostSalonName: "سالن زیبایی رز", serviceArea: "شمال و مرکز تهران",
    },
  });
  const stylist = await db.stylist.create({
    data: { userId: user.id, salonId: salon.id, displayName: "رویا کاظمی", bio: "میکاپ و شینیون عروس با ۹ سال سابقه.", commissionPercent: 0 },
  });
  await db.workingHour.createMany({ data: [6, 0, 1, 2, 3].map((d) => ({ stylistId: stylist.id, dayOfWeek: d, startMinute: 660, endMinute: 1260 })) });
  const cat = await db.serviceCategory.create({ data: { salonId: salon.id, name: "میکاپ و شینیون", order: 0 } });
  const services = [];
  for (const [name, minutes, priceToman] of [["میکاپ", 60, 1_200_000], ["شینیون", 90, 1_500_000], ["میکاپ و شینیون عروس", 240, 6_500_000], ["اصلاح ابرو", 20, 150_000]]) {
    services.push(await db.service.create({ data: { salonId: salon.id, categoryId: cat.id, name, durationMinutes: minutes, priceToman } }));
  }
  await db.stylistService.createMany({ data: services.map((s) => ({ stylistId: stylist.id, serviceId: s.id })) });
  for (let g = 0; g < 4; g++) {
    await db.galleryImage.create({ data: { salonId: salon.id, stylistId: stylist.id, url: IMG(`salon2-gallery${g}.jpg`), caption: pick(CAPTIONS),
      createdAt: new Date(now - (g + 1) * 4 * 864e5) } });
  }
  const at = (days, hour) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    if (d.getDay() === 4 || d.getDay() === 5) d.setDate(d.getDate() + (days < 0 ? -2 : 2)); // her days off
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const visits = [
    // [days from now, hour, service, status, place, visit address]
    // completed ones within the last week, so this month's books show income
    [-1, 12, 1, "COMPLETED", "IN_SALON", null],
    [-2, 16, 0, "COMPLETED", "CLIENT_HOME", "تهران، شهرک غرب، خیابان فرحزادی، کوچه یاس، پلاک ۴"],
    [-3, 11, 2, "COMPLETED", "IN_SALON", null],
    [-5, 17, 0, "COMPLETED", "IN_SALON", null],
    [2, 12, 1, "CONFIRMED", "IN_SALON", null],
    [3, 15, 2, "CONFIRMED", "CLIENT_HOME", "تهران، سعادت‌آباد، خیابان سرو غربی، برج نگین، طبقه ۶"],
    [4, 18, 3, "PENDING", "IN_SALON", null],
  ];
  // A fully booked day (a bride's whole day), so the booking sheet offers the waitlist.
  const busyDay = at(8, 11);
  await db.appointment.create({
    data: {
      salonId: salon.id, stylistId: stylist.id, customerId: customers[5].id, startAt: busyDay, endAt: new Date(+busyDay + 10 * 36e5),
      priceToman: 12_000_000, status: "CONFIRMED", serviceLocation: "CLIENT_HOME", visitAddress: "تهران، زعفرانیه، خیابان آصف، پلاک ۲۰",
      notes: "عروس و همراهان — کل روز",
      services: { create: { serviceId: services[2].id, priceToman: 12_000_000, durationMinutes: 600 } },
    },
  });
  for (const [v, [days, hour, s, status, place, visitAddress]] of visits.entries()) {
    const svc = services[s];
    const startAt = at(days, hour);
    const endAt = new Date(+startAt + svc.durationMinutes * 6e4);
    const done = status === "COMPLETED";
    const appt = await db.appointment.create({
      data: {
        salonId: salon.id, stylistId: stylist.id, customerId: customers[v % customers.length].id, startAt, endAt, priceToman: svc.priceToman, status,
        serviceLocation: place, visitAddress,
        ...(done && { completedAt: endAt, chargedToman: svc.priceToman, stylistCommissionPercent: 0, stylistShareToman: 0, tipToman: v === 2 ? 300_000 : null }),
        services: { create: { serviceId: svc.id, priceToman: svc.priceToman, durationMinutes: svc.durationMinutes } },
      },
    });
    if (!done) continue;
    // One review per booking (the business's): the latest waits for her approval.
    const pending = v === 3;
    const createdAt = new Date(+endAt + 36e5 * 5);
    await db.review.create({ data: { appointmentId: appt.id, salonId: salon.id, target: "SALON", rating: 5, comment: pick(COMMENTS[5]),
      status: pending ? "PENDING" : "APPROVED", moderatedAt: pending ? null : createdAt, createdAt } });
  }
  for (const [category, amountToman, d, note] of [["SUPPLIES", 1_100_000, 3, "لوازم آرایش"], ["RENT", 2_500_000, 1, "اجاره صندلی در سالن رز"]]) {
    await db.salonExpense.create({ data: { salonId: salon.id, category, amountToman, spentAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - d, 12), note } });
  }
  console.log(`independent stylist: ${user.phone} (demo-roya)`);
}

try {
  await remove();
  if (!process.argv.includes("--remove")) await create();
} finally {
  await db.$disconnect();
}
