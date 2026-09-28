// apps/api answers in English (it also serves the Android apps and logs). Everything shown to a
// user goes through here so they always get Persian. Keep in sync with the API's messages.

const BY_API_MESSAGE: Record<string, string> = {
  "This time slot is no longer available": "این زمان همین حالا پر شد؛ لطفاً زمان دیگری انتخاب کنید",
  "This time is in the past": "این زمان گذشته است؛ لطفاً زمان دیگری انتخاب کنید",
  "Salon not found": "این سالن در حال حاضر نوبت نمی‌پذیرد",
  "This stylist can't perform all the selected services": "این متخصص همه خدمات انتخاب‌شده را انجام نمی‌دهد",
  "No stylist can perform all the selected services": "هیچ متخصصی همه این خدمات را با هم انجام نمی‌دهد",
  "One or more services were not found for this salon": "برخی از خدمات انتخاب‌شده دیگر ارائه نمی‌شوند",
  "Category does not belong to this salon": "دسته‌بندی انتخاب‌شده معتبر نیست",
  "Gallery is full": "گالری پر است؛ برای افزودن، ابتدا چند عکس را حذف کنید",
  "Stylist does not belong to this salon": "آرایشگر انتخاب‌شده در این سالن نیست",
  "Invalid image URL": "فایل تصویر معتبر نیست؛ دوباره آپلود کنید",
  "Image not found": "این عکس دیگر وجود ندارد",
  "Not your image": "اجازه تغییر این عکس را ندارید",
  "This appointment has already been reviewed": "برای این نوبت قبلاً نظر ثبت کرده‌اید",
  "You can only review a completed appointment": "فقط برای نوبت‌های انجام‌شده می‌توانید نظر بدهید",
  "A review needs a rating or a comment": "امتیاز بدهید یا چند کلمه بنویسید",
  "Invalid phone number": "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد",
  "Could not send the verification code": "ارسال پیامک کد تایید ممکن نشد؛ چند دقیقه بعد دوباره تلاش کنید",
  "This phone number belongs to a staff account": "این شماره متعلق به حساب آرایشگر یا مدیر سالن است",
  "Your stylist account is inactive": "حساب آرایشگری شما غیرفعال است",
  "This appointment can no longer be edited": "این نوبت بسته شده و دیگر قابل ویرایش نیست",
  "Not your appointment": "این نوبت متعلق به شما نیست",
  "Customer name is required for a new customer": "برای مشتری جدید، نام را وارد کنید",
  "Only a completed appointment has an amount to correct": "فقط مبلغ نوبت‌های انجام‌شده قابل اصلاح است",
  "Invalid period": "بازه زمانی معتبر نیست",
  "Payout not found": "این پرداخت دیگر وجود ندارد",
  "Expense not found": "این هزینه دیگر وجود ندارد",
  "Invalid link URL": "لینک باید با http:// یا https:// شروع شود",
  "Invalid or expired link": "این لینک دیگر معتبر نیست؛ از مدیر سالن بخواهید لینک تازه‌ای برایتان بفرستد",
  "Upload a banner image before turning it on": "برای نمایش بنر، ابتدا تصویر آن را آپلود کنید",
  "Plan name is required (max 40 characters)": "نام پلن را وارد کنید (حداکثر ۴۰ حرف)",
  "Description is too long": "توضیح کوتاه‌تر باشد (حداکثر ۱۶۰ حرف)",
  "Invalid price": "قیمت معتبر نیست",
  "Invalid stylist limit": "تعداد آرایشگر باید حداقل ۱ باشد یا خالی بماند",
  "Invalid SMS count": "تعداد پیامک معتبر نیست",
  "Too many or too long features": "حداکثر ۱۲ ویژگی، هر کدام تا ۱۲۰ حرف",
  "Button text is required (max 30 characters)": "متن دکمه را وارد کنید (حداکثر ۳۰ حرف)",
  "Button link must be a site path (/…) or an http(s) URL": "لینک دکمه باید مسیری از سایت (با / شروع شود) یا آدرس http(s) باشد",
  "Trial days must be 0–365": "دوره آزمایشی باید بین ۰ تا ۳۶۵ روز باشد",
  "Only active salons can be featured": "فقط سالن‌های فعال را می‌توان منتخب کرد",
  "Only active stylists of active salons can be featured": "فقط آرایشگرهای فعالِ سالن‌های فعال را می‌توان منتخب کرد",
  "Each one can be featured only once": "هر مورد فقط یک بار قابل انتخاب است",
  "At most three can be featured": "حداکثر سه مورد را می‌توان منتخب کرد",
  "Notification not found": "این اعلان دیگر وجود ندارد",
  "Review not found": "این نظر دیگر وجود ندارد",
  "Not your review": "اجازه تایید یا رد این نظر را ندارید",
  "Unknown province": "استان انتخاب‌شده معتبر نیست",
  "This city is not in the selected province": "شهر انتخاب‌شده در این استان نیست؛ دوباره انتخاب کنید",
  "Send both latitude and longitude": "محل سالن را روی نقشه مشخص کنید",
  "The map pin must be inside Iran": "پین نقشه باید داخل ایران باشد",
  "Send both lat and lng": "موقعیت شما کامل دریافت نشد؛ دوباره تلاش کنید",
  "Distance search needs lat and lng": "برای جستجوی نزدیک‌ترین سالن، موقعیت شما لازم است",
  "Choose a day within the next two months": "روزی در دو ماه آینده انتخاب کنید",
  "Stylist not found": "این آرایشگر دیگر در سالن فعال نیست",
  "Waitlist entry not found": "این درخواست انتظار دیگر وجود ندارد",
};

/** Persian message for an error thrown by apiFetch / salonApiFetch (anything with status + message). */
export function persianApiError(err: unknown, fallback = "خطایی رخ داد، دوباره تلاش کنید"): string {
  if (typeof err !== "object" || err === null) return fallback;
  const { status, message } = err as { status?: number; message?: string };
  if (message && BY_API_MESSAGE[message]) return BY_API_MESSAGE[message];
  if (status === 401) return "نشست شما منقضی شده؛ لطفاً دوباره وارد شوید";
  if (status === 403) return "اجازه انجام این کار را ندارید";
  if (status === 400 && message) {
    // class-validator messages, e.g. "email must be an email"
    const m = message.toLowerCase();
    if (m.includes("email")) return "ایمیل وارد شده معتبر نیست";
    if (m.includes("phone")) return "شماره موبایل وارد شده معتبر نیست";
    if (m.includes("password")) return "رمز عبور وارد شده معتبر نیست";
    return "اطلاعات وارد شده معتبر نیست";
  }
  return fallback;
}
