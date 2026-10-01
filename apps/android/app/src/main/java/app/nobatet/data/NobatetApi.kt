package app.nobatet.data

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

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
}
