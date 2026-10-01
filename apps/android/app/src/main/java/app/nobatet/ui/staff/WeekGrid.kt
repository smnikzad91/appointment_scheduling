package app.nobatet.ui.staff

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.components.MonthSwitcher
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.jalaliMonthName
import app.nobatet.util.persianName
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate

private const val FIRST_HOUR = 7
private const val LAST_HOUR = 24
private val HOUR = 52.dp
private val DAY = 72.dp

/**
 * «هفته»: the Saturday–Friday hour grid (the web's AppointmentWeek): status-coloured blocks at
 * their salon-local time, overlapping bookings side by side, a line for now.
 */
@Composable
fun WeekGrid(appointments: List<StaffAppointment>, tz: String, today: LocalDate, modifier: Modifier = Modifier, onOpen: (StaffAppointment) -> Unit) {
    val c = LocalAppColors.current
    var offset by rememberSaveable { mutableIntStateOf(0) }
    val saturday = today.minusDays(((today.dayOfWeek.value - DayOfWeek.SATURDAY.value + 7) % 7).toLong()).plusWeeks(offset.toLong())
    val days = (0L until 7L).map { saturday.plusDays(it) }
    val a = days.first().toJalali()
    val b = days.last().toJalali()
    val label = "${a.day.toString().toPersianDigits()} ${jalaliMonthName(a.month)} تا ${b.day.toString().toPersianDigits()} ${jalaliMonthName(b.month)}"
    val shown = appointments.filter { it.status != AppointmentStatus.CANCELLED }
    Column(modifier.fillMaxSize()) {
        Box(Modifier.padding(horizontal = 12.dp)) { MonthSwitcher(label, onPrev = { offset-- }, onNext = { offset++ }, canNext = offset < 26) }
        Row(Modifier.fillMaxSize().horizontalScroll(rememberScrollState())) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                // header
                Row {
                    Box(Modifier.width(44.dp))
                    days.forEach { d ->
                        Column(Modifier.width(DAY).padding(vertical = 4.dp)) {
                            Text(d.dayOfWeek.persianName(), color = if (d == today) c.accent else c.muted, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                            Text(d.toJalali().day.toString().toPersianDigits(), color = if (d == today) c.accent else c.ink, style = MaterialTheme.typography.titleSmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                        }
                    }
                }
                Row {
                    Column(Modifier.width(44.dp)) {
                        (FIRST_HOUR until LAST_HOUR).forEach { h -> Text(formatClock(h * 60), color = c.muted, style = MaterialTheme.typography.labelSmall, modifier = Modifier.height(HOUR)) }
                    }
                    days.forEach { d ->
                        Box(Modifier.width(DAY).height(HOUR * (LAST_HOUR - FIRST_HOUR)).border(0.5.dp, c.line)) {
                            (1 until LAST_HOUR - FIRST_HOUR).forEach { i -> Box(Modifier.offset(y = HOUR * i).fillMaxWidth().height(0.5.dp).background(c.line)) }
                            val dayItems = shown.map { it to Instant.parse(it.startAt).toSalonDateTime(tz) }.filter { it.second.toLocalDate() == d }.sortedBy { it.second }
                            // lanes for overlapping bookings
                            val lanes = mutableListOf<Instant>()
                            val placed = dayItems.map { (appt, _) ->
                                val start = Instant.parse(appt.startAt)
                                var lane = lanes.indexOfFirst { !it.isAfter(start) }
                                if (lane < 0) { lanes.add(Instant.parse(appt.endAt)); lane = lanes.size - 1 } else lanes[lane] = Instant.parse(appt.endAt)
                                appt to lane
                            }
                            val laneCount = maxOf(1, lanes.size)
                            placed.forEach { (appt, lane) ->
                                val s = Instant.parse(appt.startAt).toSalonDateTime(tz)
                                val e = Instant.parse(appt.endAt).toSalonDateTime(tz)
                                val startMin = (s.hour * 60 + s.minute - FIRST_HOUR * 60).coerceAtLeast(0)
                                val minutes = java.time.Duration.between(s, e).toMinutes().toInt().coerceAtLeast(20)
                                val color = when (appt.status) {
                                    AppointmentStatus.PENDING -> c.pending
                                    AppointmentStatus.CONFIRMED -> c.confirmed
                                    AppointmentStatus.COMPLETED -> c.done
                                    else -> c.muted
                                }
                                Box(
                                    Modifier.offset(x = DAY / laneCount * lane, y = HOUR * startMin / 60).width(DAY / laneCount).height(HOUR * minutes / 60)
                                        .padding(1.dp).clip(RoundedCornerShape(8.dp)).background(color.copy(alpha = 0.18f)).border(1.dp, color, RoundedCornerShape(8.dp))
                                        .clickable { onOpen(appt) }.padding(3.dp),
                                ) {
                                    Text(appt.customerName, color = c.ink, style = MaterialTheme.typography.labelSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                }
                            }
                            if (d == today) {
                                val now = java.time.LocalTime.now(app.nobatet.util.zone(tz))
                                val m = now.hour * 60 + now.minute - FIRST_HOUR * 60
                                if (m >= 0) Box(Modifier.offset(y = HOUR * m / 60).fillMaxWidth().height(2.dp).background(c.danger))
                            }
                        }
                    }
                }
            }
        }
    }
}
