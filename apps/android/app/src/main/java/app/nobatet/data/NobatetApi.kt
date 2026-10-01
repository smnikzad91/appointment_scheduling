package app.nobatet.data

import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.PUT
import retrofit2.http.Part
import retrofit2.http.Url
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.QueryMap

/** apps/api (https://nobatet.app/backend/). The token is added by [AuthInterceptor]. */
interface NobatetApi {
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @POST("auth/otp/request")
    suspend fun requestOtp(@Body body: OtpRequest): OtpRequestResponse

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body body: OtpVerifyRequest): AuthResponse

    /** The signed-in account as it is now — its role picks the panel. 401 = sign in again. */
    @GET("auth/me")
    suspend fun me(): ApiUser

    // ── Customer: discovery, salon page, booking ─────────────────────────────────────────────

    /** q, province, city, kind (SALON|INDEPENDENT), lat, lng, radiusKm, sort, limit, offset. */
    @GET("salons/search")
    suspend fun searchSalons(@QueryMap params: Map<String, String>): SalonSearchResult

    @GET("salons/{slug}")
    suspend fun salon(@Path("slug") slug: String): SalonDetail

    /** Salon-local slots of that day ("YYYY-MM-DD") for these services (comma-separated ids). */
    @GET("salons/{slug}/availability")
    suspend fun availability(
        @Path("slug") slug: String,
        @Query("date") date: String,
        @Query("serviceIds") serviceIds: String,
        @Query("stylistId") stylistId: String?,
    ): List<TimeSlot>

    /** An online booking (CUSTOMER): it waits for the stylist's confirmation (PENDING). */
    @POST("appointments")
    suspend fun book(@Body body: CreateAppointmentRequest): CreatedAppointment

    @GET("appointments/mine")
    suspend fun myBookings(): List<CustomerBooking>

    @PATCH("appointments/{id}/status")
    suspend fun setStatus(@Path("id") id: String, @Body body: StatusUpdate): kotlinx.serialization.json.JsonObject

    @POST("auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @GET("me/favorites")
    suspend fun favorites(): List<SalonCard>

    @GET("me/favorites/ids")
    suspend fun favoriteIds(): List<String>

    @PUT("me/favorites/{salonId}")
    suspend fun addFavorite(@Path("salonId") salonId: String): kotlinx.serialization.json.JsonObject

    @DELETE("me/favorites/{salonId}")
    suspend fun removeFavorite(@Path("salonId") salonId: String): kotlinx.serialization.json.JsonObject

    @POST("salons/{slug}/waitlist")
    suspend fun joinWaitlist(@Path("slug") slug: String, @Body body: JoinWaitlistRequest): Created

    @GET("me/waitlist")
    suspend fun myWaitlist(): List<WaitlistEntry>

    @DELETE("me/waitlist/{id}")
    suspend fun leaveWaitlist(@Path("id") id: String): kotlinx.serialization.json.JsonObject

    @POST("appointments/{id}/review")
    suspend fun leaveReview(@Path("id") appointmentId: String, @Body body: NewReviewRequest): BookingReview

    @PATCH("reviews/{id}")
    suspend fun updateReview(@Path("id") reviewId: String, @Body body: kotlinx.serialization.json.JsonObject): BookingReview

    @DELETE("reviews/{id}")
    suspend fun deleteReview(@Path("id") reviewId: String): kotlinx.serialization.json.JsonObject

    @GET("notifications")
    suspend fun notifications(): NotificationList

    @POST("notifications/read-all")
    suspend fun readAllNotifications(): kotlinx.serialization.json.JsonObject

    // ── Stylist panel ────────────────────────────────────────────────────────────────────────

    @GET("stylists/me")
    suspend fun myStylist(): SelfStylist

    @PATCH("stylists/me")
    suspend fun updateMyStylist(@Body body: StylistProfilePatch): SelfStylist

    @PATCH("stylists/me/services/{serviceId}")
    suspend fun updateMyService(@Path("serviceId") serviceId: String, @Body body: kotlinx.serialization.json.JsonObject): kotlinx.serialization.json.JsonObject

    @PUT("stylists/me/working-hours")
    suspend fun setMyHours(@Body body: HoursBody): kotlinx.serialization.json.JsonArray

    @GET("stylists/me/time-off")
    suspend fun myTimeOff(): List<TimeOff>

    @POST("stylists/me/time-off")
    suspend fun addTimeOff(@Body body: NewTimeOff): TimeOff

    @DELETE("stylists/me/time-off/{id}")
    suspend fun deleteTimeOff(@Path("id") id: String): kotlinx.serialization.json.JsonObject

    @GET("appointments/stylist/mine")
    suspend fun myStylistAppointments(): List<StaffAppointment>

    @POST("appointments/salon")
    suspend fun staffBook(@Body body: StaffBookingRequest): StaffAppointment

    @PATCH("appointments/{id}")
    suspend fun editAppointment(@Path("id") id: String, @Body body: AppointmentPatch): StaffAppointment

    @GET("appointments/salon/customer")
    suspend fun lookupCustomer(@Query("phone") phone: String): CustomerLookup

    @GET("stylists/me/earnings")
    suspend fun myEarnings(@Query("from") from: String, @Query("to") to: String): StylistEarnings

    @GET("stylists/me/expenses")
    suspend fun myExpenses(@Query("from") from: String, @Query("to") to: String, @Query("page") page: Int, @Query("pageSize") pageSize: Int = 20): ExpensePage

    @POST("stylists/me/expenses")
    suspend fun addExpense(@Body body: ExpenseInput): StylistExpense

    @PATCH("stylists/me/expenses/{id}")
    suspend fun updateExpense(@Path("id") id: String, @Body body: ExpenseInput): StylistExpense

    @DELETE("stylists/me/expenses/{id}")
    suspend fun deleteExpense(@Path("id") id: String): kotlinx.serialization.json.JsonObject

    @GET("stylists/me/gallery")
    suspend fun myGallery(): List<GalleryItem>

    @POST("stylists/me/gallery")
    suspend fun addGalleryImage(@Body body: NewGalleryImage): GalleryItem

    @DELETE("gallery/{id}")
    suspend fun deleteGalleryImage(@Path("id") id: String): kotlinx.serialization.json.JsonObject

    @GET("stylists/me/reviews")
    suspend fun myReviews(): List<ModerationReview>

    @PATCH("reviews/{id}/status")
    suspend fun moderateReview(@Path("id") id: String, @Body body: ModerateRequest): ModerationReview

    @GET("stylists/me/handle")
    suspend fun myHandle(): HandleResponse

    @PATCH("stylists/me/handle")
    suspend fun setMyHandle(@Body body: HandleRequest): HandleResponse
}

