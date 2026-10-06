package app.nobatet.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import retrofit2.HttpException
import java.io.IOException

/**
 * apps/api answers in English; users only ever see Persian. Same idea as apps/web's
 * persianApiError (src/lib/api/errorMessages.ts) — add messages here as screens need them.
 */
private val PERSIAN = mapOf(
    "Invalid credentials" to "شماره موبایل/ایمیل یا رمز عبور درست نیست",
    "Account not found" to "این حساب دیگر وجود ندارد؛ دوباره وارد شوید",
    "No account with this phone number" to "حسابی با این شماره موبایل وجود ندارد",
    "Staff accounts sign in with their password" to "این شماره متعلق به حساب مدیر یا آرایشگر است؛ از صفحه ورود با رمز عبور وارد شوید",
    "Invalid or expired code" to "کد وارد شده صحیح نیست یا منقضی شده است",
    "Could not send the verification code" to "ارسال پیامک کد تایید ممکن نشد؛ چند دقیقه بعد دوباره تلاش کنید",
    "This time slot is no longer available" to "این زمان همین حالا پر شد؛ لطفاً زمان دیگری انتخاب کنید",
    "This time is in the past" to "این زمان گذشته است؛ لطفاً زمان دیگری انتخاب کنید",
    "Salon not found" to "این سالن در حال حاضر نوبت نمی‌پذیرد",
    "One or more services were not found for this salon" to "برخی از خدمات انتخاب‌شده دیگر ارائه نمی‌شوند",
    "Choose where the appointment takes place" to "محل انجام نوبت را انتخاب کنید",
    "This stylist doesn't work at that place" to "این آرایشگر در این محل خدمت نمی‌دهد",
    "Enter the address for the home visit" to "نشانی محل خدمت در منزل را وارد کنید",
    "Customers may only cancel their own appointment" to "فقط نوبت‌های خودتان را می‌توانید لغو کنید",
    "This appointment can no longer be cancelled" to "این نوبت دیگر قابل لغو نیست",
    "Database unavailable" to "سرویس موقتاً در دسترس نیست؛ چند دقیقه دیگر تلاش کنید",
    "A review needs a rating or a comment" to "امتیاز بدهید یا چند کلمه بنویسید",
    "Choose a day within the next two months" to "روزی در دو ماه آینده انتخاب کنید",
    "This appointment has already been reviewed" to "برای این نوبت قبلاً نظر ثبت کرده‌اید",
    "You can only review a completed appointment" to "فقط برای نوبت‌های انجام‌شده می‌توانید نظر بدهید",
    "Review an independent stylist once, as their business" to "برای آرایشگر مستقل یک نظر کافی است",
    "Waitlist entry not found" to "این درخواست انتظار دیگر وجود ندارد",
    "Phone number already registered" to "با این شماره موبایل قبلاً حساب ساخته شده است؛ وارد شوید",
    "Email already registered" to "با این ایمیل قبلاً حساب ساخته شده است",
    "Each dayOfWeek can only appear once" to "هر روز هفته فقط یک بار می‌تواند در ساعت کاری بیاید",
    "Expense date is too old" to "هزینه‌ها را فقط تا یک سال گذشته می‌توانید ثبت کنید",
    "Gallery is full" to "گالری پر است؛ برای افزودن، ابتدا چند عکس را حذف کنید",
    "startAt must be before endAt" to "زمان شروع باید قبل از زمان پایان باشد",
    "You don't offer this service" to "این خدمت در فهرست خدمات شما نیست",
    "This appointment can no longer be edited" to "این نوبت بسته شده و دیگر قابل ویرایش نیست",
    "Your stylist account is inactive" to "حساب آرایشگری شما غیرفعال است",
    "Invalid phone number" to "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد",
    "Image not found" to "این عکس دیگر وجود ندارد",
    "Not your image" to "اجازه تغییر این عکس را ندارید",
    "Time off not found" to "این مرخصی دیگر وجود ندارد",
    "Expense not found" to "این هزینه دیگر وجود ندارد",
    "Invalid period" to "بازه زمانی معتبر نیست",
    "Period is too long" to "بازه انتخاب‌شده خیلی طولانی است؛ بازه کوتاه‌تری انتخاب کنید",
    "Customer name is required for a new customer" to "برای مشتری جدید، نام را وارد کنید",
    "This phone number belongs to a staff account" to "این شماره متعلق به حساب آرایشگر یا مدیر سالن است",
    "This stylist can't perform all the selected services" to "این متخصص همه خدمات انتخاب‌شده را انجام نمی‌دهد",
    "Not allowed to update this appointment" to "اجازه تغییر این نوبت را ندارید",
    "Not your appointment" to "این نوبت متعلق به شما نیست",
    "This handle is taken" to "این نام کاربری قبلاً گرفته شده است؛ نام دیگری انتخاب کنید",
    "This handle is reserved" to "این نام کاربری رزرو شده است؛ نام دیگری انتخاب کنید",
    "Category does not belong to this salon" to "دسته‌بندی انتخاب‌شده معتبر نیست",
    "Only a completed appointment has an amount to correct" to "فقط مبلغ نوبت‌های انجام‌شده قابل اصلاح است",
    "Payout not found" to "این پرداخت دیگر وجود ندارد",
    "Service not found" to "این خدمت دیگر وجود ندارد",
    "Stylist does not belong to this salon" to "آرایشگر انتخاب‌شده در این سالن نیست",
    "Your plan's stylist limit is reached" to "ظرفیت آرایشگر پلن شما پر است؛ برای افزودن، یک آرایشگر را غیرفعال کنید یا پلن را ارتقا دهید",
    "Your subscription has expired" to "اشتراک سالن به پایان رسیده است؛ برای تمدید با پشتیبانی تماس بگیرید",
    "You don't own a salon yet" to "هنوز سالنی برای این حساب ثبت نشده است",
    "An independent stylist works alone and can't add stylists" to "آرایشگر مستقل نمی‌تواند آرایشگر دیگری اضافه کند",
    "Your own stylist profile can't be deactivated or given a commission" to "پروفایل آرایشگری خودتان را نمی‌توانید غیرفعال کنید یا برایش سهم تعیین کنید",
    "This is your own account" to "این حساب خود شماست",
    "This phone number belongs to an existing account that isn't a stylist" to "این شماره متعلق به حسابی است که آرایشگر نیست؛ شماره دیگری وارد کنید",
    "Unknown province" to "استان انتخاب‌شده معتبر نیست",
    "This city is not in the selected province" to "شهر انتخاب‌شده در این استان نیست؛ دوباره انتخاب کنید",
    "Send both latitude and longitude" to "محل سالن را روی نقشه مشخص کنید",
    "The map pin must be inside Iran" to "پین نقشه باید داخل ایران باشد",
    "Choose where you work" to "محل ارائه خدمات را انتخاب کنید",
    "Invalid handle" to "نام کاربری باید ۳ تا ۳۰ حرف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط باشد و با حرف یا عدد شروع و تمام شود",
    "Enter the bank transfer's tracking code" to "کد پیگیری واریز بانکی را وارد کنید",
    "This request is no longer pending" to "این درخواست دیگر در انتظار نیست",
    "You can't pay yourself" to "نمی‌توانید به خودتان پرداخت کنید",
    "A wallet payout can't be deleted" to "پرداخت از کیف پول حذف‌شدنی نیست؛ مبلغ واقعاً منتقل شده است",
    "Not enough wallet balance for this payout" to "موجودی کیف پول شما برای این پرداخت کافی نیست",
    "This plan's price is arranged with the platform" to "قیمت این پلن توافقی است؛ با پشتیبانی تماس بگیرید",
    "Your plan has no end date" to "پلن شما تاریخ پایان ندارد و تمدید لازم نیست",
    "Not enough wallet balance for this plan" to "موجودی کیف پول برای خرید این پلن کافی نیست",
    "This account has no phone number" to "برای این حساب شماره موبایلی ثبت نشده است؛ از مدیر سالن بخواهید آن را اضافه کند",
    "Enter the 5-digit code sent to your phone" to "کد ۵ رقمی پیامک‌شده به موبایلتان را وارد کنید",
    "Nothing to pay for this appointment" to "برای این نوبت مبلغی برای پرداخت نیست",
    "Already paid" to "این مبلغ قبلاً پرداخت شده است",
    "Not enough wallet balance to pay the rest" to "موجودی کیف پول برای پرداخت باقی‌مانده کافی نیست",
    "Not enough wallet balance for the pre-payment" to "موجودی کیف پول برای پیش‌پرداخت این نوبت کافی نیست",
    "A cancelled prepaid booking can't be reopened" to "این نوبت لغو و پیش‌پرداختش به مشتری برگشته است؛ نوبت تازه ثبت کنید",
    "This appointment just changed — reload and try again" to "این نوبت همین حالا تغییر کرد؛ صفحه را تازه کنید و دوباره امتحان کنید",
    "No stylist can perform all the selected services" to "هیچ متخصصی همه این خدمات را با هم انجام نمی‌دهد",
    "Invalid image URL" to "فایل تصویر معتبر نیست؛ دوباره آپلود کنید",
    "Invalid link URL" to "لینک باید با http:// یا https:// شروع شود",
    "Invalid or expired link" to "این لینک دیگر معتبر نیست؛ از مدیر سالن بخواهید لینک تازه‌ای برایتان بفرستد",
    "Upload a banner image before turning it on" to "برای نمایش بنر، ابتدا تصویر آن را آپلود کنید",
    "Too many code requests, try again later" to "درخواست کد بیش از حد مجاز است؛ یک دقیقه بعد دوباره تلاش کنید",
    "This plan is no longer available" to "این پلن دیگر در دسترس نیست؛ پلن دیگری انتخاب کنید",
    "This plan is used by salons — hide it instead of deleting" to "سالن‌هایی روی این پلن هستند؛ به‌جای حذف، آن را پنهان کنید",
    "Plan name is required (max 40 characters)" to "نام پلن را وارد کنید (حداکثر ۴۰ حرف)",
    "Description is too long" to "توضیح کوتاه‌تر باشد (حداکثر ۱۶۰ حرف)",
    "Invalid price" to "قیمت معتبر نیست",
    "Invalid stylist limit" to "تعداد آرایشگر باید حداقل ۱ باشد یا خالی بماند",
    "Invalid SMS count" to "تعداد پیامک معتبر نیست",
    "Too many or too long features" to "حداکثر ۱۲ ویژگی، هر کدام تا ۱۲۰ حرف",
    "Button text is required (max 30 characters)" to "متن دکمه را وارد کنید (حداکثر ۳۰ حرف)",
    "Button link must be a site path (/…) or an http(s) URL" to "لینک دکمه باید مسیری از سایت (با / شروع شود) یا آدرس http(s) باشد",
    "Trial days must be 0–365" to "دوره آزمایشی باید بین ۰ تا ۳۶۵ روز باشد",
    "Only active salons can be featured" to "فقط سالن‌های فعال را می‌توان منتخب کرد",
    "Only active stylists of active salons can be featured" to "فقط آرایشگرهای فعالِ سالن‌های فعال را می‌توان منتخب کرد",
    "Each one can be featured only once" to "هر مورد فقط یک بار قابل انتخاب است",
    "At most three can be featured" to "حداکثر سه مورد را می‌توان منتخب کرد",
    "Notification not found" to "این اعلان دیگر وجود ندارد",
    "Review not found" to "این نظر دیگر وجود ندارد",
    "Not your review" to "اجازه تایید یا رد این نظر را ندارید",
    "Send both lat and lng" to "موقعیت شما کامل دریافت نشد؛ دوباره تلاش کنید",
    "Distance search needs lat and lng" to "برای جستجوی نزدیک‌ترین سالن، موقعیت شما لازم است",
    "Stylist not found" to "این آرایشگر دیگر در سالن فعال نیست",
    "Stylist profile not found" to "پروفایل آرایشگری برای این حساب پیدا نشد؛ با مدیر سالن تماس بگیرید",
    "No stylist profile for this account" to "پروفایل آرایشگری برای این حساب پیدا نشد؛ با مدیر سالن تماس بگیرید",
    "Appointment not found" to "این نوبت دیگر وجود ندارد",
    "Not your salon" to "این مورد مربوط به سالن شما نیست",
    "Insufficient role" to "اجازه انجام این کار را ندارید",
    "Only the salon owner can change who a piece is credited to" to "فقط مدیر سالن می‌تواند سازنده نمونه‌کار را تغییر دهد",
    "Invalid status filter" to "فیلتر وضعیت معتبر نیست",
    "Category not found" to "این دسته‌بندی دیگر وجود ندارد",
    "One or more services don't belong to this salon" to "برخی از خدمات انتخاب‌شده مربوط به این سالن نیستند",
    "Not your time off" to "این مرخصی مربوط به شما نیست",
    "Link not found" to "این لینک معتبر نیست یا منقضی شده است",
)

fun persianError(error: Throwable, fallback: String, json: Json): String = when (error) {
    is IOException -> "اتصال به اینترنت برقرار نیست؛ دوباره تلاش کنید"
    is HttpException -> {
        val body = runCatching { json.decodeFromString(ApiErrorBody.serializer(), error.response()?.errorBody()?.string().orEmpty()) }.getOrNull()
        val message = when (val m = body?.message) {
            is JsonPrimitive -> m.content
            is JsonArray -> (m.firstOrNull() as? JsonPrimitive)?.content
            else -> null
        }
        // apps/web's own routes: {"error": "…"} — mostly Persian already; the wallet's English ones are translated
        val rawWebError = (body?.error as? JsonPrimitive)?.content
        val webError = rawWebError?.let { e -> PERSIAN[e] ?: e.takeIf { s -> s.any { it in '\u0600'..'\u06FF' } } }
        when {
            webError != null -> webError
            message != null && PERSIAN.containsKey(message) -> PERSIAN.getValue(message)
            error.code() == 429 -> "چند لحظه صبر کنید و دوباره تلاش کنید"
            else -> fallback
        }
    }
    else -> fallback
}
