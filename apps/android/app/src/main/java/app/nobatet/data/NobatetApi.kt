package app.nobatet.data

import retrofit2.http.Body
import retrofit2.http.GET
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
}
