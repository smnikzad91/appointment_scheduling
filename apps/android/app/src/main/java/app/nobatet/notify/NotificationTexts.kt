package app.nobatet.notify

import app.nobatet.data.AppNotification
import app.nobatet.util.formatToman
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.toSalonDateTime
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import java.time.Instant
import java.time.LocalDate

/** Whose panel the notification is read in (apps/web NotificationBell's Scope). */
enum class NotificationScope { CUSTOMER, STYLIST, SALON }

/** Where tapping it goes. */
enum class NotificationTarget { APPOINTMENTS, REVIEWS, EARNINGS, SALON_PAGE, WALLET }

data class NotificationText(val title: String, val detail: String?, val target: NotificationTarget, val salonSlug: String? = null)

private fun AppNotification.str(key: String): String? = (data[key] as? JsonPrimitive)?.takeIf { it.isString }?.content
private fun AppNotification.bool(key: String): Boolean = (data[key] as? JsonPrimitive)?.content == "true"

private val PAYOUT_METHOD = mapOf("CASH" to "نقدی", "CARD_TO_CARD" to "کارت به کارت", "BANK_TRANSFER" to "واریز بانکی", "OTHER" to "سایر", "WALLET" to "کیف پول")

/** How each notification reads — apps/web components/app/NotificationBell.tsx describe(), all three scopes. */
fun describe(n: AppNotification, scope: NotificationScope): NotificationText {
    val salon = n.str("salonName") ?: "سالن"
    val customer = n.str("customerName") ?: ""
    val stylist = n.str("stylistName") ?: ""
    val services = (n.data["services"] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.content }.orEmpty()
    val when_ = n.str("startAt")?.let { runCatching { Instant.parse(it).toSalonDateTime(null).persianDateTime() }.getOrNull() }
    val bookingDetail = listOfNotNull(when_, services.takeIf { it.isNotEmpty() }?.joinToString("، ")).joinToString(" — ").ifEmpty { null }
    val appointments = NotificationTarget.APPOINTMENTS
    return when (n.type) {
        "NEW_REVIEW" -> {
            val about = if (n.str("target") == "SALON") (if (n.bool("independent")) "شما" else "سالن") else if (scope == NotificationScope.STYLIST) "شما" else stylist.ifEmpty { "آرایشگر" }
            NotificationText(if (n.bool("edited")) "$customer نظرش درباره $about را ویرایش کرد" else "نظر تازه از $customer درباره $about", n.str("excerpt"), NotificationTarget.REVIEWS)
        }
        "NEW_BOOKING" -> NotificationText(
            when (scope) {
                NotificationScope.CUSTOMER -> "$salon برای شما نوبتی با $stylist ثبت کرد"
                NotificationScope.STYLIST -> if (n.bool("bySalon")) "سالن برای $customer نوبتی با شما ثبت کرد" else "$customer با شما نوبت گرفت"
                NotificationScope.SALON -> "نوبت تازه: $customer با $stylist"
            },
            bookingDetail, appointments,
        )
        "BOOKING_CANCELLED" -> {
            val by = n.str("cancelledBy")
            val title = if (by == "SYSTEM") {
                // an online booking nobody confirmed, cancelled a day after its time; pre-payment refunded
                if (scope == NotificationScope.CUSTOMER) "نوبت شما در $salon تایید نشد؛ پیش‌پرداخت به کیف پولتان برگشت"
                else "${if (scope == NotificationScope.STYLIST) "نوبت $customer" else "نوبت $customer با $stylist"} تایید نشد و خودکار لغو شد"
            } else if (scope == NotificationScope.CUSTOMER) {
                if (by == "STYLIST") "$stylist نوبت شما در $salon را لغو کرد" else "$salon نوبت شما را لغو کرد"
            } else {
                val who = when (by) { "CUSTOMER" -> customer; "STYLIST" -> stylist; else -> "سالن" }
                val whose = if (scope == NotificationScope.STYLIST) "نوبت $customer" else "نوبت $customer با $stylist"
                "$who $whose را لغو کرد"
            }
            NotificationText(title, bookingDetail, appointments)
        }
        // the stylist asked for the rest of the price from the customer's wallet…
        "BALANCE_REQUESTED" -> NotificationText(
            "$salon: باقی‌مانده نوبت ${formatToman((n.data["amountToman"] as? JsonPrimitive)?.intOrNull ?: 0)}؛ از کیف پول پرداخت کنید", bookingDetail, appointments,
        )
        // …and the customer paid it (owner, stylist)
        "BALANCE_PAID" -> NotificationText(
            "$customer باقی‌مانده نوبت را از کیف پول پرداخت کرد (${formatToman((n.data["amountToman"] as? JsonPrimitive)?.intOrNull ?: 0)})", bookingDetail, NotificationTarget.WALLET,
        )
        "BOOKING_CONFIRMED" -> NotificationText("$salon نوبت شما با $stylist را تایید کرد", bookingDetail, appointments)
        "BOOKING_UPDATED" -> NotificationText(
            when (scope) {
                NotificationScope.CUSTOMER -> if (n.str("updatedBy") == "STYLIST") "$stylist نوبت شما در $salon را تغییر داد" else "$salon نوبت شما با $stylist را تغییر داد"
                NotificationScope.STYLIST -> "سالن نوبت $customer را تغییر داد"
                NotificationScope.SALON -> "$stylist نوبت $customer را تغییر داد"
            },
            bookingDetail, appointments,
        )
        "SLOT_OPENED" -> {
            val day = n.str("dateKey")?.let { runCatching { LocalDate.parse(it).persianLabel() }.getOrNull() }
            NotificationText(
                "وقت خالی در $salon" + (n.str("stylistName")?.let { " با $it" } ?: ""),
                listOfNotNull(day, "یک نوبت لغو شد؛ تا کسی دیگر نگرفته رزرو کنید.").joinToString(" — "),
                NotificationTarget.SALON_PAGE, n.str("salonSlug"),
            )
        }
        "REVIEW_APPROVED" -> {
            val about = if (n.str("target") == "SALON") salon else "${n.str("stylistName") ?: "آرایشگر"} ($salon)"
            NotificationText("نظر شما درباره $about منتشر شد", "حالا در صفحه سالن برای همه نمایش داده می‌شود.", appointments)
        }
        "PAYOUT_RECORDED" -> {
            val amount = (n.data["amountToman"] as? JsonPrimitive)?.intOrNull ?: 0
            NotificationText("سالن ${formatToman(amount)} به شما پرداخت کرد", listOfNotNull(PAYOUT_METHOD[n.str("method")], n.str("note")).joinToString("، ").ifEmpty { null }, NotificationTarget.EARNINGS)
        }
        else -> NotificationText("اعلان تازه", null, appointments)
    }
}
