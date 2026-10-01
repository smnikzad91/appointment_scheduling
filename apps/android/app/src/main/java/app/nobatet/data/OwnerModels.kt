package app.nobatet.data

import kotlinx.serialization.Serializable

// The salon panel (salon owners and independent stylists): apps/api /salons/mine…, /services,
// /categories, /stylists/:id, /appointments/salon/mine, accounting — apps/web lib/api/ownerSalon.ts
// and accounting.ts.

@Serializable
data class OwnerSalon(
    val id: String,
    val name: String,
    val slug: String,
    val description: String? = null,
    val province: String? = null,
    val city: String = "",
    val address: String = "",
    val phone: String = "",
    val instagram: String? = null,
    val logoUrl: String? = null,
    val coverImageUrl: String? = null,
    val brandColor: String = "#a34a30",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val status: String = "ACTIVE",
    val timezone: String = "Asia/Tehran",
    val kind: SalonKind = SalonKind.SALON,
    val serviceLocations: List<ServiceLocation> = emptyList(),
    val serviceArea: String? = null,
    val hostSalonName: String? = null,
    val handle: String? = null,
) {
    val independent get() = kind == SalonKind.INDEPENDENT
}

/** PATCH /salons/mine — only what's sent changes (null fields are dropped by the app's Json). */
@Serializable
data class SalonPatch(
    val name: String? = null,
    val description: String? = null,
    val province: String? = null,
    val city: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val instagram: String? = null,
    val logoUrl: String? = null,
    val coverImageUrl: String? = null,
    val brandColor: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val serviceLocations: List<ServiceLocation>? = null,
    val serviceArea: String? = null,
    val hostSalonName: String? = null,
)

@Serializable
data class SubscriptionPlan(val id: String, val name: String, val maxStylists: Int? = null, val smsPerMonth: Int? = null)

@Serializable
data class SeatUsage(val active: Int = 0, val limit: Int? = null)

@Serializable
data class SmsUsage(val sent: Int = 0, val limit: Int? = null)

@Serializable
data class OwnerSubscription(
    /** none | active | expired */
    val status: String,
    val plan: SubscriptionPlan? = null,
    val expiresAt: String? = null,
    val stylists: SeatUsage = SeatUsage(),
    val sms: SmsUsage = SmsUsage(),
)

@Serializable
data class OwnerCategory(val id: String, val name: String, val order: Int = 0)

@Serializable
data class CategoryInput(val name: String, val order: Int? = null)

@Serializable
data class OwnerService(
    val id: String,
    val categoryId: String? = null,
    val name: String,
    val description: String? = null,
    val durationMinutes: Int,
    val priceToman: Int,
    val active: Boolean = true,
    val rebookReminderEnabled: Boolean = true,
    val rebookReminderDays: Int = 30,
)

@Serializable
data class OwnerStylistUser(val firstName: String = "", val lastName: String = "", val phone: String? = null, val mustSetPassword: Boolean = false)

@Serializable
data class OwnerStylistService(val serviceId: String, val overridePriceToman: Int? = null, val overrideDurationMinutes: Int? = null, val commissionPercent: Double? = null)

@Serializable
data class OwnerStylist(
    val id: String,
    val userId: String,
    val displayName: String,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val active: Boolean = true,
    val commissionPercent: Double = 20.0,
    val user: OwnerStylistUser = OwnerStylistUser(),
    val services: List<OwnerStylistService> = emptyList(),
    val setupToken: String? = null,
)

@Serializable
data class InviteStylistRequest(
    val phone: String,
    val firstName: String,
    val lastName: String,
    val displayName: String,
    val serviceIds: List<String> = emptyList(),
    val commissionPercent: Double,
)

@Serializable
data class StylistPatch(val displayName: String? = null, val active: Boolean? = null, val commissionPercent: Double? = null)

@Serializable
data class SetupLink(val setupToken: String, val expiresAt: String)

@Serializable
data class SalonTotals(
    val appointmentCount: Int = 0,
    val incomeToman: Int = 0,
    val tipsToman: Int = 0,
    val stylistShareToman: Int = 0,
    val salonShareToman: Int = 0,
    val expensesToman: Int = 0,
    val netProfitToman: Int = 0,
    val payoutsToman: Int = 0,
    val owedToStylistsToman: Int = 0,
)

@Serializable
data class StylistAccount(
    val id: String,
    val displayName: String,
    val active: Boolean = true,
    val commissionPercent: Double = 0.0,
    val appointmentCount: Int = 0,
    val incomeToman: Int = 0,
    val tipsToman: Int = 0,
    val shareToman: Int = 0,
    val paidInPeriodToman: Int = 0,
    val balanceToman: Int = 0,
)

@Serializable
data class ServiceBreakdown(val serviceId: String, val name: String, val count: Int, val bookedToman: Int)

@Serializable
data class SalonSummary(val totals: SalonTotals, val stylists: List<StylistAccount> = emptyList(), val services: List<ServiceBreakdown> = emptyList())

@Serializable
data class SalonIncomeItem(
    val id: String,
    val startAt: String,
    val customerName: String,
    val stylist: BookingStylist,
    val services: List<String> = emptyList(),
    /** The booked price; [chargedToman] is what was actually taken. */
    val priceToman: Int = 0,
    val chargedToman: Int = 0,
    val tipToman: Int = 0,
    val stylistShareToman: Int = 0,
    val salonShareToman: Int = 0,
    val commissionPercent: Double = 0.0,
)

@Serializable
data class ChargeRequest(val chargedToman: Int, val tipToman: Int)

@Serializable
data class SalonPayout(val id: String, val stylistId: String, val amountToman: Int, val method: String, val paidAt: String, val note: String? = null, val stylist: BookingStylist? = null)

@Serializable
data class PayoutRequest(val stylistId: String, val amountToman: Int, val method: String, val note: String? = null)

@Serializable
data class SalonExpense(val id: String, val category: String, val amountToman: Int, val spentAt: String, val note: String? = null, val receiptUrl: String? = null)

@Serializable
data class SalonExpenseInput(val category: String, val amountToman: Int, val spentAt: String, val note: String?, val receiptUrl: String?)

@Serializable
data class SalonHandle(val handle: String, val slug: String = "")

/** The salon's running costs (apps/web EXPENSE_CATEGORY_LABEL). */
val SALON_EXPENSE_CATEGORIES = linkedMapOf(
    "RENT" to "اجاره", "SUPPLIES" to "مواد و لوازم مصرفی", "SALARIES" to "حقوق پرسنل", "UTILITIES" to "قبوض و شارژ",
    "EQUIPMENT" to "تجهیزات", "MARKETING" to "تبلیغات", "OTHER" to "سایر",
)

/** POST /auth/register-salon-owner — a salon owner, or (kind INDEPENDENT) an independent stylist. */
@Serializable
data class RegisterSalonRequest(
    val firstName: String,
    val lastName: String,
    val phone: String,
    val password: String,
    val salonName: String,
    val province: String,
    val city: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val kind: SalonKind = SalonKind.SALON,
    val serviceLocations: List<ServiceLocation>? = null,
    val hostSalonName: String? = null,
    val serviceArea: String? = null,
)

@Serializable
data class Province(val name: String, val center: List<Double>, val cities: List<String>)
