package app.nobatet.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.isWeekend
import app.nobatet.util.jalaliMonthName
import app.nobatet.util.persianName
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import java.time.LocalDate

/** «مهر ۱۴۰۵» with previous/next (the web's PeriodSwitcher); next stops at the current month. */
@Composable
fun MonthSwitcher(label: String, onPrev: () -> Unit, onNext: () -> Unit, canNext: Boolean, canPrev: Boolean = true) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        // RTL: «right» = previous month
        IconButton(onClick = onPrev, enabled = canPrev) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = "ماه قبل") }
        Text(label, style = MaterialTheme.typography.titleMedium, color = c.ink, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
        IconButton(onClick = onNext, enabled = canNext) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = "ماه بعد") }
    }
}

/** A strip of days (Jalali), «امروز» first, Fridays in red. */
@Composable
fun DayStrip(days: List<LocalDate>, selected: LocalDate?, today: LocalDate, onSelect: (LocalDate) -> Unit) {
    val c = LocalAppColors.current
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 4.dp)) {
        items(days, key = { it.toString() }) { d ->
            val on = d == selected
            val j = d.toJalali()
            Column(
                Modifier.width(64.dp).clip(RoundedCornerShape(18.dp)).background(if (on) c.accent else c.card)
                    .border(1.dp, if (on) c.accent else c.line, RoundedCornerShape(18.dp)).clickable { onSelect(d) }.padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val fg = if (on) c.accentInk else if (d.isWeekend) c.danger else c.ink
                Text(if (d == today) "امروز" else d.dayOfWeek.persianName(), color = fg, style = MaterialTheme.typography.labelMedium)
                Text(j.day.toString().toPersianDigits(), color = fg, style = MaterialTheme.typography.titleMedium)
                Text(jalaliMonthName(j.month), color = fg, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

/** Times as chips (salon-local minutes); `highlighted` = free online slots shown as quick picks. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun TimeChips(options: List<Int>, selected: Int?, highlighted: Set<Int> = emptySet(), onSelect: (Int) -> Unit) {
    val c = LocalAppColors.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.forEach { m ->
            val on = m == selected
            val bg = when { on -> c.accent; m in highlighted -> c.accentSoft; else -> c.card }
            Text(
                formatClock(m), color = if (on) c.accentInk else c.ink, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center,
                modifier = Modifier.width(72.dp).clip(RoundedCornerShape(14.dp)).background(bg)
                    .border(1.dp, if (on) c.accent else c.line, RoundedCornerShape(14.dp)).clickable { onSelect(m) }.padding(vertical = 9.dp),
            )
        }
    }
}

/** A time in 15-minute steps (the web's TimePicker sheet) — never the OS clock with Latin digits. */
@Composable
fun TimePickerDialog(title: String, value: Int?, from: Int = 6 * 60, to: Int = 23 * 60 + 45, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
                TimeChips((from..to step 15).toList(), value) { onPick(it) }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("بستن") } },
    )
}

/** A field-looking button showing a value (opens a picker). */
@Composable
fun PickerField(label: String, value: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Column(
        modifier.clip(RoundedCornerShape(14.dp)).background(Color.Transparent).border(1.dp, c.line, RoundedCornerShape(14.dp)).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Text(label, color = c.muted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = c.ink, style = MaterialTheme.typography.bodyLarge)
    }
}
