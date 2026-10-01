package app.nobatet.ui.staff

import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentPatch
import app.nobatet.data.StaffAppointment
import app.nobatet.data.StaffBookingRequest
import app.nobatet.data.persianError
import app.nobatet.ui.components.DayStrip
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.TimeChips
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatDuration
import app.nobatet.util.formatToman
import app.nobatet.util.isValidIranianMobile
import app.nobatet.util.normalizeDigits
import app.nobatet.util.salonToday
import app.nobatet.util.salonWallTimeToInstant
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime

/** A service the booking can include, with this stylist's price and duration. */
data class BookableService(val id: String, val name: String, val price: Int, val duration: Int)

/**
 * The salon/stylist books a customer (phone call or walk-in) or edits an open booking — the web's
 * SalonBookingSheet. Any time 06:00–23:45 in 15-minute steps (today: from now), the stylist's free
 * online slots highlighted as quick picks; apps/api still refuses overlaps and time off.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StaffBookingSheet(
    container: AppContainer,
    salonSlug: String,
    timezone: String,
    stylistId: String,
    services: List<BookableService>,
    editing: StaffAppointment?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit,
    /** A new booking started from the week view: that day and minute. */
    prefill: Pair<LocalDate, Int>? = null,
) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val today = salonToday(timezone)
    val editStart = editing?.let { Instant.parse(it.startAt).toSalonDateTime(timezone) }

    var phone by remember { mutableStateOf(editing?.customer?.phone.orEmpty()) }
    var firstName by remember { mutableStateOf(editing?.customer?.firstName.orEmpty()) }
    var lastName by remember { mutableStateOf(editing?.customer?.lastName.orEmpty()) }
    var known by remember { mutableStateOf(false) }
    var chosen by remember { mutableStateOf<List<String>>(editing?.services?.map { it.serviceId } ?: emptyList()) }
    var date by remember { mutableStateOf(editStart?.toLocalDate() ?: prefill?.first ?: today) }
    var minute by remember { mutableStateOf(editStart?.let { it.hour * 60 + it.minute } ?: prefill?.second) }
    var notes by remember { mutableStateOf(editing?.notes.orEmpty()) }
    var free by remember { mutableStateOf(emptySet<Int>()) }
    var saving by remember { mutableStateOf(false) }

    // a returning customer: fill in their name
    LaunchedEffect(phone) {
        if (editing == null && isValidIranianMobile(phone)) {
            runCatching { container.api.lookupCustomer(phone) }.getOrNull()?.let { r ->
                known = r.found
                if (r.found) {
                    if (firstName.isBlank()) firstName = r.firstName.orEmpty()
                    if (lastName.isBlank()) lastName = r.lastName.orEmpty()
                }
            }
        } else known = false
    }
    LaunchedEffect(date, chosen) {
        free = if (chosen.isEmpty()) emptySet() else runCatching {
            container.api.availability(salonSlug, date.toString(), chosen.joinToString(","), stylistId).filter { it.available }.map { it.startMinute }.toSet()
        }.getOrDefault(emptySet())
    }

    val nowMinute = LocalTime.now(app.nobatet.util.zone(timezone)).let { it.hour * 60 + it.minute }
    val times = (6 * 60..23 * 60 + 45 step 15).filter { date != today || it >= nowMinute - 60 || it == minute }
    val selected = services.filter { it.id in chosen }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.bg) {
        Box(Modifier.fillMaxHeight(0.92f)) {
            Column(Modifier.fillMaxWidth().imePadding().navigationBarsPadding()) {
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    SectionTitle(if (editing == null) "نوبت تازه" else "ویرایش نوبت")
                    if (editing == null) {
                        AppTextField(
                            phone, { phone = it.normalizeDigits().filter(Char::isDigit).take(11) }, label = { Text("شماره موبایل مشتری") }, singleLine = true,
                            modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        )
                        if (known) Muted("مشتری قبلی؛ نام از نوبت‌های قبلی پر شد.")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        AppTextField(firstName, { firstName = it }, label = { Text("نام") }, singleLine = true, modifier = Modifier.weight(1f))
                        AppTextField(lastName, { lastName = it }, label = { Text("نام خانوادگی") }, singleLine = true, modifier = Modifier.weight(1f))
                    }
                    Muted("خدمات")
                    services.forEach { s ->
                        val on = s.id in chosen
                        Column(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(if (on) c.accentSoft else c.card)
                                .border(if (on) 2.dp else 1.dp, if (on) c.accent else c.line, RoundedCornerShape(16.dp))
                                .clickable { chosen = if (on) chosen - s.id else chosen + s.id }.padding(12.dp),
                        ) {
                            Text(s.name, color = c.ink)
                            Muted("${formatDuration(s.duration)}، ${formatToman(s.price)}")
                        }
                    }
                    Muted("روز")
                    DayStrip((0L until 30L).map { today.plusDays(it) }, date, today) { date = it }
                    Muted(if (free.isNotEmpty()) "ساعت — ساعت‌های سبز خالی‌اند؛ برای مشتری حضوری هر ساعتی را می‌توانید انتخاب کنید." else "ساعت")
                    TimeChips(times, minute, free) { minute = it }
                    AppTextField(notes, { notes = it.take(500) }, label = { Text("یادداشت (اختیاری)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                    if (selected.isNotEmpty()) Muted("${formatDuration(selected.sumOf { it.duration })}، ${formatToman(selected.sumOf { it.price })}")
                }
                Box(Modifier.padding(16.dp)) {
                    PrimaryButton(if (saving) "در حال ذخیره..." else if (editing == null) "ثبت نوبت" else "ذخیره تغییرات", enabled = !saving) {
                        val m = minute
                        val problem = when {
                            editing == null && !isValidIranianMobile(phone) -> "شماره موبایل مشتری باید با ۰۹ شروع شده و ۱۱ رقم باشد"
                            !known && editing == null && firstName.isBlank() -> "نام مشتری را وارد کنید"
                            chosen.isEmpty() -> "دست‌کم یک خدمت انتخاب کنید"
                            m == null -> "ساعت نوبت را انتخاب کنید"
                            else -> null
                        }
                        if (problem != null) {
                            scope.launch { Toasts.error(problem) }
                            return@PrimaryButton
                        }
                        scope.launch {
                            saving = true
                            try {
                                val startAt = salonWallTimeToInstant(date, m!!, timezone).toString()
                                if (editing == null) {
                                    container.api.staffBook(
                                        StaffBookingRequest(phone, firstName.trim().ifEmpty { null }, lastName.trim().ifEmpty { null }, stylistId, chosen, startAt, notes.trim().ifEmpty { null }),
                                    )
                                } else {
                                    // only what changed
                                    val servicesChanged = chosen.toSet() != editing.services.map { it.serviceId }.toSet()
                                    container.api.editAppointment(
                                        editing.id,
                                        AppointmentPatch(
                                            serviceIds = chosen.takeIf { servicesChanged },
                                            startAt = startAt.takeIf { Instant.parse(it) != Instant.parse(editing.startAt) },
                                            notes = notes.trim().takeIf { it != editing.notes.orEmpty() },
                                            customerFirstName = firstName.trim().takeIf { it != editing.customer.firstName },
                                            customerLastName = lastName.trim().takeIf { it != editing.customer.lastName },
                                        ),
                                    )
                                }
                                onSaved()
                            } catch (e: Exception) {
                                Toasts.error(persianError(e, if (editing == null) "ثبت نوبت انجام نشد" else "ذخیره تغییرات نوبت انجام نشد", container.json))
                            } finally {
                                saving = false
                            }
                        }
                    }
                }
            }
        }
    }
}
