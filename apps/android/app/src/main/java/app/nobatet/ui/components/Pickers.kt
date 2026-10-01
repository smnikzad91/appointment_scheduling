package app.nobatet.ui.components

import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.runtime.setValue
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.getValue
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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

private val PERIODS = listOf(
    Triple("صبح", 0, 12 * 60),
    Triple("ظهر", 12 * 60, 16 * 60),
    Triple("عصر", 16 * 60, 20 * 60),
    Triple("شب", 20 * 60, 24 * 60 + 1), // includes ۲۴:۰۰ as a closing time
)

/**
 * Times grouped by part of day — صبح / ظهر / عصر / شب — four to a row (the web's TimePicker grid).
 * [highlighted] are known-free times: green with a dot, and «همه ساعت‌ها / فقط خالی‌ها» appears;
 * any time can still be picked (walk-ins).
 */
@Composable
fun TimeChips(options: List<Int>, selected: Int?, highlighted: Set<Int> = emptySet(), onSelect: (Int) -> Unit) {
    val c = LocalAppColors.current
    var onlyFree by rememberSaveable { mutableStateOf(false) }
    val all = if (selected == null || selected in options) options else (options + selected).sorted()
    val shown = if (onlyFree && highlighted.isNotEmpty()) all.filter { it in highlighted } else all
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        if (highlighted.isNotEmpty()) {
            Row(Modifier.clip(CircleShape).background(c.card).border(1.dp, c.line, CircleShape).padding(2.dp)) {
                listOf(false to "همه ساعت‌ها", true to "فقط خالی‌ها").forEach { (v, label) ->
                    val on = onlyFree == v
                    Text(
                        label, color = if (on) c.bg else c.muted, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.clip(CircleShape).background(if (on) c.ink else Color.Transparent).clickable { onlyFree = v }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                    )
                }
            }
        }
        PERIODS.forEach { (label, from, to) ->
            val items = shown.filter { it in from until to }
            if (items.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(Modifier.padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(label, color = c.muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Box(Modifier.padding(start = 8.dp).weight(1f).height(1.dp).background(c.line))
                }
                items.chunked(4).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        (0 until 4).forEach { i ->
                            val m = row.getOrNull(i)
                            if (m == null) Spacer(Modifier.weight(1f)) else TimeChip(m, m == selected, m in highlighted, Modifier.weight(1f)) { onSelect(m) }
                        }
                    }
                }
            }
        }
        if (shown.isEmpty()) Text("ساعت خالی‌ای برای این روز نیست.", color = c.muted, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp))
    }
}

@Composable
private fun TimeChip(m: Int, selected: Boolean, free: Boolean, modifier: Modifier, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier.height(44.dp).clip(shape)
            .background(when { selected -> c.accent; free -> c.done.copy(alpha = 0.1f); else -> c.card })
            .then(if (selected) Modifier else Modifier.border(1.dp, if (free) c.done.copy(alpha = 0.4f) else c.line, shape))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        // ۲۴:۰۰ reads as a closing time (formatClock would wrap it to ۰۰:۰۰)
        Text(
            if (m == 24 * 60) "۲۴:۰۰" else formatClock(m), fontSize = 15.sp, fontWeight = FontWeight.Bold,
            color = when { selected -> c.accentInk; free -> c.ink; else -> c.muted },
        )
        if (free && !selected) Box(Modifier.align(Alignment.TopEnd).padding(6.dp).size(6.dp).clip(CircleShape).background(c.done))
    }
}

/** A time in 15-minute steps (the web's TimePicker sheet) — never the OS clock with Latin digits. */
@Composable
fun TimePickerDialog(title: String, value: Int?, from: Int = 6 * 60, to: Int = 23 * 60 + 45, onDismiss: () -> Unit, onPick: (Int) -> Unit) {
    AppDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            Column(Modifier.heightIn(max = 420.dp).verticalScroll(rememberScrollState())) {
                TimeChips((from..to step 15).toList(), value) { onPick(it) }
            }
        },
        confirmButton = { AppTextButton(onClick = onDismiss) { Text("بستن") } },
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
