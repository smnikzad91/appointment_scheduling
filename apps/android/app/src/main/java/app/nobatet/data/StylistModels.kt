package app.nobatet.data

import kotlinx.serialization.Serializable

// The stylist's panel (apps/api /stylists/me…, /appointments/stylist/mine, /appointments/salon …),
// same shapes as apps/web lib/api/stylistSelf.ts and accounting.ts.

@Serializable
data class OwnService(
    val id: String,
    val name: String,
    val priceToman: Int,
    val durationMinutes: Int,
    val active: Boolean = true,
    val rebookReminderEnabled: Boolean = true,
    val rebookReminderDays: Int = 30,
)

@Serializable
data class SelfStylistService(
    val serviceId: String,
    val overridePriceToman: Int? = null,
    val overrideDurationMinutes: Int? = null,
    /** The owner-set rate for this service; null = the stylist's default. */
    val commissionPercent: Double? = null,
    val overrideRebookReminderEnabled: Boolean? = null,
    val overrideRebookReminderDays: Int? = null,
    val service: OwnService,
) {
    val price get() = overridePriceToman ?: service.priceToman
    val duration get() = overrideDurationMinutes ?: service.durationMinutes
}

@Serializable
data class StylistSalon(val slug: String, val timezone: String = "Asia/Tehran", val status: String = "", val name: String = "", val city: String = "")

@Serializable
data class SelfStylist(
    val id: String,
    val displayName: String,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val coverImageUrl: String? = null,
    val active: Boolean = true,
    val commissionPercent: Double = 0.0,
    val workingHours: List<WorkingHour> = emptyList(),
    val services: List<SelfStylistService> = emptyList(),
    val salon: StylistSalon,
    val handle: String? = null,
)

/** PATCH /stylists/me — only the fields sent change; null clears a photo. */
@Serializable
data class StylistProfilePatch(val bio: String? = null, val avatarUrl: String? = null, val coverImageUrl: String? = null)

@Serializable
data class ServiceOverridePatch(
    val overridePriceToman: Int?,
    val overrideDurationMinutes: Int?,
    val overrideRebookReminderEnabled: Boolean?,
    val overrideRebookReminderDays: Int?,
)

@Serializable
data class HoursEntry(val dayOfWeek: Int, val startMinute: Int, val endMinute: Int)

@Serializable
data class HoursBody(val hours: List<HoursEntry>)

@Serializable
data class TimeOff(val id: String, val startAt: String, val endAt: String, val reason: String? = null)

@Serializable
data class NewTimeOff(val startAt: String, val endAt: String, val reason: String? = null)

@Serializable
data class StaffCustomer(val firstName: String = "", val lastName: String = "", val phone: String? = null)

@Serializable
data class StaffAppointmentService(val serviceId: String, val priceToman: Int = 0, val service: BookingServiceName)

@Serializable
data class StaffAppointment(
    val id: String,
    val stylistId: String,
    val startAt: String,
    val endAt: String,
    val status: AppointmentStatus,
    val priceToman: Int,
    val notes: String? = null,
    val serviceLocation: ServiceLocation? = null,
    val visitAddress: String? = null,
    /** Frozen once COMPLETED: commission + tip. */
    val stylistShareToman: Int? = null,
    val services: List<StaffAppointmentService> = emptyList(),
    val customer: StaffCustomer,
    val customerFirstName: String? = null,
    val customerLastName: String? = null,
) {
    /** This booking's name if staff set one, else the account's (apps/api already overlays it). */
    val customerName get() = "${customer.firstName} ${customer.lastName}".trim()
}

/** POST /appointments/salon — a phone or walk-in booking (a stylist: always themselves). */
@Serializable
data class StaffBookingRequest(
    val customerPhone: String,
    val customerFirstName: String? = null,
    val customerLastName: String? = null,
    val stylistId: String,
    val serviceIds: List<String>,
    val startAt: String,
    val notes: String? = null,
)

/** PATCH /appointments/:id — only what changed is sent (nulls are dropped by the JSON config). */
@Serializable
data class AppointmentPatch(
    val serviceIds: List<String>? = null,
    val startAt: String? = null,
    val notes: String? = null,
    val customerFirstName: String? = null,
    val customerLastName: String? = null,
)

@Serializable
data class CustomerLookup(val found: Boolean, val firstName: String? = null, val lastName: String? = null)

@Serializable
data class IncomeItem(
    val id: String,
    val startAt: String,
    val customerName: String,
    val services: List<String> = emptyList(),
    val chargedToman: Int = 0,
    val tipToman: Int = 0,
    val commissionPercent: Double = 0.0,
    val stylistShareToman: Int = 0,
)

@Serializable
data class Payout(val id: String, val amountToman: Int, val method: String, val paidAt: String, val note: String? = null)

@Serializable
data class EarningsTotals(
    val appointmentCount: Int = 0,
    val incomeToman: Int = 0,
    val tipsToman: Int = 0,
    val shareToman: Int = 0,
    val paidInPeriodToman: Int = 0,
    val expensesToman: Int = 0,
    val netIncomeToman: Int = 0,
)

@Serializable
data class StylistExpense(val id: String, val category: String, val amountToman: Int, val spentAt: String, val description: String, val receiptUrl: String? = null)

@Serializable
data class StylistEarnings(
    val totals: EarningsTotals,
    val balanceToman: Int = 0,
    val items: List<IncomeItem> = emptyList(),
    val payouts: List<Payout> = emptyList(),
)

@Serializable
data class ExpensePage(val items: List<StylistExpense>, val total: Int, val totalToman: Int, val page: Int, val pageSize: Int)

@Serializable
data class ExpenseInput(val category: String, val amountToman: Int, val spentAt: String, val description: String, val receiptUrl: String?)

@Serializable
data class GalleryItem(val id: String, val url: String, val caption: String? = null)

@Serializable
data class NewGalleryImage(val url: String, val caption: String? = null)

@Serializable
data class ModerationReview(
    val id: String,
    val rating: Int? = null,
    val comment: String? = null,
    val status: ReviewStatus,
    val createdAt: String,
    val customerName: String,
)

@Serializable
data class ModerateRequest(val status: ReviewStatus)

@Serializable
data class HandleResponse(val handle: String)

@Serializable
data class HandleRequest(val handle: String)

@Serializable
data class UploadResponse(val url: String)

val PAYOUT_METHOD_LABEL = mapOf("CASH" to "نقدی", "CARD_TO_CARD" to "کارت به کارت", "BANK_TRANSFER" to "واریز بانکی", "OTHER" to "سایر")

/** A stylist's own work costs (apps/web STYLIST_EXPENSE_CATEGORY_LABEL). */
val STYLIST_EXPENSE_CATEGORIES = linkedMapOf(
    "SUPPLIES" to "مواد مصرفی", "PRODUCTS" to "خرید محصول", "TOOLS" to "ابزار و تعمیرات",
    "TRAINING" to "آموزش", "TRANSPORT" to "رفت‌وآمد", "OTHER" to "سایر",
)
