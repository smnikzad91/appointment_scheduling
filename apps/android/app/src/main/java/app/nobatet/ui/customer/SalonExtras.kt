package app.nobatet.ui.customer

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import app.nobatet.data.PublicReview
import app.nobatet.data.SalonDetail
import app.nobatet.data.SalonStylist
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.persianLabel
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import java.time.Instant

/** Saturday first; apps/api dayOfWeek 0 = Sunday … 6 = Saturday. */
private val WEEK = listOf(6 to "شنبه", 0 to "یکشنبه", 1 to "دوشنبه", 2 to "سه‌شنبه", 3 to "چهارشنبه", 4 to "پنجشنبه", 5 to "جمعه")

/** The salon's hours: the union of its active stylists' hours per weekday (as the web's deriveSalonWorkingHours). */
@Composable
fun SalonHours(salon: SalonDetail) {
    val c = LocalAppColors.current
    AppCard {
        WEEK.forEach { (d, name) ->
            val hours = salon.stylists.flatMap { it.workingHours }.filter { it.dayOfWeek == d }
            Row(Modifier.fillMaxWidth()) {
                Text(name, color = c.ink, modifier = Modifier.weight(1f))
                if (hours.isEmpty()) Text("تعطیل", color = c.muted)
                else Text("${formatClock(hours.minOf { it.startMinute })} تا ${formatClock(hours.maxOf { it.endMinute })}", color = c.ink)
            }
        }
    }
}

/** Call / Instagram, as the salon page's contact buttons. */
@Composable
fun SalonContact(salon: SalonDetail) {
    val context = LocalContext.current
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        salon.phone?.takeIf { it.isNotBlank() }?.let { phone ->
            OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) } }, shape = RoundedCornerShape(999.dp)) { Text("تماس") }
        }
        salon.instagram?.takeIf { it.isNotBlank() }?.let { ig ->
            val handle = ig.trim().removePrefix("@").substringAfterLast("instagram.com/").trim('/')
            OutlinedButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://instagram.com/$handle"))) } }, shape = RoundedCornerShape(999.dp)) { Text("اینستاگرام") }
        }
    }
}

/** A small map of the salon (not for a private, rounded address). */
@Composable
fun SalonMiniMap(lat: Double, lng: Double) {
    AndroidView(
        modifier = Modifier.fillMaxWidth().height(180.dp).clip(RoundedCornerShape(18.dp)),
        factory = { ctx ->
            Configuration.getInstance().userAgentValue = ctx.packageName
            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(false)
                zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                controller.setZoom(16.0)
                controller.setCenter(GeoPoint(lat, lng))
                overlays.add(Marker(this).apply { position = GeoPoint(lat, lng); setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM) })
            }
        },
        onRelease = { it.onDetach() },
    )
}

/** Stars from 1–5, or nothing for a comment-only review. */
fun stars(rating: Int?) = rating?.let { "★".repeat(it) + "☆".repeat(5 - it) }

/** Average over reviews that carry stars (comment-only ones don't count), as on the web. */
fun averageOf(reviews: List<PublicReview>): Pair<Double, Int>? {
    val rated = reviews.mapNotNull { it.rating }
    return if (rated.isEmpty()) null else rated.average() to rated.size
}

@Composable
fun ReviewRow(r: PublicReview) {
    val c = LocalAppColors.current
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(r.customer.firstName.ifBlank { "مشتری" }, color = c.ink, modifier = Modifier.weight(1f))
            stars(r.rating)?.let { Text(it, color = c.pending) }
        }
        r.comment?.let { Text(it, color = c.ink) }
        Muted(runCatching { Instant.parse(r.createdAt).toSalonDateTime(null).toLocalDate().persianLabel() }.getOrDefault(""))
    }
}

/** A stylist on the salon page: photo, bio, rating, portfolio, «رزرو با …». */
@Composable
fun StylistCard(st: SalonStylist, salon: SalonDetail, reviews: List<PublicReview>, onBook: () -> Unit) {
    val c = LocalAppColors.current
    val mine = reviews.filter { it.stylistId == st.id && it.target == app.nobatet.data.ReviewTarget.STYLIST }
    val gallery = salon.galleryImages.filter { it.stylistId == st.id }
    AppCard(Modifier.width(280.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RemoteImage(st.avatarUrl, Modifier.size(56.dp).clip(CircleShape))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(st.displayName, color = c.ink, style = MaterialTheme.typography.titleSmall)
                averageOf(mine)?.let { (avg, n) -> Muted("★ ${"%.1f".format(avg).toPersianDigits()} (${n.toString().toPersianDigits()} نظر)") }
            }
        }
        st.bio?.takeIf { it.isNotBlank() }?.let { Muted(it) }
        if (gallery.isNotEmpty()) LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            items(gallery, key = { it.id }) { g -> RemoteImage(g.url, Modifier.size(72.dp).clip(RoundedCornerShape(10.dp))) }
        }
        TextButton(onClick = onBook) { Text("رزرو با ${st.displayName}") }
    }
}
