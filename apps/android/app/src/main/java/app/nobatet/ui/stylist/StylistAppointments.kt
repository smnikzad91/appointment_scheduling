package app.nobatet.ui.stylist

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
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import app.nobatet.ui.staff.AppointmentDetailSheet
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
    val snackbar: SnackbarHostState,
    val reload: () -> Unit,
) {
    var selected by mutableStateOf<StaffAppointment?>(null)
    var editing by mutableStateOf<StaffAppointment?>(null)
    var creating by mutableStateOf(false)
    var busy by mutableStateOf(false)
}

@Composable
fun rememberStaffActions(container: AppContainer, reload: () -> Unit): StaffActions {
    val snackbar = remember { SnackbarHostState() }
    return remember { StaffActions(container, snackbar, reload) }
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
                        actions.snackbar.showSnackbar(persianError(e, "تغییر وضعیت نوبت انجام نشد، دوباره تلاش کنید", actions.container.json))
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
            onDismiss = { actions.creating = false; actions.editing = null },
            onSaved = { actions.creating = false; actions.editing = null; actions.reload() },
        )
    }
}

/** «نوبت‌ها»: پیش‌رو / منتظر تایید / گذشته / لغوشده, or a Jalali month calendar; «+» books a customer. */
@Composable
fun StylistAppointmentsScreen(stylist: SelfStylist, appointments: List<StaffAppointment>?, actions: StaffActions) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    val today = salonToday(tz)
    var tab by rememberSaveable { mutableIntStateOf(0) }
    val tabs = listOf("پیش‌رو", "منتظر تایید", "گذشته", "لغوشده", "هفته", "تقویم ماه")
    val now = Instant.now()

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            ScrollableTabRow(selectedTabIndex = tab, containerColor = c.bg, contentColor = c.accent, edgePadding = 8.dp) {
                tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) }) }
            }
            val list = appointments
            when {
                list == null -> app.nobatet.ui.components.Loading()
                tab == 4 -> app.nobatet.ui.staff.WeekGrid(list, tz, today, Modifier.weight(1f)) { actions.selected = it }
                tab == 5 -> MonthCalendar(list, tz, today, Modifier.weight(1f)) { actions.selected = it }
                else -> {
                    val filtered = when (tab) {
                        0 -> list.filter { (it.status == AppointmentStatus.PENDING || it.status == AppointmentStatus.CONFIRMED) && Instant.parse(it.endAt).isAfter(now) }.sortedBy { it.startAt }
                        1 -> list.filter { it.status == AppointmentStatus.PENDING }.sortedBy { it.startAt }
                        2 -> list.filter { it.status == AppointmentStatus.COMPLETED || it.status == AppointmentStatus.NO_SHOW || (it.status != AppointmentStatus.CANCELLED && !Instant.parse(it.endAt).isAfter(now)) }.sortedByDescending { it.startAt }
                        else -> list.filter { it.status == AppointmentStatus.CANCELLED }.sortedByDescending { it.startAt }
                    }
                    if (filtered.isEmpty()) Empty("نوبتی نیست") else DayGroupedList(filtered, tz, today, Modifier.weight(1f)) { actions.selected = it }
                }
            }
        }
        FloatingActionButton(
            onClick = { actions.creating = true }, containerColor = c.accent, contentColor = c.accentInk,
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) { Icon(Icons.Outlined.Add, contentDescription = "نوبت تازه") }
        SnackbarHost(actions.snackbar, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }
}

@Composable
fun DayGroupedList(list: List<StaffAppointment>, tz: String, today: LocalDate, modifier: Modifier = Modifier, onOpen: (StaffAppointment) -> Unit) {
    val groups = list.groupBy { it.localDate(tz) }
    LazyColumn(modifier, contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        groups.forEach { (day, items) ->
            item(key = "h$day") { Muted(if (day == today) "امروز، ${day.persianLabel()}" else day.persianLabel(), Modifier.padding(top = 6.dp)) }
            items(items, key = { it.id }) { a -> StaffAppointmentCard(a, tz) { onOpen(a) } }
        }
    }
}

/** A Jalali month grid (Saturday first) with each day's booking count; a tap lists that day. */
@Composable
private fun MonthCalendar(list: List<StaffAppointment>, tz: String, today: LocalDate, modifier: Modifier = Modifier, onOpen: (StaffAppointment) -> Unit) {
    val c = LocalAppColors.current
    var offset by rememberSaveable { mutableIntStateOf(0) }
    var day by remember { mutableStateOf<LocalDate?>(today) }
    val period = jalaliMonthPeriod(today, offset)
    val active = list.filter { it.status != AppointmentStatus.CANCELLED }
    val counts = active.groupingBy { it.localDate(tz) }.eachCount()
    val days = generateSequence(period.start) { it.plusDays(1) }.takeWhile { it.isBefore(period.end) }.toList()
    // Saturday = column 0
    val lead = (period.start.dayOfWeek.value - DayOfWeek.SATURDAY.value + 7) % 7
    Column(modifier.fillMaxSize().padding(horizontal = 12.dp)) {
        MonthSwitcher(period.label, onPrev = { offset-- }, onNext = { offset++ }, canNext = offset < 12)
        Row(Modifier.fillMaxWidth()) {
            listOf("ش", "ی", "د", "س", "چ", "پ", "ج").forEach { Text(it, color = c.muted, textAlign = TextAlign.Center, modifier = Modifier.weight(1f)) }
        }
        val cells: List<LocalDate?> = List(lead) { null } + days
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                (0 until 7).forEach { i ->
                    val d = week.getOrNull(i)
                    Box(Modifier.weight(1f).aspectRatio(1f).padding(2.dp)) {
                        if (d != null) {
                            val on = d == day
                            val n = counts[d] ?: 0
                            Column(
                                Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).background(if (on) c.accent else if (n > 0) c.accentSoft else c.card)
                                    .border(1.dp, if (d == today) c.accent else c.line, RoundedCornerShape(12.dp)).clickable { day = d },
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
                            ) {
                                Text(d.toJalali().day.toString().toPersianDigits(), color = if (on) c.accentInk else c.ink, style = MaterialTheme.typography.labelLarge)
                                if (n > 0) Text(n.toString().toPersianDigits(), color = if (on) c.accentInk else c.accent, style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }
        }
        val dayList = day?.let { d -> active.filter { it.localDate(tz) == d }.sortedBy { it.startAt } }.orEmpty()
        if (day != null && dayList.isEmpty()) Muted("نوبتی در این روز نیست", Modifier.padding(12.dp))
        else DayGroupedList(dayList, tz, today, Modifier.weight(1f), onOpen)
    }
}