/** apps/web's own routes (https://nobatet.app/api/…), with the same apps/api token. */
interface WebApi {
    @GET("api/user/profile")
    suspend fun profile(): Profile

    @POST("api/user/password")
    suspend fun changePassword(@Body body: PasswordChange): kotlinx.serialization.json.JsonObject

    @Multipart
    @POST("api/user/avatar")
    suspend fun uploadAvatar(@Part avatar: MultipartBody.Part): AvatarResponse

    /** Image upload (public folders stylists/salons; private receipts expenses/salon-expenses). Field "file". */
    @Multipart
    @POST("api/upload")
    suspend fun upload(@Query("folder") folder: String, @Part file: MultipartBody.Part): UploadResponse

    @GET("api/user/sms-preferences")
    suspend fun smsPreferences(): SmsPreferences

    @PUT("api/user/sms-preferences")
    suspend fun setSmsPreferences(@Body body: SmsPreferences): SmsPreferences

    @GET("api/user/tickets")
    suspend fun tickets(): List<TicketSummary>

    @POST("api/user/tickets")
    suspend fun createTicket(@Body body: NewTicket): Created

    @GET("api/user/tickets/{id}")
    suspend fun ticket(@Path("id") id: String): TicketDetail

    @POST("api/user/tickets/{id}")
    suspend fun replyTicket(@Path("id") id: String, @Body body: TicketMessage): kotlinx.serialization.json.JsonObject

    @PATCH("api/user/tickets/{id}")
    suspend fun closeTicket(@Path("id") id: String, @Body body: TicketClose = TicketClose()): kotlinx.serialization.json.JsonObject
}
