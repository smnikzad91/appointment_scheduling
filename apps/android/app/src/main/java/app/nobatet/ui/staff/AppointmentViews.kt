package app.nobatet.ui.staff

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.DateRange
import androidx.compose.material.icons.outlined.EventBusy
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.MonthSwitcher
import app.nobatet.ui.stylist.localDate
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.iranHoliday
import app.nobatet.util.jalaliMonthPeriod
import app.nobatet.util.persianLabel
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

// The appointments screen of the salon and stylist panels, as apps/web components/app/
// AppointmentsScreen.tsx: «فهرست / هفته / ماه», the list's filter chips, and the month calendar
// (AppointmentCalendar.tsx).

enum class AppointmentsView(val label: String, val icon: ImageVector) {
    LIST("فهرست", Icons.AutoMirrored.Outlined.List),
    WEEK("هفته", Icons.Outlined.DateRange),
    MONTH("ماه", Icons.Outlined.CalendarMonth),
}

private const val VIEW_KEY = "appointmentsView"

/** The list/week/month choice, remembered on this device (the web's localStorage `appointmentsView`). */
@Composable
fun rememberAppointmentsView(): Pair<AppointmentsView, (AppointmentsView) -> Unit> {
    val prefs = LocalContext.current.getSharedPreferences("ui", Context.MODE_PRIVATE)
    var view by rememberSaveable {
        mutableStateOf(AppointmentsView.entries.firstOrNull { it.name == prefs.getString(VIEW_KEY, null) } ?: AppointmentsView.LIST)
    }
    return view to { v: AppointmentsView -> view = v; prefs.edit().putString(VIEW_KEY, v.name).apply() }
}

/** The web's view switch: a pill with the active option filled in ink. */
@Composable
fun AppointmentsViewSwitch(view: AppointmentsView, onChange: (AppointmentsView) -> Unit, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Row(modifier.fillMaxWidth().clip(CircleShape).background(c.card).border(1.dp, c.line, CircleShape).padding(2.dp)) {
        AppointmentsView.entries.forEach { v ->
            val on = v == view
            Row(
                Modifier.weight(1f).height(36.dp).clip(CircleShape).background(if (on) c.ink else androidx.compose.ui.graphics.Color.Transparent).clickable { onChange(v) },
                horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(v.icon, contentDescription = null, tint = if (on) c.bg else c.muted, modifier = Modifier.size(16.dp))
                Text(v.label, color = if (on) c.bg else c.muted, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 6.dp))
            }
        }
    }
}

/** The list's buckets, as the web's: پیش‌رو / منتظر تایید / گذشته / لغو شده. */
enum class AppointmentBucket(val label: String, val empty: String) {
    UPCOMING("پیش‌رو", "نوبت پیش‌رویی ندارید"),
    PENDING("منتظر تایید", "نوبتی منتظر تایید نیست"),
    HISTORY("گذشته", "هنوز نوبتی انجام نشده"),
    CANCELLED("لغو شده", "نوبت لغو شده‌ای ندارید"),
}

fun bucketOf(list: List<StaffAppointment>, bucket: AppointmentBucket, now: Instant = Instant.now()): List<StaffAppointment> {
    fun StaffAppointment.open() = status == AppointmentStatus.PENDING || status == AppointmentStatus.CONFIRMED
    return when (bucket) {
        AppointmentBucket.UPCOMING -> list.filter { it.open() && Instant.parse(it.endAt).isAfter(now) }.sortedBy { it.startAt }
        AppointmentBucket.PENDING -> list.filter { it.status == AppointmentStatus.PENDING }.sortedBy { it.startAt }
        AppointmentBucket.HISTORY -> list.filter { it.status != AppointmentStatus.CANCELLED && (!it.open() || !Instant.parse(it.endAt).isAfter(now)) }.sortedByDescending { it.startAt }
        AppointmentBucket.CANCELLED -> list.filter { it.status == AppointmentStatus.CANCELLED }.sortedByDescending { it.startAt }
    }
}

