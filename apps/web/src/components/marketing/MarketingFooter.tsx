import Link from "next/link";

const COLUMNS = [
  {
    title: "محصول",
    links: [
      { label: "امکانات", href: "#features" },
      { label: "تعرفه‌ها", href: "#pricing" },
      { label: "اپلیکیشن‌ها", href: "#apps" },
    ],
  },
  {
    title: "پشتیبانی",
    links: [
      { label: "سؤالات متداول", href: "#faq" },
      { label: "راهنمای سالن‌ها", href: "/faq" },
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
    <footer className="bg-[#2a1d26] py-14 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="order-last lg:order-first">
            <p className="text-lg font-bold">نوبتا</p>
            <p className="mt-2 text-sm text-gray-400">سامانه نوبت‌دهی آنلاین برای سالن‌های زیبایی.</p>
            <div className="mt-4 inline-flex h-16 w-28 items-center justify-center rounded-lg border border-dashed border-white/20 text-xs text-gray-500">
              [نماد اعتماد]
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-bold">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-gray-500">
          © ۱۴۰۵ نوبتا — تمامی حقوق محفوظ است.
        </div>
      </div>
    </footer>
  );
}
