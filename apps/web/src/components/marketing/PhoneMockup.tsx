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
    <div className="relative mx-auto w-full max-w-sm">
      <div className="rounded-[2.5rem] border-8 border-[#2a1d26] bg-white p-4 shadow-xl">
        <div className="flex items-center gap-3 border-b border-black/5 pb-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f0e8] font-bold text-[#2a1d26]">س</span>
          <div>
            <p className="font-bold text-[#2a1d26]">[نام سالن]</p>
            <p className="text-xs text-gray-500">[آدرس سالن]</p>
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-[#f7f0e8] px-3 py-2 text-sm font-medium text-[#2a1d26]">۶۰ دقیقه</div>

        <div className="mt-3 flex justify-between gap-1.5">
          {DAYS.map((d) => (
            <div
              key={d.label}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-xs ${
                d.selected ? "bg-[#2a1d26] text-white" : d.muted ? "bg-[#f7f0e8] text-gray-400" : "bg-[#f7f0e8] text-[#2a1d26]"
              }`}
            >
              <span>{d.label}</span>
              <span className="font-bold">{d.day}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm font-bold text-[#2a1d26]">ساعت‌های خالی</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {SLOTS.map((s) => (
            <span
              key={s.time}
              className={`rounded-lg py-2 text-center text-sm ${
                s.selected
                  ? "bg-[#a34a30] text-white"
                  : s.disabled
                  ? "bg-[#f7f0e8] text-gray-300 line-through"
                  : "bg-[#f7f0e8] text-[#2a1d26]"
              }`}
            >
              {s.time}
            </span>
          ))}
        </div>

        <div className="mt-4 rounded-xl bg-[#2a1d26] py-2.5 text-center text-sm font-bold text-white">
          تأیید نوبت — یکشنبه ۵ مهر، ۱۱:۳۰
        </div>
      </div>

      <div className="absolute -end-6 top-16 hidden max-w-[220px] rounded-xl bg-white p-3 text-xs shadow-lg sm:block">
        <div className="mb-1 flex items-center gap-1.5 font-bold text-[#2a1d26]">
          <MessageSquare className="h-3.5 w-3.5 text-[#a34a30]" aria-hidden />
          پیامک یادآوری
        </div>
        <p className="text-gray-500">نوبت شما فردا ساعت ۱۱:۳۰ در [نام سالن] است.</p>
      </div>

      <div className="absolute -start-6 bottom-24 hidden max-w-[180px] rounded-xl bg-white p-3 text-xs shadow-lg sm:block">
        <div className="mb-1 flex items-center gap-1.5 font-bold text-[#2a1d26]">
          <CreditCard className="h-3.5 w-3.5 text-[#a34a30]" aria-hidden />
          بیعانه پرداخت شد
        </div>
        <p className="text-gray-500">[مبلغ] تومان</p>
      </div>
    </div>
  );
}
