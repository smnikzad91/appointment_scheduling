import { CalendarCheck, CircleCheck, BellRing } from "lucide-react";
import Sep from "@/components/common/Sep";
import GuestLogo from "@/components/guest/GuestLogo";
import { rise } from "@/components/guest/motion";

const SIGNALS = [
  { icon: CalendarCheck, tone: "text-g-success", title: "نوبت جدید رزرو شد", note: "کوتاهی و براشینگ — شنبه ۱۰:۳۰", who: "سالن رز — مژگان" },
  { icon: CircleCheck, tone: "text-g-accent", title: "نوبت تأیید شد", note: "رنگ مو — یکشنبه ۱۴:۰۰", who: "سالن رز — نگار" },
  { icon: BellRing, tone: "text-g-accent-3", title: "پیامک یادآوری ارسال شد", note: "مانیکور — فردا ۱۷:۰۰", who: "سالن رز — سمیرا" },
];

/** Desktop-only side of the auth screens: brand, one line of pitch, live-looking booking feed. */
export default function AuthBrandPanel() {
  return (
    <aside className="hidden w-[44%] shrink-0 flex-col justify-center py-10 lg:flex">
      <GuestLogo className="g-rise mb-12 self-start" />
      <h2 className="g-rise text-4xl font-black leading-[1.35] text-g-ink" style={rise(1)}>
        نوبت‌های سالن،
        <br />
        <span className="g-gradient-text">همیشه در دسترس</span>
      </h2>
      <p className="g-rise mt-4 max-w-sm text-[15px] leading-8 text-g-muted" style={rise(2)}>
        مشتری‌ها آنلاین نوبت می‌گیرند و شما و آرایشگرها هر رزرو را در لحظه می‌بینید.
      </p>

      <ul className="mt-10 flex max-w-sm flex-col gap-3">
        {SIGNALS.map((s, i) => (
          <li
            key={s.title}
            className="g-glass-soft g-rise flex items-center gap-3 rounded-2xl p-4"
            style={{ ...rise(3 + i), marginInlineStart: `${i * 20}px` }}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${s.tone}`}>
              <s.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-g-ink">{s.title}</span>
              <span className="block truncate text-xs text-g-faint">
                {s.who}
                <Sep />
                {s.note}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="g-rise mt-12 grid max-w-sm grid-cols-3 gap-4 border-t border-g-line pt-6" style={rise(7)}>
        {[["۲۴/۷", "رزرو آنلاین"], ["پیامک", "یادآوری نوبت"], ["بیعانه", "پرداخت آنلاین"]].map(([n, l]) => (
          <div key={l}>
            <dt className="text-lg font-black text-g-ink">{n}</dt>
            <dd className="mt-0.5 text-xs text-g-faint">{l}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
