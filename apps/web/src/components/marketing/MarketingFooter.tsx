import Link from "next/link";
import GuestLogo from "@/components/guest/GuestLogo";

const COLUMNS = [
  {
    title: "محصول",
    links: [
      { label: "امکانات", href: "/#features" },
      { label: "تعرفه‌ها", href: "/#pricing" },
      { label: "اپلیکیشن‌ها", href: "/#apps" },
    ],
  },
  {
    title: "پشتیبانی",
    links: [
      { label: "سؤالات متداول", href: "/#faq" },
      { label: "مرکز راهنما", href: "/tutorials" },
      { label: "سؤالات متداول سالن‌ها", href: "/faq" },
      { label: "تماس با ما", href: "/contact" },
    ],
  },
  {
    title: "حقوقی",
    links: [
      { label: "قوانین و مقررات", href: "/terms" },
      { label: "حریم خصوصی", href: "/privacy" },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-g-line bg-g-bg/70 py-14 text-g-ink backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="order-last lg:order-first">
            <GuestLogo />
            <p className="mt-2 text-sm text-g-faint">سامانه نوبت‌دهی آنلاین برای سالن‌های زیبایی.</p>
            <div className="mt-4 inline-flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-g-line-strong text-xs text-g-faint">
              [نماد اعتماد]
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-bold">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-g-muted">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-g-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-g-line pt-6 text-center text-sm text-g-faint">
          © ۱۴۰۵ نوبتا — تمامی حقوق محفوظ است.
        </div>
      </div>
    </footer>
  );
}