/** The web's ChipTabs: the active chip in ink, counts on پیش‌رو and منتظر تایید. */
@Composable
fun BucketChips(list: List<StaffAppointment>, bucket: AppointmentBucket, onChange: (AppointmentBucket) -> Unit) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        AppointmentBucket.entries.forEach { b ->
            val on = b == bucket
            val count = if (b == AppointmentBucket.UPCOMING || b == AppointmentBucket.PENDING) bucketOf(list, b).size else 0
            FilterPill(b.label, on, count) { onChange(b) }
        }
    }
}

/** One chip of [BucketChips] (also the stylist filter). */
@Composable
fun FilterPill(label: String, on: Boolean, count: Int = 0, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Row(
        Modifier.height(40.dp).clip(CircleShape).background(if (on) c.ink else c.card)
            .then(if (on) Modifier else Modifier.border(1.dp, c.line, CircleShape)).clickable(onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, color = if (on) c.bg else c.muted, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        if (count > 0) Text(
            count.toString().toPersianDigits(), color = if (on) c.bg else c.muted, fontSize = 11.sp,
            modifier = Modifier.padding(start = 6.dp).clip(CircleShape).background(if (on) c.bg.copy(alpha = 0.2f) else c.card2).padding(horizontal = 6.dp),
        )
    }
}

/** «امروز / فردا / دیروز» or «سه‌شنبه ۷ مهر», as the web's relativeDayLabel. */
fun LocalDate.relativeLabel(today: LocalDate): String = when (this) {
    today -> "امروز"
    today.plusDays(1) -> "فردا"
    today.minusDays(1) -> "دیروز"
    else -> persianLabel()
}

/** A day heading over a list: the day and its count. */
@Composable
fun DayHeading(day: LocalDate, today: LocalDate, count: Int, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Row(modifier.padding(top = 8.dp, start = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(day.relativeLabel(today), color = c.ink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
        Text(if (count > 0) "${count.toString().toPersianDigits()} نوبت" else "بدون نوبت", color = c.muted, fontSize = 13.sp, modifier = Modifier.padding(start = 8.dp))
    }
}

private val WEEKDAYS = listOf("ش", "ی", "د", "س", "چ", "پ", "ج")

/**
 * The web's month view: a Jalali month grid (Saturday first) with each day's booking count, a dot
 * when some still await confirmation, Fridays and official holidays in red; the tapped day's
 * appointments underneath. [stylistName] adds «با …» on the cards (salon panel).
 */
@Composable
fun AppointmentMonthView(
    list: List<StaffAppointment>,
    tz: String,
    today: LocalDate,
    modifier: Modifier = Modifier,
    stylistName: (StaffAppointment) -> String? = { null },
    onOpen: (StaffAppointment) -> Unit,
) {
    val c = LocalAppColors.current
    var offset by rememberSaveable { mutableIntStateOf(0) }
    var selectedKey by rememberSaveable { mutableStateOf(today.toString()) }
    val selected = LocalDate.parse(selectedKey)
    val period = jalaliMonthPeriod(today, offset)
    val byDay = remember(list, tz) { list.groupBy { it.localDate(tz) } }
    val days = generateSequence(period.start) { it.plusDays(1) }.takeWhile { it.isBefore(period.end) }.toList()
    val lead = (period.start.dayOfWeek.value - DayOfWeek.SATURDAY.value + 7) % 7
    fun active(d: LocalDate) = byDay[d].orEmpty().filter { it.status != AppointmentStatus.CANCELLED }
    val monthTotal = days.sumOf { active(it).size }
    val dayList = byDay[selected].orEmpty().sortedBy { it.startAt }
    val holiday = selected.iranHoliday()

    fun changeMonth(next: Int) {
        offset = next
        // keep a day of the shown month selected: today in the current month, otherwise the 1st
        val p = jalaliMonthPeriod(today, next)
        selectedKey = (if (!today.isBefore(p.start) && today.isBefore(p.end)) today else p.start).toString()
    }

    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item(key = "switch") { MonthSwitcher(period.label, onPrev = { changeMonth(offset - 1) }, onNext = { changeMonth(offset + 1) }, canNext = offset < 12) }
        item(key = "grid") {
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).padding(12.dp)) {
                Row(Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                    WEEKDAYS.forEachIndexed { i, w ->
                        Text(w, color = if (i == 6) c.danger.copy(alpha = 0.8f) else c.muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                    }
                }
                val cells: List<LocalDate?> = List(lead) { null } + days
                cells.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth()) {
                        (0 until 7).forEach { i ->
                            Box(Modifier.weight(1f).aspectRatio(1f).padding(2.dp)) {
                                week.getOrNull(i)?.let { d -> DayCell(d, today, d == selected, active(d)) { selectedKey = d.toString() } }
                            }
                        }
                    }
                }
                HorizontalDivider(color = c.line, modifier = Modifier.padding(top = 10.dp))
                Row(Modifier.fillMaxWidth().padding(top = 10.dp, start = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("${monthTotal.toString().toPersianDigits()} نوبت در ${period.label}", color = c.muted, fontSize = 11.sp, modifier = Modifier.weight(1f))
                    Box(Modifier.size(10.dp).clip(RoundedCornerShape(4.dp)).background(c.danger.copy(alpha = 0.15f)))
                    Text("تعطیل", color = c.muted, fontSize = 11.sp, modifier = Modifier.padding(start = 6.dp, end = 12.dp))
                    Box(Modifier.size(6.dp).clip(CircleShape).background(c.pending))
                    Text("منتظر تایید", color = c.muted, fontSize = 11.sp, modifier = Modifier.padding(start = 6.dp))
                }
            }
        }
        item(key = "day") {
            Column {
                DayHeading(selected, today, active(selected).size, Modifier.padding(top = 8.dp))
                if (holiday != null) Text("تعطیل رسمی: $holiday", color = c.danger, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp, top = 4.dp))
            }
        }
        if (dayList.isEmpty()) item(key = "empty") { Empty("در این روز نوبتی نیست", icon = Icons.Outlined.EventBusy) }
        items(dayList, key = { it.id }) { a -> StaffAppointmentCard(a, tz, showStylist = stylistName(a)) { onOpen(a) } }
    }
}

