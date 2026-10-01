package app.nobatet.data

import kotlinx.serialization.Serializable

// apps/api's public salon data (GET /salons/search, /salons/:slug, /salons/:slug/availability)
// and the customer's bookings (/appointments, /appointments/mine). Unknown fields are ignored.

@Serializable
enum class SalonKind { SALON, INDEPENDENT }

@Serializable
enum class ServiceLocation { IN_SALON, STUDIO, HOME, CLIENT_HOME }

@Serializable
data class SalonCard(
    val id: String,
    val name: String,
    val slug: String,
    val province: String? = null,
    val city: String = "",
    /** null = an independent stylist's private (home) address. */
    val address: String? = null,
    val kind: SalonKind = SalonKind.SALON,
    val serviceLocations: List<ServiceLocation> = emptyList(),
    val hostSalonName: String? = null,
    val logoUrl: String? = null,
    val coverImageUrl: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val approximateLocation: Boolean = false,
    val rating: Double? = null,
    val ratingCount: Int = 0,
    val distanceKm: Double? = null,
    val services: List<String> = emptyList(),
    val serviceCount: Int = 0,
    val minPriceToman: Int? = null,
)

@Serializable
data class SalonSearchResult(val total: Int, val truncated: Boolean = false, val items: List<SalonCard>)

@Serializable
data class ServiceCategory(val id: String, val name: String, val order: Int = 0)

@Serializable
data class SalonService(
    val id: String,
    val categoryId: String? = null,
    val name: String,
    val description: String? = null,
    val durationMinutes: Int,
    val priceToman: Int,
    val active: Boolean = true,
)

@Serializable
data class WorkingHour(val dayOfWeek: Int, val startMinute: Int, val endMinute: Int)

@Serializable
data class StylistServiceLink(val serviceId: String, val overridePriceToman: Int? = null, val overrideDurationMinutes: Int? = null)

@Serializable
data class SalonStylist(
    val id: String,
    val displayName: String,
    val bio: String? = null,
    val avatarUrl: String? = null,
    val coverImageUrl: String? = null,
    val workingHours: List<WorkingHour> = emptyList(),
    val services: List<StylistServiceLink> = emptyList(),
)

@Serializable
data class GalleryImage(val id: String, val url: String, val caption: String? = null, val stylistId: String? = null)

@Serializable
data class SalonDetail(
    val id: String,
    val slug: String,
    val name: String,
    val description: String? = null,
    val province: String? = null,
    val city: String = "",
    val address: String? = null,
    val approximateLocation: Boolean = false,
    val kind: SalonKind = SalonKind.SALON,
    val serviceLocations: List<ServiceLocation> = emptyList(),
    val serviceArea: String? = null,
    val hostSalonName: String? = null,
    val phone: String? = null,
    val instagram: String? = null,
    val logoUrl: String? = null,
    val coverImageUrl: String? = null,
    val brandColor: String? = null,
    val timezone: String = "Asia/Tehran",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val serviceCategories: List<ServiceCategory> = emptyList(),
    val services: List<SalonService> = emptyList(),
    val stylists: List<SalonStylist> = emptyList(),
    val galleryImages: List<GalleryImage> = emptyList(),
) {
    val independent: Boolean get() = kind == SalonKind.INDEPENDENT
    val activeServices: List<SalonService> get() = services.filter { it.active }
}

@Serializable
data class TimeSlot(val startMinute: Int, val available: Boolean)

@Serializable
data class ReviewAuthor(val firstName: String = "", val avatarUrl: String? = null)

/** An approved public review (GET /salons/:slug/reviews). */
@Serializable
data class PublicReview(
    val id: String,
    val target: ReviewTarget,
    val stylistId: String? = null,
    val rating: Int? = null,
    val comment: String? = null,
    val createdAt: String,
    val customer: ReviewAuthor = ReviewAuthor(),
)

@Serializable
data class CreateAppointmentRequest(
    val salonId: String,
    val stylistId: String? = null,
    val serviceIds: List<String>,
    /** ISO instant. */
    val startAt: String,
    val serviceLocation: ServiceLocation? = null,
    val visitAddress: String? = null,
    val notes: String? = null,
)

@Serializable
enum class AppointmentStatus { PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW }

@Serializable
data class CreatedAppointment(val id: String, val startAt: String, val endAt: String, val priceToman: Int, val status: AppointmentStatus)

@Serializable
data class BookingSalon(
    val name: String,
    val slug: String,
    val kind: SalonKind = SalonKind.SALON,
    val address: String? = null,
    val hostSalonName: String? = null,
    val timezone: String = "Asia/Tehran",
)

@Serializable
data class BookingStylist(val displayName: String)

@Serializable
data class BookingServiceName(val name: String)

@Serializable
data class BookingService(val serviceId: String, val service: BookingServiceName)

@Serializable
data class CustomerBooking(
    val id: String,
    val startAt: String,
    val endAt: String,
    val priceToman: Int,
    val status: AppointmentStatus,
    val salon: BookingSalon,
    val stylist: BookingStylist,
    val serviceLocation: ServiceLocation? = null,
    val visitAddress: String? = null,
    val services: List<BookingService> = emptyList(),
    val stylistId: String? = null,
    val reviews: List<BookingReview> = emptyList(),
)

@Serializable
data class StatusUpdate(val status: AppointmentStatus)

/** How a place reads to customers (apps/web lib/independent.ts placeLabel). */
fun ServiceLocation.label(hostSalonName: String? = null): String = when (this) {
    ServiceLocation.IN_SALON -> if (!hostSalonName.isNullOrBlank()) "در $hostSalonName" else "در سالن"
    ServiceLocation.STUDIO -> "در استودیو"
    ServiceLocation.HOME -> "در منزل آرایشگر"
    ServiceLocation.CLIENT_HOME -> "در منزل مشتری"
}
