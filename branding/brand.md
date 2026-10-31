# راهنمای هویت بصری و استانداردهای گرافیکی «نوبتت» (Nobatet Brand Guidelines)

پلتفرم جامع نوبت‌دهی آنلاین آرایشگاه و سالن‌های زیبایی (`nobatet.app`)

---

## ۱. پالت رنگی رسمی (Color Palette)

| نقش رنگ (Role) | نام رنگ | کد HEX | کد RGB | کاربرد اصلی |
| :--- | :--- | :--- | :--- | :--- |
| **Primary (اصلی)** | Brushed Copper (مسی/رزگلد) | `#C68A72` | `rgb(198, 138, 114)` | صفحه اصلی نماد، قاب دایره‌ای، المان‌های برندینگ و دکمه‌های فراخوان (CTA) |
| **Primary Highlight (هایلایت فلزی)** | Champagne Rose (رز شامپاینی) | `#EFBDA0` | `rgb(239, 189, 160)` | نقاط نورانی گرادیان فلزی، مربع فعال تقویم و جلوه‌های درخشش |
| **Primary Shadow (سایه فلزی)** | Deep Bronze (برنز تیره) | `#9C5E4B` | `rgb(156, 94, 75)` | لبه‌های بیرونی حلقه، عمق‌دهی به فلز و کنتراست گرادیان |
| **Secondary (فرعی / المان‌های درونی)** | Midnight Navy (سرمه‌ای تیره) | `#2B344D` | `rgb(43, 52, 77)` | نیم‌رخ خانم و آقا، عقربه‌های ساعت، خانه‌های تقویم و تایپوگرافی روی زمینه روشن |
| **PWA Theme & Dark Background** | Obsidian Charcoal (ذغالی تیره) | `#121319` | `rgb(18, 19, 25)` | رنگ پس‌زمینه اصلی اپلیکیشن، رنگ `theme_color` و `background_color` در `manifest.json` |
| **Elevated Surface (سطح کارت‌ها)** | Slate Charcoal (ذغالی ملایم) | `#1E2229` | `rgb(30, 34, 41)` | پس‌زمینه کارت‌ها، بنرها، آیکون‌های Maskable و Adaptive |
| **Text Primary (متن اصلی - دارک‌مود)** | Warm Ivory (سفید گرم) | `#F5EDE8` | `rgb(245, 237, 232)` | تایپوگرافی «نوبتت» و متون اصلی روی پس‌زمینه تیره (`#121319`) |
| **Text Primary (متن اصلی - لایت‌مود)** | Deep Navy (سرمه‌ای عمیق) | `#1C2233` | `rgb(28, 34, 51)` | تایپوگرافی «نوبتت» و متون اصلی روی پس‌زمینه روشن (`#FFFFFF` / `#F8F9FA`) |
| **Text Muted (متن فرعی)** | Muted Rose Grey (خاکستری رز) | `#A39690` | `rgb(163, 150, 144)` | زیرعنوان‌ها، تگ‌لاین‌ها و متون راهنما |

> **تنظیمات مانیفست وب‌اپلیکیشن (PWA Manifest):**
> * `theme_color`: `#121319`
> * `background_color`: `#121319`

---

## ۲. راهنمای استفاده از فایل‌ها بر اساس پس‌زمینه (Light vs. Dark Backgrounds)

| محیط استفاده | پس‌زمینه روشن (Light Mode / Print) | پس‌زمینه تیره (Dark Mode `#121319`) |
| :--- | :--- | :--- |
| **لوگوی عمودی (همراه با نام نوبتت)** | `masters/logo-vertical.svg` یا `masters/logo-vertical-1200.png` | `masters/logo-vertical-dark.svg` یا `web/logo_vertical_with_text.png` |
| **لوگوی افقی (هدر سایت و داشبورد)** | `masters/logo-horizontal.svg` | `masters/logo-horizontal-dark.svg` |
| **نماد به تنهایی (آواتار، اسپلش، بارگذاری)** | `masters/symbol.svg` یا `web/logo_symbol_transparent.png` | `masters/symbol.svg` یا `android/drawable-nodpi/logo_symbol.png` |
| **چاپ تک‌رنگ، مهر، فاکتور، واترمارک** | `masters/monochrome.svg` (`#000000`) | `android/ic_notification.svg` (`#FFFFFF`) |
| **فاوآیکون مرورگر (۱۶ تا ۴۸ پیکسل)** | `masters/favicon.svg` / `web/favicon.ico` | `masters/favicon.svg` / `web/favicon.ico` |

---

## ۳. حداقل ابعاد مجاز (Minimum Sizes) و حریم امن (Clear Space)

* **لوگوی کامل (عمودی یا افقی همراه با نوشتار «نوبتت»):** حداقل عرض ۱۲۰ پیکسل برای لوگوی افقی و حداقل ارتفاع ۸۰ پیکسل برای لوگوی عمودی (در چاپ: حداقل ۲۵ میلی‌متر).
* **نماد اصلی با جزئیات کامل (`symbol.svg`):** حداقل ابعاد نمایش ۳۶×۳۶ پیکسل.
* **نسخه ساده‌شده و مونوکروم (`favicon.svg` / `monochrome.svg` / `ic_notification.svg`):** طراحی‌شده برای ابعاد ۱۶×۱۶ تا ۲۴×۲۴ پیکسل.
* **حریم امن استاندارد (`symbol.svg`):** حداقل ۴٪ از کل عرض آرت‌بورد در هر طرف.
* **آیکون‌های وب (`icon-192x192.png` و `icon-512x512.png`):** حاشیه امن ۶٪ در هر چهار طرف.
* **آیکون Maskable PWA (`icon-maskable-512x512.png`):** کل نماد در دایره مرکزی به قطر ۸۰٪ (۴۱۰ پیکسل از ۵۱۲ پیکسل) قرار دارد.
* **آیکون Adaptive اندروید (`ic_launcher_foreground.png`):** کل نماد در دایره امن مرکزی به قطر ۶۱٪ (۶۶dp از بوم ۱۰۸dp) قرار گرفته است.
* **پروفایل اینستاگرام (`instagram-profile-1080.png`):** نماد در دایره مرکزی به قطر ۹۰۰ پیکسل از بوم ۱۰۸۰×۱۰۸۰ قرار دارد.
* **کاور هایلایت استوری (`highlight-cover-1080x1920.png`):** نماد در دایره مرکزی به قطر ۶۰۰ پیکسل در مرکز بوم ۱۰۸۰×۱۹۲۰ قرار دارد.
