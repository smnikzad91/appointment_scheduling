package app.nobatet.data

import kotlinx.serialization.Serializable

/** «نظرات و پیشنهادات» (apps/web POST /api/public/feedback, lib/feedback.ts). */
@Serializable
data class FeedbackRequest(
    /** SUGGESTION | CRITICISM | PRAISE | BUG | OTHER */
    val kind: String,
    val message: String,
    /** CUSTOMER | SALON_OWNER | STYLIST */
    val role: String? = null,
)

val FEEDBACK_KIND_LABEL = linkedMapOf(
    "SUGGESTION" to "پیشنهاد",
    "CRITICISM" to "انتقاد",
    "PRAISE" to "تعریف و قدردانی",
    "BUG" to "گزارش مشکل",
    "OTHER" to "سایر",
)

const val FEEDBACK_MESSAGE_MIN = 5
const val FEEDBACK_MESSAGE_MAX = 2000
