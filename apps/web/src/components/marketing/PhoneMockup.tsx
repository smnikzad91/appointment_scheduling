import { MessageSquare, CreditCard } from "lucide-react";

const DAYS = [
  { label: "شنبه", day: "۴", selected: false },
  { label: "یکشنبه", day: "۵", selected: true },
  { label: "دوشنبه", day: "۶", selected: false },
  { label: "سه‌شنبه", day: "۷", selected: false },
  { label: "جمعه", day: "۱۰", selected: false, muted: true },
];

const SLOTS = [
  { time: "۱۰:۰۰", disabled: false },
  { time: "۱۰:۳۰", disabled: false },
  { time: "۱۱:۰۰", disabled: true },
  { time: "۱۱:۳۰", disabled: false, selected: true },
  { time: "۱۲:۰۰", disabled: false },
  { time: "۱۶:۰۰", disabled: false },
];

export default function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      {/* glow behind the phone */}
      <div aria-hidden className="absolute inset-8 rounded-full bg-[radial-gradient(circle,rgb(242_135_106/0.45),transparent_70%)]" />

      <div className="g-glass g-glow-border relative rounded-[2.6rem] p-2.5">
        <div className="rounded-[2.1rem] bg-[#130e16]/90 p-4">
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/10" />
          <div className="flex items-center gap-3 border-b border-g-line pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--g-gradient)] font-black text-[#1a0f14]">س</span>
            <div>
              <p className="font-bold text-g-ink">سالن زیبایی رزا</p>
              <p className="text-xs text-g-faint">تهران، سعادت‌آباد</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm font-medium text-g-muted">رنگ و لایت مو — ۶۰ دقیقه</div>

          <div className="mt-3 flex justify-between gap-1.5">
            {DAYS.map((d) => (
              <div
                key={d.label}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] ${
                  d.selected
                    ? "bg-[image:var(--g-gradient)] font-bold text-[#1a0f14] shadow-[0_6px_18px_-6px_rgb(242_135_106/0.9)]"
                    : d.muted
                    ? "bg-white/[0.03] text-g-faint/60"
                    : "bg-white/5 text-g-muted"
                }`}
              >
                <span>{d.label}</span>
                <span className="text-sm font-bold">{d.day}</span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm font-bold text-g-ink">ساعت‌های خالی</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SLOTS.map((s) => (
              <span
                key={s.time}
                className={`rounded-xl py-2 text-center text-sm ${
                  s.selected
                    ? "border border-g-accent/70 bg-g-accent/15 font-bold text-g-accent"
                    : s.disabled
                    ? "bg-white/[0.03] text-g-faint/50 line-through"
                    : "bg-white/5 text-g-muted"
                }`}
              >
                {s.time}
              </span>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-[image:var(--g-gradient)] py-3 text-center text-sm font-black text-[#1a0f14]">
            تأیید نوبت — یکشنبه ۵ مهر، ۱۱:۳۰
          </div>
        </div>
      </div>

      <div
        className="g-glass absolute -end-20 top-6 hidden max-w-[200px] rounded-2xl p-3 text-xs lg:block"
        style={{ animation: "float 6s ease-in-out infinite" }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-bold text-g-ink">
          <MessageSquare className="h-3.5 w-3.5 text-g-accent" aria-hidden />
          پیامک یادآوری
        </div>
        <p className="leading-5 text-g-faint">نوبت شما فردا ساعت ۱۱:۳۰ در سالن رزا است.</p>
      </div>

      <div
        className="g-glass absolute -start-20 bottom-10 hidden max-w-[170px] rounded-2xl p-3 text-xs lg:block"
        style={{ animation: "float 7s ease-in-out 1.2s infinite" }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-bold text-g-ink">
          <CreditCard className="h-3.5 w-3.5 text-g-success" aria-hidden />
          بیعانه پرداخت شد
        </div>
        <p className="text-g-faint">۲۰۰٬۰۰۰ تومان</p>
      </div>
    </div>
  );
}
