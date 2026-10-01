package app.nobatet.ui.stylist

import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.Icons
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import app.nobatet.ui.components.AppSwitch
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.HoursBody
import app.nobatet.data.HoursEntry
import app.nobatet.data.NewTimeOff
import app.nobatet.data.SelfStylist
import app.nobatet.data.TimeOff
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.DayStrip
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PickerField
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.TimePickerDialog
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.salonWallTimeToInstant
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate

/** Saturday first, as on the web; apps/api's dayOfWeek is 0 = Sunday … 6 = Saturday. */
private val WEEK = listOf(6 to "شنبه", 0 to "یکشنبه", 1 to "دوشنبه", 2 to "سه‌شنبه", 3 to "چهارشنبه", 4 to "پنجشنبه", 5 to "جمعه")

private data class DayHours(val open: Boolean, val start: Int, val end: Int)

/** «ساعات کاری»: the weekly hours (PUT /stylists/me/working-hours) and time off. */
@Composable
fun StylistScheduleScreen(container: AppContainer, stylist: SelfStylist, onChanged: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val tz = stylist.salon.timezone
    val hours = remember(stylist) {
        mutableStateListOf(*WEEK.map { (d, _) ->
            stylist.workingHours.firstOrNull { it.dayOfWeek == d }?.let { DayHours(true, it.startMinute, it.endMinute) } ?: DayHours(false, 10 * 60, 20 * 60)
        }.toTypedArray())
    }
    var picking by remember { mutableStateOf<Pair<Int, Boolean>?>(null) } // day index, isStart
    var saving by remember { mutableStateOf(false) }
    var timeOff by remember { mutableStateOf<List<TimeOff>>(emptyList()) }
    var offFrom by remember { mutableStateOf<LocalDate?>(null) }
    var offTo by remember { mutableStateOf<LocalDate?>(null) }
    var offReason by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { timeOff = runCatching { container.api.myTimeOff() }.getOrDefault(emptyList()) }
    val today = salonToday(tz)

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppCard {
                SectionTitle("روزهای کاری")
                WEEK.forEachIndexed { i, (_, name) ->
                    val h = hours[i]
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(name, color = c.ink, modifier = Modifier.weight(1f))
                        if (h.open) {
                            AppTextButton(onClick = { picking = i to true }) { Text(formatClock(h.start)) }
                            Text("تا", color = c.muted)
                            AppTextButton(onClick = { picking = i to false }) { Text(formatClock(h.end)) }
                            // the web's copy button: this day's hours onto every open day
                            IconButton(
                                onClick = { hours.indices.forEach { j -> if (hours[j].open) hours[j] = hours[j].copy(start = h.start, end = h.end) } },
                                modifier = Modifier.size(40.dp).clip(RoundedCornerShape(14.dp)).background(c.card2),
                            ) { Icon(Icons.Outlined.ContentCopy, contentDescription = "اعمال ساعت $name به همه روزهای کاری", tint = c.muted, modifier = Modifier.size(18.dp)) }
                        } else Muted("تعطیل")
                        AppSwitch(checked = h.open, onCheckedChange = { hours[i] = h.copy(open = it) })
                    }
                }
                Muted("با دکمه کپی، ساعت همان روز روی همه روزهای کاری اعمال می‌شود.")
                PrimaryButton(if (saving) "در حال ذخیره..." else "ذخیره ساعات کاری", enabled = !saving) {
                    val bad = hours.indexOfFirst { it.open && it.start >= it.end }
                    if (bad >= 0) {
                        scope.launch { Toasts.error("ساعت پایان ${WEEK[bad].second} باید بعد از ساعت شروع باشد") }
                        return@PrimaryButton
                    }
                    scope.launch {
                        saving = true
                        runCatching {
                            container.api.setMyHours(HoursBody(WEEK.mapIndexedNotNull { i, (d, _) -> hours[i].takeIf { it.open }?.let { HoursEntry(d, it.start, it.end) } }))
                        }.onSuccess { Toasts.success("ساعات کاری ذخیره شد"); onChanged() }
                            .onFailure { Toasts.error(persianError(it, "ذخیره ساعات کاری انجام نشد", container.json)) }
                        saving = false
                    }
                }
            }

            AppCard {
                SectionTitle("مرخصی")
                Muted("در روزهای مرخصی نوبت آنلاین نمی‌گیرید.")
                Muted("از روز")
                DayStrip((0L until 60L).map { today.plusDays(it) }, offFrom, today) { offFrom = it; if (offTo == null || offTo!!.isBefore(it)) offTo = it }
                Muted("تا روز")
                DayStrip((0L until 60L).map { today.plusDays(it) }, offTo, today) { offTo = it }
                AppTextField(offReason, { offReason = it.take(200) }, label = { Text("علت (اختیاری)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                PrimaryButton("ثبت مرخصی") {
                    val from = offFrom
                    val to = offTo
                    if (from == null || to == null) {
                        scope.launch { Toasts.error("روز شروع و پایان مرخصی را انتخاب کنید") }
                        return@PrimaryButton
                    }
                    scope.launch {
                        runCatching {
                            container.api.addTimeOff(
                                NewTimeOff(
                                    salonWallTimeToInstant(from, 0, tz).toString(),
                                    salonWallTimeToInstant(to.plusDays(1), 0, tz).toString(),
                                    offReason.trim().ifEmpty { null },
                                ),
                            )
                        }.onSuccess { t -> timeOff = (timeOff + t).sortedBy { it.startAt }; offFrom = null; offTo = null; offReason = ""; Toasts.success("مرخصی ثبت شد") }
                            .onFailure { Toasts.error(persianError(it, "ثبت مرخصی انجام نشد", container.json)) }
                    }
                }
            }
            timeOff.filter { Instant.parse(it.endAt).isAfter(Instant.now()) }.forEach { t ->
                AppCard {
                    val from = Instant.parse(t.startAt).toSalonDateTime(tz)
                    val to = Instant.parse(t.endAt).toSalonDateTime(tz).minusMinutes(1)
                    Text(if (from.toLocalDate() == to.toLocalDate()) from.toLocalDate().persianLabel() else "${from.toLocalDate().persianLabel()} تا ${to.toLocalDate().persianLabel()}", color = c.ink)
                    t.reason?.let { Muted(it) }
                    AppTextButton(onClick = {
                        scope.launch { runCatching { container.api.deleteTimeOff(t.id) }.onSuccess { timeOff = timeOff - t } }
                    }) { Text("حذف مرخصی", color = c.danger) }
                }
            }
        }
    }

    picking?.let { (i, isStart) ->
        val h = hours[i]
        TimePickerDialog(
            title = "${WEEK[i].second}، ${if (isStart) "ساعت شروع" else "ساعت پایان"}",
            value = if (isStart) h.start else h.end, from = 0, to = 24 * 60 - 15,
            onDismiss = { picking = null },
            onPick = { m -> hours[i] = if (isStart) h.copy(start = m) else h.copy(end = m); picking = null },
        )
    }
}
