package app.nobatet.ui.stylist

import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.SelfStylist
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.staff.StaffAppointmentCard
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.toPersianDigits

/**
 * «درآمد پیش‌بینی امروز»: the frozen share once COMPLETED, otherwise the commission on each
 * service's booked price at the service's own rate or the stylist's default (web estimatedShare).
 */
fun estimatedShare(a: StaffAppointment, stylist: SelfStylist): Int =
    if (a.status == AppointmentStatus.COMPLETED && a.stylistShareToman != null) a.stylistShareToman
    else a.services.sumOf { s ->
        val rate = stylist.services.firstOrNull { it.serviceId == s.serviceId }?.commissionPercent ?: stylist.commissionPercent
        (s.priceToman * rate / 100.0).toInt()
    }

enum class StylistPage(val title: String) { EARNINGS("درآمد من"), EXPENSES("هزینه‌های من"), REVIEWS("نظرات درباره شما"), SHARE("کیت معرفی") }

/** «امروز»: today's bookings, forecast income, what waits for confirmation, and the other pages. */
@Composable
fun StylistHomeScreen(stylist: SelfStylist, appointments: List<StaffAppointment>?, actions: StaffActions, onOpenPage: (StylistPage) -> Unit) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    val today = salonToday(tz)
    val list = appointments.orEmpty()
    val todays = list.filter { it.localDate(tz) == today && it.status != AppointmentStatus.CANCELLED }.sortedBy { it.startAt }
    val pending = list.filter { it.status == AppointmentStatus.PENDING }.sortedBy { it.startAt }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (appointments == null) item { app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(150.dp)) } else item {
                AppCard {
                    Muted("امروز، ${today.persianLabel()}")
                    Text("${todays.size.toString().toPersianDigits()} نوبت", style = MaterialTheme.typography.headlineSmall, color = c.ink)
                    Muted("درآمد پیش‌بینی امروز")
                    Text(formatToman(todays.filter { it.status != AppointmentStatus.NO_SHOW }.sumOf { estimatedShare(it, stylist) }), color = c.accent, style = MaterialTheme.typography.titleLarge)
                }
            }
            if (pending.isNotEmpty()) {
                item { SectionTitle("منتظر تایید شما (${pending.size.toString().toPersianDigits()})") }
                items(pending, key = { "p" + it.id }) { a -> StaffAppointmentCard(a, tz) { actions.selected = a } }
            }
            item { SectionTitle("برنامه امروز") }
            if (appointments == null) items(2) { app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(80.dp)) }
            else if (todays.isEmpty()) item { Muted("امروز نوبتی ندارید.") }
            items(todays, key = { "t" + it.id }) { a -> StaffAppointmentCard(a, tz) { actions.selected = a } }
            item { SectionTitle("بیشتر", Modifier.padding(top = 8.dp)) }
            items(StylistPage.entries) { page ->
                AppCard(Modifier.clickable { onOpenPage(page) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Text(page.title, color = c.ink, modifier = Modifier.weight(1f)); Text("›", color = c.muted) }
                }
            }
        }
    }
}
