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
        // apps/web's own routes already answer in Persian: {"error": "…"}
        val webError = (body?.error as? JsonPrimitive)?.content?.takeIf { e -> e.any { it in '\u0600'..'\u06FF' } }
        when {
            webError != null -> webError
            message != null && PERSIAN.containsKey(message) -> PERSIAN.getValue(message)
            error.code() == 429 -> "چند لحظه صبر کنید و دوباره تلاش کنید"
            else -> fallback
        }
    }
    else -> fallback
}
