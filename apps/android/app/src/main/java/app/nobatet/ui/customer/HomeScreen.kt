package app.nobatet.ui.customer

import androidx.compose.foundation.layout.height
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.CustomerBooking
import app.nobatet.data.SalonCard
import app.nobatet.data.WaitlistEntry
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.StatusChip
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate

/** The customer home (/dashboard): the next booking, saved salons and waitlist entries. */
@Composable
fun HomeScreen(container: AppContainer, firstName: String, onDiscover: () -> Unit, onOpenSalon: (String) -> Unit, onBookings: () -> Unit) {
    val c = LocalAppColors.current
    var next by remember { mutableStateOf<CustomerBooking?>(null) }
    var nextLoaded by remember { mutableStateOf(false) }
    var favorites by remember { mutableStateOf<List<SalonCard>>(emptyList()) }
    var waitlist by remember { mutableStateOf<List<WaitlistEntry>>(emptyList()) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) {
        launch {
            next = runCatching { container.api.myBookings() }.getOrNull()
                ?.filter { (it.status == AppointmentStatus.PENDING || it.status == AppointmentStatus.CONFIRMED) && Instant.parse(it.endAt).isAfter(Instant.now()) }
                ?.minByOrNull { it.startAt }
            nextLoaded = true
        }
        launch { favorites = runCatching { container.api.favorites() }.getOrDefault(emptyList()) }
        launch { waitlist = runCatching { container.api.myWaitlist() }.getOrDefault(emptyList()) }
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Text("سلام $firstName", style = MaterialTheme.typography.headlineSmall, color = c.ink)
        }
        item {
            val b = next
            if (!nextLoaded) app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(150.dp))
            else if (b == null) {
                AppCard {
                    Text("نوبت پیش‌رویی ندارید", color = c.ink, style = MaterialTheme.typography.titleSmall)
                    Muted("سالن یا آرایشگر دلخواهتان را پیدا کنید و آنلاین نوبت بگیرید.")
                    PrimaryButton("کشف سالن", onClick = onDiscover)
                }
            } else {
                AppCard(Modifier.clickable(onClick = onBookings)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("نوبت بعدی شما", color = c.muted, modifier = Modifier.weight(1f))
                        StatusChip(b.status)
                    }
                    Text(b.salon.name, color = c.ink, style = MaterialTheme.typography.titleMedium)
                    Text(Instant.parse(b.startAt).toSalonDateTime(b.salon.timezone).persianDateTime(), color = c.ink)
                    Muted(b.services.joinToString("، ") { it.service.name })
                }
            }
        }
        if (favorites.isNotEmpty()) {
            item { SectionTitle("سالن‌های محبوب") }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(favorites, key = { it.id }) { s ->
                        Column(Modifier.width(96.dp).clickable { onOpenSalon(s.slug) }, horizontalAlignment = Alignment.CenterHorizontally) {
                            RemoteImage(s.logoUrl ?: s.coverImageUrl, Modifier.size(72.dp).clip(RoundedCornerShape(20.dp)))
                            Text(s.name, color = c.ink, style = MaterialTheme.typography.labelLarge, maxLines = 1)
                        }
                    }
                }
            }
        }
        if (waitlist.isNotEmpty()) {
            item { SectionTitle("لیست انتظار") }
            items(waitlist, key = { it.id }) { w ->
                AppCard(Modifier.clickable { onOpenSalon(w.salon.slug) }) {
                    Text(w.salon.name + (w.stylist?.let { " با ${it.displayName}" } ?: ""), color = c.ink, style = MaterialTheme.typography.titleSmall)
                    Muted(runCatching { LocalDate.parse(w.dateKey).persianLabel() }.getOrDefault(w.dateKey) + if (w.notifiedAt != null) "، وقت خالی اعلام شد" else "، منتظر وقت خالی")
                    TextButton(onClick = {
                        scope.launch { runCatching { container.api.leaveWaitlist(w.id) }.onSuccess { waitlist = waitlist - w } }
                    }) { Text("حذف از لیست انتظار", color = c.danger) }
                }
            }
        }
        item { Spacer(Modifier.padding(8.dp)) }
    }
}