@Composable
private fun DayCell(d: LocalDate, today: LocalDate, isSelected: Boolean, items: List<StaffAppointment>, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val isToday = d == today
    val holiday = d.iranHoliday() != null
    val pending = items.any { it.status == AppointmentStatus.PENDING }
    val shape = RoundedCornerShape(16.dp)
    val (bg, fg) = when {
        isSelected -> c.ink to c.bg
        isToday -> c.accentSoft to c.accent
        holiday -> c.danger.copy(alpha = 0.07f) to c.danger
        d.dayOfWeek == DayOfWeek.FRIDAY -> androidx.compose.ui.graphics.Color.Transparent to c.danger
        else -> androidx.compose.ui.graphics.Color.Transparent to c.ink
    }
    Box(
        Modifier.fillMaxSize().alpha(if (!isSelected && d.isBefore(today)) 0.6f else 1f).clip(shape).background(bg)
            .then(if (isToday && !isSelected) Modifier.border(1.dp, c.accent.copy(alpha = 0.4f), shape) else Modifier)
            .clickable(onClick = onClick),
    ) {
        Column(Modifier.align(Alignment.Center), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                d.toJalali().day.toString().toPersianDigits(), color = fg, fontSize = 15.sp, lineHeight = 16.sp,
                fontWeight = if (isToday || isSelected) FontWeight.Bold else FontWeight.Normal,
            )
            if (items.isNotEmpty()) Text(
                items.size.toString().toPersianDigits(), color = if (isSelected) c.bg else c.accentInk, fontSize = 10.sp, lineHeight = 16.sp, fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 2.dp).defaultMinSize(minWidth = 18.dp).clip(CircleShape)
                    .background(if (isSelected) c.bg.copy(alpha = 0.2f) else c.accent).padding(horizontal = 4.dp),
            )
        }
        if (pending) Box(Modifier.align(Alignment.TopStart).padding(6.dp).size(6.dp).clip(CircleShape).background(c.pending))
    }
}
