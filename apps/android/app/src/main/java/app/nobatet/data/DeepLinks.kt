package app.nobatet.data

import android.net.Uri
import app.nobatet.BuildConfig
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.serialization.Serializable
import java.time.LocalDate

/**
 * Website links the app opens itself (AndroidManifest intent filters, verified by apps/web
 * `/.well-known/assetlinks.json`):
 * - `/s/{slug}` — a salon page; `?book=1&services=a,b&stylist=x&date=YYYY-MM-DD` opens booking prefilled
 * - `/book/@{handle}` — a share-kit short link (salon or stylist), resolved by apps/api `GET /book/:handle`
 * - `/r/{code}` — the «وقت نوبت بعدی» SMS link, resolved by apps/api `GET /rebook/:code`
 */
sealed interface DeepLink {
    data class Salon(val slug: String, val book: Boolean = false, val serviceIds: List<String> = emptyList(), val stylistId: String? = null, val date: LocalDate? = null) : DeepLink
    data class Handle(val handle: String) : DeepLink
    data class Rebook(val code: String) : DeepLink

    companion object {
        private val host = Uri.parse(BuildConfig.WEB_BASE_URL).host

        fun parse(uri: Uri?): DeepLink? {
            if (uri == null || uri.scheme != "https" || (uri.host != host && uri.host != "www.$host")) return null
            val seg = uri.pathSegments
            return when (seg.firstOrNull()) {
                "s" -> seg.getOrNull(1)?.takeIf { it.isNotBlank() }?.let { slug ->
                    Salon(
                        slug,
                        book = uri.getQueryParameter("book") == "1",
                        serviceIds = uri.getQueryParameter("services")?.split(',')?.filter { it.isNotBlank() }.orEmpty(),
                        stylistId = uri.getQueryParameter("stylist")?.takeIf { it.isNotBlank() },
                        date = uri.getQueryParameter("date")?.let { runCatching { LocalDate.parse(it) }.getOrNull() },
                    )
                }
                "book" -> seg.getOrNull(1)?.trim()?.trimStart('@')?.lowercase()?.takeIf { Regex("[a-z0-9._-]{1,60}").matches(it) }?.let { Handle(it) }
                "r" -> seg.getOrNull(1)?.takeIf { it.isNotBlank() }?.let { Rebook(it) }
                else -> null
            }
        }
    }
}

/** A link waiting to be opened (until the session is ready, or across a sign-in). */
class PendingLinks {
    val link = MutableStateFlow<DeepLink?>(null)
}

@Serializable
data class BookTarget(val slug: String, val stylistId: String? = null)

@Serializable
data class RebookSalon(val name: String = "", val slug: String)

@Serializable
data class RebookLink(val salon: RebookSalon, val optedOut: Boolean = false)
