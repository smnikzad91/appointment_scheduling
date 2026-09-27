const APPS = [
  {
    title: "اپ آرایشگر",
    description: "برنامه روزانه سالن، اعلان نوبت جدید، تنظیم ساعت کاری و مرخصی، و مشاهده سابقه مشتری پیش از شروع کار.",
  },
  {
    title: "اپ مشتری",
    description: "جست‌وجوی خدمت و آرایشگر، رزرو و پرداخت بیعانه، تغییر یا لغو نوبت و ثبت نظر بعد از هر مراجعه.",
  },
];

export default function AndroidApps() {
  return (
    <section id="apps" className="bg-[#f7f0e8] pb-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-3xl bg-[#2a1d26] px-6 py-14 text-center sm:px-14">
          <span className="text-sm font-bold text-[#c98872]">اپلیکیشن‌های اندروید</span>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">دو اپ، یک سامانه</h2>
          <p className="mt-4 text-gray-300">برای مشتری که نوبت می‌گیرد و برای آرایشگری که نوبت را انجام می‌دهد.</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {APPS.map((app) => (
              <div key={app.title} className="rounded-2xl bg-white/5 p-8 text-start">
                <h3 className="text-lg font-bold text-white">{app.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-300">{app.description}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#2a1d26]">دریافت از کافه‌بازار</span>
                  <span className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold text-white">دریافت از مایکت</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
