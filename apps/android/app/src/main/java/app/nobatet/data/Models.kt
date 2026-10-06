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

/** `purpose: "register"` = confirming a new account's phone (refused for a taken number, before any SMS). */
@Serializable
data class OtpRequest(val phone: String, val purpose: String? = null)

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

/**
 * A JSON body that keeps nulls (the app's Json drops them — fine for "send only what changed",
 * wrong where null means "clear it": a service's own price, a review's stars).
 */
fun jsonBody(vararg fields: Pair<String, Any?>): kotlinx.serialization.json.JsonObject = kotlinx.serialization.json.JsonObject(
    fields.associate { (k, v) ->
        k to when (v) {
            null -> kotlinx.serialization.json.JsonNull
            is Number -> kotlinx.serialization.json.JsonPrimitive(v)
            is Boolean -> kotlinx.serialization.json.JsonPrimitive(v)
            else -> kotlinx.serialization.json.JsonPrimitive(v.toString())
        }
    },
)
