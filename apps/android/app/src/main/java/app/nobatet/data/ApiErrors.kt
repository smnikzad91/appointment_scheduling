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
)

fun persianError(error: Throwable, fallback: String, json: Json): String = when (error) {
    is IOException -> "اتصال به اینترنت برقرار نیست؛ دوباره تلاش کنید"
    is HttpException -> {
        val message = runCatching {
            val body = error.response()?.errorBody()?.string().orEmpty()
            when (val m = json.decodeFromString(ApiErrorBody.serializer(), body).message) {
                is JsonPrimitive -> m.content
                is JsonArray -> (m.firstOrNull() as? JsonPrimitive)?.content
                else -> null
            }
        }.getOrNull()
        when {
            message != null && PERSIAN.containsKey(message) -> PERSIAN.getValue(message)
            error.code() == 429 -> "چند لحظه صبر کنید و دوباره تلاش کنید"
            else -> fallback
        }
    }
    else -> fallback
}
