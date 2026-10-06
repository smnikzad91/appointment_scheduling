package app.nobatet.ui.staff

import app.nobatet.ui.components.SecondaryButton
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.data.label
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.StatusChip
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.formatToman
import app.nobatet.util.persianDateTime
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import java.time.Instant
import androidx.compose.foundation.background
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.font.FontWeight
import app.nobatet.ui.components.AppTextButton

/** What a status may become, as apps/web components/app/appointments.tsx NEXT_ACTIONS. */
fun nextActions(status: AppointmentStatus): List<Pair<AppointmentStatus, String>> = when (status) {
    AppointmentStatus.PENDING -> listOf(
        AppointmentStatus.CONFIRMED to "تایید نوبت", AppointmentStatus.COMPLETED to "انجام شد",
        AppointmentStatus.NO_SHOW to "مشتری نیامد", AppointmentStatus.CANCELLED to "لغو نوبت",
    )
    AppointmentStatus.CONFIRMED -> listOf(
        AppointmentStatus.COMPLETED to "انجام شد", AppointmentStatus.NO_SHOW to "مشتری نیامد", AppointmentStatus.CANCELLED to "لغو نوبت",
    )
    else -> emptyList()
}

val StaffAppointment.isOpen get() = status == AppointmentStatus.PENDING || status == AppointmentStatus.CONFIRMED

/** One appointment in a staff list: time, customer, services, status. */
@Composable
fun StaffAppointmentCard(a: StaffAppointment, timezone: String?, showStylist: String? = null, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val start = Instant.parse(a.startAt).toSalonDateTime(timezone)
    val end = Instant.parse(a.endAt).toSalonDateTime(timezone)
    AppCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                "${formatClock(start.hour * 60 + start.minute)} تا ${formatClock(end.hour * 60 + end.minute)}",
                color = c.ink, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f),
            )
            StatusChip(a.status)
        }
        Text(a.customerName, color = c.ink)
        Muted(a.services.joinToString("، ") { it.service.name } + (showStylist?.let { "، با $it" } ?: ""))
    }
}

/** The status-action sheet: details, call, edit, and the next statuses. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppointmentDetailSheet(
    a: StaffAppointment,
    timezone: String?,
    busy: Boolean,
    onDismiss: () -> Unit,
    /** balanceMethod: COMPLETED only — ON_SITE or WALLET, how the rest of the price is received. */
    onStatus: (AppointmentStatus, String?) -> Unit,
    onEdit: () -> Unit,
) {
    val c = LocalAppColors.current
    // what's left after the pre-payment; «انجام شد» then asks how it's received
    val remaining = (a.priceToman - if (a.prepaymentStatus == "REFUNDED") 0 else a.prepaidToman).coerceAtLeast(0)
    var choosingBalance by remember(a.id) { mutableStateOf(false) }
    val context = LocalContext.current
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.bg) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                SectionTitle("جزئیات نوبت", Modifier.weight(1f))
                StatusChip(a.status)
            }
            Line("مشتری", a.customerName)
            Line("زمان", Instant.parse(a.startAt).toSalonDateTime(timezone).persianDateTime())
            Line("خدمات", a.services.joinToString("، ") { it.service.name })
            Line("مبلغ", formatToman(a.priceToman))
            if (a.prepaidToman > 0) Line(
                "پیش‌پرداخت",
                formatToman(a.prepaidToman) + when (a.prepaymentStatus) {
                    "REFUNDED" -> "، به مشتری برگشت"
                    "SETTLED" -> "، به کیف پول سالن واریز شد"
                    else -> "؛ دریافت در محل ${formatToman(a.priceToman - a.prepaidToman)}"
                },
            )
            a.serviceLocation?.let { Line("محل", it.label()) }
            a.visitAddress?.let { Line("نشانی مشتری", it) }
            a.notes?.takeIf { it.isNotBlank() }?.let { Line("یادداشت", it) }
            a.customer.phone?.let { phone ->
                SecondaryButton(
                    onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }, modifier = Modifier.fillMaxWidth(),
                ) { Text("تماس با مشتری ${phone.toPersianDigits()}") }
            }
            if (a.isOpen) SecondaryButton(onClick = onEdit, modifier = Modifier.fillMaxWidth()) { Text("ویرایش نوبت") }
            if (a.status == AppointmentStatus.COMPLETED && a.balanceMethod != null) Text(
                when {
                    a.balanceMethod == "ON_SITE" -> "باقی‌مبلغ در محل دریافت شد."
                    a.balancePaidAt != null -> "باقی‌مانده ${formatToman(a.balanceDueToman)} از کیف پول مشتری پرداخت شد."
                    else -> "باقی‌مانده ${formatToman(a.balanceDueToman)} از کیف پول مشتری درخواست شده؛ در انتظار پرداخت مشتری."
                },
                color = c.ink, style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.fillMaxWidth().background(c.card2, RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 12.dp),
            )
            if (choosingBalance) {
                Text("باقی‌مانده ${formatToman(remaining)} را چطور دریافت می‌کنید؟", color = c.ink, fontWeight = FontWeight.Bold)
                PrimaryButton("در محل دریافت کردم (نقد / کارت)", Modifier.fillMaxWidth(), enabled = !busy) { onStatus(AppointmentStatus.COMPLETED, "ON_SITE") }
                SecondaryButton(onClick = { onStatus(AppointmentStatus.COMPLETED, "WALLET") }, modifier = Modifier.fillMaxWidth(), enabled = !busy) { Text("درخواست از کیف پول مشتری") }
                Muted("با «کیف پول»، به مشتری پیامک می‌رود تا باقی‌مانده را در پنل خودش از کیف پول پرداخت کند.")
                AppTextButton(onClick = { choosingBalance = false }, modifier = Modifier.fillMaxWidth()) { Text("انصراف", color = c.muted) }
            } else nextActions(a.status).forEach { (status, label) ->
                PrimaryButton(
                    label, enabled = !busy,
                    color = when (status) {
                        AppointmentStatus.CANCELLED -> c.danger
                        AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED -> null
                        else -> c.muted
                    },
                ) { if (status == AppointmentStatus.COMPLETED && remaining > 0) choosingBalance = true else onStatus(status, null) }
            }
        }
    }
}

@Composable
private fun Line(label: String, value: String) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth()) {
        Text(label, color = c.muted, modifier = Modifier.width(96.dp))
        Text(value, color = c.ink, modifier = Modifier.weight(1f))
    }
}
