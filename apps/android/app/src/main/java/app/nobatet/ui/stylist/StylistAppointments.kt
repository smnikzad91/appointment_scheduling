package app.nobatet.ui.stylist

import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.SelfStylist
import app.nobatet.data.StaffAppointment
import app.nobatet.data.StatusUpdate
import app.nobatet.data.persianError
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.MonthSwitcher
import app.nobatet.ui.components.Muted
import app.nobatet.ui.staff.AppointmentBucket
import app.nobatet.ui.staff.AppointmentDetailSheet
import app.nobatet.ui.staff.AppointmentMonthView
import app.nobatet.ui.staff.AppointmentsView
import app.nobatet.ui.staff.AppointmentsViewSwitch
import app.nobatet.ui.staff.BucketChips
import app.nobatet.ui.staff.DayHeading
import app.nobatet.ui.staff.bucketOf
import app.nobatet.ui.staff.rememberAppointmentsView
import app.nobatet.ui.staff.BookableService
import app.nobatet.ui.staff.StaffAppointmentCard
import app.nobatet.ui.staff.StaffBookingSheet
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.jalaliMonthPeriod
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

fun SelfStylist.bookable() = services.filter { it.service.active }.map { BookableService(it.serviceId, it.service.name, it.price, it.duration) }

fun StaffAppointment.localDate(tz: String): LocalDate = Instant.parse(startAt).toSalonDateTime(tz).toLocalDate()

/**
 * Appointment list + status sheet + booking sheet, shared by «امروز» and «نوبت‌ها»; the caller
 * owns the list (so a change on one tab shows on the other).
 */
class StaffActions(
    val container: AppContainer,
    val reload: () -> Unit,
) {
    var selected by mutableStateOf<StaffAppointment?>(null)
    var editing by mutableStateOf<StaffAppointment?>(null)
    var creating by mutableStateOf(false)
    /** A booking started by tapping the week view: that day and minute. */
    var prefill by mutableStateOf<Pair<LocalDate, Int>?>(null)
    var busy by mutableStateOf(false)
}

@Composable
fun rememberStaffActions(container: AppContainer, reload: () -> Unit): StaffActions {
    return remember { StaffActions(container, reload) }
}

/** The sheets of [StaffActions] for a stylist booking themselves. */
@Composable
fun StaffSheets(actions: StaffActions, stylist: SelfStylist) {
    val scope = rememberCoroutineScope()
    val tz = stylist.salon.timezone
    actions.selected?.let { a ->
        AppointmentDetailSheet(
            a, tz, actions.busy,
            onDismiss = { actions.selected = null },
            onEdit = { actions.selected = null; actions.editing = a },
            onStatus = { status ->
                scope.launch {
                    actions.busy = true
                    try {
                        actions.container.api.setStatus(a.id, StatusUpdate(status))
                        actions.selected = null
                        actions.reload()
                    } catch (e: Exception) {
                        Toasts.error(persianError(e, "تغییر وضعیت نوبت انجام نشد، دوباره تلاش کنید", actions.container.json))
                    } finally {
                        actions.busy = false
                    }
                }
            },
        )
    }
    if (actions.creating || actions.editing != null) {
        StaffBookingSheet(
            actions.container, stylist.salon.slug, tz, stylist.id, stylist.bookable(), actions.editing,
            onDismiss = { actions.creating = false; actions.editing = null; actions.prefill = null },
            onSaved = { actions.creating = false; actions.editing = null; actions.prefill = null; actions.reload() },
            prefill = actions.prefill,
        )
    }
}

/** «نوبت‌ها», as the web's: «فهرست / هفته / ماه», the list's filter chips, «+» books a customer. */
@Composable
fun StylistAppointmentsScreen(stylist: SelfStylist, appointments: List<StaffAppointment>?, actions: StaffActions) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    val today = salonToday(tz)
    val (view, setView) = rememberAppointmentsView()
    var bucket by rememberSaveable { mutableStateOf(AppointmentBucket.UPCOMING) }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppointmentsViewSwitch(view, setView, Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp))
            val list = appointments
            if (view == AppointmentsView.LIST && list != null) BucketChips(list, bucket) { bucket = it }
            when {
                list == null -> app.nobatet.ui.components.Loading()
                view == AppointmentsView.WEEK -> app.nobatet.ui.staff.WeekGrid(
                    list, tz, today, Modifier.weight(1f), onCreateAt = { d, m -> actions.prefill = d to m; actions.creating = true },
                ) { actions.selected = it }
                view == AppointmentsView.MONTH -> AppointmentMonthView(list, tz, today, Modifier.weight(1f)) { actions.selected = it }
                else -> {
                    val filtered = bucketOf(list, bucket)
                    if (filtered.isEmpty()) Empty(bucket.empty, modifier = Modifier.padding(16.dp)) else DayGroupedList(filtered, tz, today, Modifier.weight(1f)) { actions.selected = it }
                }
            }
        }
        FloatingActionButton(
            onClick = { actions.creating = true }, containerColor = c.accent, contentColor = c.accentInk,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) { Icon(Icons.Outlined.Add, contentDescription = "نوبت تازه") }
    }
}

/** Appointments under day headings (the web's AppointmentList); [stylistName] adds «با …» (salon panel). */
@Composable
fun DayGroupedList(
    list: List<StaffAppointment>,
    tz: String,
    today: LocalDate,
    modifier: Modifier = Modifier,
    stylistName: (StaffAppointment) -> String? = { null },
    onOpen: (StaffAppointment) -> Unit,
) {
    val groups = list.groupBy { it.localDate(tz) }
    LazyColumn(modifier, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        groups.forEach { (day, items) ->
            item(key = "h$day") { DayHeading(day, today, items.size) }
            items(items, key = { it.id }) { a -> StaffAppointmentCard(a, tz, stylistName(a)) { onOpen(a) } }
        }
    }
}
