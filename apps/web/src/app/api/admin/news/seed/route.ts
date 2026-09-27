import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const seedData = [
  {
    category: "راه‌اندازی",
    hashtags: ["بتا", "Assist Me"],
    title: "Assist Me وارد مرحله بتای عمومی شد",
    body: "پس از چندین ماه آزمایش با کاربران اولیه، امروز درهای Assist Me برای همه باز شد. تا پایان تابستان ۱۴۰۵، پلن حرفه‌ای برای کاربران بتا رایگان است.",
    highlight: true,
    published: true,
    publishedAt: new Date("2026-06-10"),
  },
  {
    category: "قابلیت جدید",
    hashtags: ["هشدار ترکیبی", "RSI"],
    title: "پشتیبانی از هشدارهای ترکیبی اضافه شد",
    body: "از این پس می‌توانید چند شرط را با هم ترکیب کنید — مثلاً RSI زیر ۳۰ و حجم بالای میانگین. این قابلیت در تمام پلن‌های پولی فعال است.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-05-29"),
  },
  {
    category: "اتصال",
    hashtags: ["تلگرام", "ربات"],
    title: "اتصال مستقیم به تلگرام فعال شد",
    body: "کاربران اکنون می‌توانند هشدارهای خود را مستقیماً در تلگرام دریافت کنند. راه‌اندازی ربات تنها ۳۰ ثانیه زمان می‌برد.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-04-15"),
  },
  {
    category: "نگهداری",
    hashtags: ["زیرساخت", "آپدیت"],
    title: "به‌روزرسانی زیرساخت — ۱۵ اردیبهشت",
    body: "روز ۱۵ اردیبهشت از ساعت ۰۲:۰۰ تا ۰۴:۰۰ بامداد، سرویس به صورت موقت در دسترس نخواهد بود. از همراهی شما متشکریم.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-04-30"),
  },
  {
    category: "صرافی‌ها",
    hashtags: ["OKX", "Bybit", "صرافی"],
    title: "اضافه شدن پشتیبانی از OKX و Bybit",
    body: "علاوه بر بایننس و کوین‌بیس، Assist Me اکنون از صرافی‌های OKX و Bybit نیز پشتیبانی می‌کند. پوشش بازار ما به بیش از ۵۰۰۰ جفت‌ارز رسید.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-04-09"),
  },
  {
    category: "قابلیت جدید",
    hashtags: ["فیبوناچی", "اندیکاتور", "آپدیت"],
    title: "پشتیبانی از اندیکاتور فیبوناچی اضافه شد",
    body: "از این پس می‌توانید هشدار برای سطوح کلیدی فیبوناچی ریتریسمنت (۳۸.۲٪، ۵۰٪، ۶۱.۸٪) تنظیم کنید. این قابلیت در پلن‌های حرفه‌ای و سازمانی در دسترس است.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-06-25"),
  },
  {
    category: "گزارش",
    hashtags: ["آمار", "خرداد ۱۴۰۵"],
    title: "گزارش ماهانه خرداد ۱۴۰۵ — رشد ۴۰٪ کاربران",
    body: "در خرداد ۱۴۰۵ تعداد کاربران فعال Assist Me ۴۰٪ رشد کرد. بیش از ۱۲,۰۰۰ هشدار ارسال شد و میانگین زمان ارسال هشدار به زیر ۳ ثانیه رسید. از اعتماد شما ممنونیم.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-06-21"),
  },
  {
    category: "پلن جدید",
    hashtags: ["سازمانی", "API", "تیم"],
    title: "پلن سازمانی Assist Me رسماً راه‌اندازی شد",
    body: "پلن سازمانی با امکاناتی مثل هشدار نامحدود، دسترسی API، مدیریت چند کاربر، و ربات تلگرام اختصاصی برای تیم‌ها آماده است. برای اطلاع از تعرفه، با پشتیبانی تماس بگیرید.",
    highlight: false,
    published: true,
    publishedAt: new Date("2026-07-01"),
  },
];

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let inserted = 0;
  let skipped = 0;

  for (const item of seedData) {
    const exists = await prisma.newsItem.findFirst({ where: { title: item.title } });
    if (exists) { skipped++; continue; }
    await prisma.newsItem.create({ data: item });
    inserted++;
  }

  return NextResponse.json({ inserted, skipped });
}
