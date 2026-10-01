package app.nobatet.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.isWeekend
import app.nobatet.util.jalaliMonthName
import app.nobatet.util.jalaliToGregorian
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import java.time.LocalDate
import java.time.temporal.ChronoUnit

private val WEEKDAYS = listOf("ش", "ی", "د", "س", "چ", "پ", "ج")

/** Saturday = 0 … Friday = 6 (the Iranian week). */
private fun LocalDate.weekColumn(): Int = (dayOfWeek.value + 1) % 7

/** The Jalali month after (jy, jm). */
private fun nextMonth(jy: Int, jm: Int): Pair<Int, Int> = if (jm == 12) jy + 1 to 1 else jy to jm + 1

/**
 * A Jalali month grid (Saturday first, Fridays in red): pick any day from [from] up to [until],
 * paging month by month.
 */
@Composable
fun MonthCalendar(selected: LocalDate?, from: LocalDate, until: LocalDate, onSelect: (LocalDate) -> Unit, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    val start = (selected ?: from).toJalali()
    var month by remember { mutableStateOf(start.year to start.month) }
    val (jy, jm) = month
    val first = jalaliToGregorian(jy, jm, 1)
    val (ny, nm) = nextMonth(jy, jm)
    val nextFirst = jalaliToGregorian(ny, nm, 1)
    val length = ChronoUnit.DAYS.between(first, nextFirst).toInt()
    val fromJ = from.toJalali()
    val canBack = jy > fromJ.year || (jy == fromJ.year && jm > fromJ.month)
    val canForward = !nextFirst.isAfter(until)

    Column(modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).padding(12.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            // right-to-left: the right arrow goes back a month, the left one forward
            IconButton(onClick = { month = if (jm == 1) jy - 1 to 12 else jy to jm - 1 }, enabled = canBack) {
                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = "ماه قبل")
            }
            Text(
                "${jalaliMonthName(jm)} ${jy.toString().toPersianDigits()}", color = c.ink, fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { month = ny to nm }, enabled = canForward) {
                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = "ماه بعد")
            }
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
            WEEKDAYS.forEachIndexed { i, d ->
                Text(d, color = if (i == 6) c.danger else c.muted, style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            }
        }
        val lead = first.weekColumn()
        val cells = lead + length
        (0 until (cells + 6) / 7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                (0 until 7).forEach { col ->
                    val day = week * 7 + col - lead + 1
                    Box(Modifier.weight(1f).aspectRatio(1f).padding(2.dp), contentAlignment = Alignment.Center) {
                        if (day in 1..length) {
                            val date = first.plusDays((day - 1).toLong())
                            val enabled = !date.isBefore(from) && !date.isAfter(until)
                            val isSelected = date == selected
                            val fg = when {
                                isSelected -> c.accentInk
                                !enabled -> c.muted.copy(alpha = 0.4f)
                                date.isWeekend -> c.danger
                                else -> c.ink
                            }
                            Box(
                                Modifier.fillMaxWidth().aspectRatio(1f).clip(CircleShape)
                                    .background(if (isSelected) c.accent else androidx.compose.ui.graphics.Color.Transparent)
                                    .then(if (date == from && !isSelected) Modifier.border(1.dp, c.accent, CircleShape) else Modifier)
                                    .then(if (enabled) Modifier.clickable { onSelect(date) } else Modifier),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(day.toString().toPersianDigits(), color = fg, fontWeight = if (isSelected || date == from) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                }
            }
        }
    }
}
