package app.nobatet.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** apps/api's account (login/verify responses and GET /auth/me). `role` is uppercase, as in the DB. */
@Serializable
data class ApiUser(
    val id: String,
    val phone: String? = null,
    val email: String? = null,
    val firstName: String,
    val lastName: String,
    val avatarUrl: String? = null,
    val role: Role,
)

@Serializable
enum class Role {
    @SerialName("CUSTOMER") CUSTOMER,
    @SerialName("STYLIST") STYLIST,
    @SerialName("SALON_OWNER") SALON_OWNER,
    @SerialName("INDEPENDENT_STYLIST") INDEPENDENT_STYLIST,
    @SerialName("PLATFORM_ADMIN") PLATFORM_ADMIN,
}

@Serializable
data class AuthResponse(val accessToken: String, val user: ApiUser)

@Serializable
data class LoginRequest(val identifier: String, val password: String)

@Serializable
data class OtpRequest(val phone: String)

/** `devCode` comes back only while the API's SMS driver doesn't really deliver (see apps/web CLAUDE.md «SMS»). */
@Serializable
data class OtpRequestResponse(val success: Boolean = true, val devCode: String? = null)

@Serializable
data class OtpVerifyRequest(
    val phone: String,
    val code: String,
    val firstName: String? = null,
    val lastName: String? = null,
)

/** NestJS error body: `message` is a string or a list of validation messages. */
@Serializable
data class ApiErrorBody(val message: kotlinx.serialization.json.JsonElement? = null, val error: kotlinx.serialization.json.JsonElement? = null)
