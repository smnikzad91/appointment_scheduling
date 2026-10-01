package app.nobatet.ui.customer

import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.CustomerBooking
import app.nobatet.data.BookingReview
import app.nobatet.data.ReviewTarget
import app.nobatet.data.SalonKind
import app.nobatet.data.label
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.StatusChip
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.persianDateTime
import app.nobatet.util.toSalonDateTime
import java.time.Instant

@Composable
fun BookingsScreen(container: AppContainer, onOpenSalon: (String) -> Unit, onRebook: (String, BookingPrefill) -> Unit) {
    val vm: BookingsViewModel = viewModel(factory = viewModelFactory { initializer { BookingsViewModel(container) } })
    val s by vm.state.collectAsStateWithLifecycle()
    val c = LocalAppColors.current
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var confirm by remember { mutableStateOf<CustomerBooking?>(null) }
    var reviewing by remember { mutableStateOf<Pair<CustomerBooking, ReviewTarget>?>(null) }
    // fresh list every time the tab is shown (a booking may have just been made or confirmed)
    LaunchedEffect(Unit) { vm.load() }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            TabRow(selectedTabIndex = tab, containerColor = c.bg, contentColor = c.accent) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("پیش‌رو") })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("گذشته") })
            }
            val list = if (tab == 0) s.upcoming else s.past
            when {
                s.loading -> Loading()
                s.error != null && s.bookings.isEmpty() -> LoadError(s.error!!, vm::load)
                list.isEmpty() -> Empty(if (tab == 0) "نوبت پیش‌رویی ندارید" else "هنوز نوبتی نداشته‌اید", "از «کشف سالن» نوبت بگیرید.")
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(list, key = { it.id }) { b ->
                        BookingCard(
                            b, upcoming = tab == 0, cancelling = s.cancelling == b.id, onCancel = { confirm = b }, onOpenSalon = { onOpenSalon(b.salon.slug) },
                            onRebook = { onRebook(b.salon.slug, BookingPrefill(b.services.map { it.serviceId }, b.stylistId)) },
                            onReview = { target -> reviewing = b to target },
                            onDeleteReview = { review -> vm.deleteReview(b.id, review.id) },
                        )
                    }
                }
            }
        }
    }

    reviewing?.let { (b, target) ->
        val existing = b.reviews.firstOrNull { it.target == target }
        ReviewDialog(
            title = if (target == ReviewTarget.SALON) "نظر درباره ${b.salon.name}" else "نظر درباره ${b.stylist.displayName}",
            initialRating = existing?.rating, initialComment = existing?.comment.orEmpty(),
            onDismiss = { reviewing = null },
            onSave = { rating, comment -> vm.saveReview(b.id, target, existing?.id, rating, comment) { reviewing = null } },
        )
    }

    confirm?.let { b ->
        AlertDialog(
            onDismissRequest = { confirm = null },
            title = { Text("لغو نوبت") },
            text = { Text("نوبت ${b.salon.name} لغو شود؟") },
            confirmButton = { TextButton(onClick = { confirm = null; vm.cancel(b.id) }) { Text("لغو نوبت", color = c.danger) } },
            dismissButton = { TextButton(onClick = { confirm = null }) { Text("انصراف") } },
        )
    }
}

@Composable
private fun BookingCard(
    b: CustomerBooking, upcoming: Boolean, cancelling: Boolean, onCancel: () -> Unit, onOpenSalon: () -> Unit,
    onRebook: () -> Unit, onReview: (ReviewTarget) -> Unit, onDeleteReview: (BookingReview) -> Unit,
) {
    val c = LocalAppColors.current
    val start = Instant.parse(b.startAt).toSalonDateTime(b.salon.timezone)
    AppCard(Modifier.clickable(onClick = onOpenSalon)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(b.salon.name, style = MaterialTheme.typography.titleMedium, color = c.ink, modifier = Modifier.weight(1f))
            StatusChip(b.status)
        }
        Text(start.persianDateTime(), color = c.ink)
        Muted(b.services.joinToString("، ") { it.service.name })
        if (b.salon.kind != SalonKind.INDEPENDENT) Muted("با ${b.stylist.displayName}")
        // independent stylists: where it happens, with the address the customer needs
        b.serviceLocation?.let { loc ->
            val address = if (loc == app.nobatet.data.ServiceLocation.CLIENT_HOME) b.visitAddress else b.salon.address
            Muted(loc.label(b.salon.hostSalonName) + (address?.let { ": $it" } ?: ""))
        } ?: b.salon.address?.let { Muted(it) }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(formatToman(b.priceToman), color = c.accent, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
            if (upcoming && (b.status == AppointmentStatus.PENDING || b.status == AppointmentStatus.CONFIRMED)) {
                TextButton(onClick = onCancel, enabled = !cancelling) { Text(if (cancelling) "در حال لغو..." else "لغو نوبت", color = c.danger) }
            }
            if (!upcoming) TextButton(onClick = onRebook) { Text("رزرو دوباره") }
        }
        // reviews: one about the salon and, at a salon, one about the stylist (an independent stylist: one)
        if (b.status == AppointmentStatus.COMPLETED) {
            val targets = if (b.salon.kind == SalonKind.INDEPENDENT) listOf(ReviewTarget.SALON) else listOf(ReviewTarget.SALON, ReviewTarget.STYLIST)
            targets.forEach { target ->
                val review = b.reviews.firstOrNull { it.target == target }
                val about = if (target == ReviewTarget.SALON) (if (b.salon.kind == SalonKind.INDEPENDENT) b.stylist.displayName else "سالن") else b.stylist.displayName
                if (review == null) {
                    TextButton(onClick = { onReview(target) }) { Text("ثبت نظر درباره $about") }
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("نظر شما درباره $about" + (review.rating?.let { "، " + "★".repeat(it) } ?: ""), color = c.ink, style = MaterialTheme.typography.labelLarge)
                            review.comment?.let { Muted(it) }
                            Muted(if (review.status == app.nobatet.data.ReviewStatus.APPROVED) "منتشر شده" else if (review.status == app.nobatet.data.ReviewStatus.PENDING) "در انتظار تایید" else "تایید نشد")
                        }
                        TextButton(onClick = { onReview(target) }) { Text("ویرایش") }
                        TextButton(onClick = { onDeleteReview(review) }) { Text("حذف", color = c.danger) }
                    }
                }
            }
        }
    }
}

/** Stars (1–5, tap again to clear) and a comment (≤ 500); a review needs at least one. */
@Composable
fun ReviewDialog(title: String, initialRating: Int?, initialComment: String, onDismiss: () -> Unit, onSave: (Int?, String?) -> Unit) {
    val c = LocalAppColors.current
    var rating by remember { mutableStateOf(initialRating) }
    var comment by remember { mutableStateOf(initialComment) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    (1..5).forEach { n ->
                        Text(
                            if ((rating ?: 0) >= n) "★" else "☆", color = c.pending, style = MaterialTheme.typography.headlineMedium,
                            modifier = Modifier.clickable { rating = if (rating == n) null else n },
                        )
                    }
                }
                androidx.compose.material3.OutlinedTextField(
                    value = comment, onValueChange = { if (it.length <= 500) comment = it }, minLines = 3, modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("تجربه‌تان را بنویسید (اختیاری)") },
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onSave(rating, comment.trim().ifEmpty { null }) }, enabled = rating != null || comment.isNotBlank()) { Text("ثبت نظر") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
