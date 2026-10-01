package app.nobatet.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

// The rest of the customer panel: favourites, waitlist, reviews, notifications (apps/api) and
// profile, password, avatar, promo SMS, support tickets (apps/web routes, same Bearer token).

@Serializable
data class WaitlistSalon(val name: String, val slug: String, val logoUrl: String? = null)

@Serializable
data class WaitlistStylist(val id: String, val displayName: String)

@Serializable
data class WaitlistEntry(
    val id: String,
    val dateKey: String,
    val serviceIds: List<String> = emptyList(),
    val notifiedAt: String? = null,
    val salon: WaitlistSalon,
    val stylist: WaitlistStylist? = null,
)

@Serializable
data class JoinWaitlistRequest(val date: String, val serviceIds: List<String>, val stylistId: String? = null)

@Serializable
enum class ReviewTarget { SALON, STYLIST }

@Serializable
enum class ReviewStatus { PENDING, APPROVED, REJECTED }

@Serializable
data class BookingReview(val id: String, val target: ReviewTarget, val rating: Int? = null, val comment: String? = null, val status: ReviewStatus = ReviewStatus.PENDING)

@Serializable
data class NewReviewRequest(val target: ReviewTarget, val rating: Int? = null, val comment: String? = null)

/** PATCH /reviews/:id — every field is sent: a null clears it (a review needs a rating or a comment). */
@Serializable
data class ReviewPatch(val rating: Int?, val comment: String?)

@Serializable
data class AppNotification(val id: String, val type: String, val readAt: String? = null, val createdAt: String, val data: JsonObject = JsonObject(emptyMap()))

@Serializable
data class NotificationList(val items: List<AppNotification> = emptyList(), val unreadCount: Int = 0)

@Serializable
data class RegisterRequest(val firstName: String, val lastName: String, val phone: String, val password: String, val email: String? = null)

// ── apps/web routes ─────────────────────────────────────────────────────────────────────────

@Serializable
data class Profile(val firstName: String, val lastName: String, val email: String? = null, val phone: String = "")

@Serializable
data class PasswordChange(val currentPassword: String, val newPassword: String)

@Serializable
data class SmsPreferences(val promoSmsOptOut: Boolean)

@Serializable
data class AvatarResponse(val avatar: String)

@Serializable
data class TicketSummary(val id: String, val subject: String, val status: String, val replyCount: Int = 0, val createdAt: String, val updatedAt: String)

@Serializable
data class TicketReply(val sender: String, val message: String, val images: List<String> = emptyList(), val createdAt: String)

@Serializable
data class TicketDetail(
    @kotlinx.serialization.SerialName("_id") val id: String,
    val subject: String,
    val message: String,
    val images: List<String> = emptyList(),
    val status: String,
    val createdAt: String,
    val replies: List<TicketReply> = emptyList(),
)

@Serializable
data class NewTicket(val subject: String, val message: String, val images: List<String> = emptyList())

@Serializable
data class TicketMessage(val message: String, val images: List<String> = emptyList())

@Serializable
data class TicketClose(val status: String = "closed")

@Serializable
data class Created(val id: String)

/** «باز» / «پاسخ داده شده» / «بسته», as the web's support page. */
fun ticketStatusLabel(status: String): String = when (status) {
    "open" -> "باز"
    "answered" -> "پاسخ داده شده"
    "closed" -> "بسته"
    else -> status
}
