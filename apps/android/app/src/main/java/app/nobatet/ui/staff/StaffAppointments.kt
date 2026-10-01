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
    onStatus: (AppointmentStatus) -> Unit,
    onEdit: () -> Unit,
) {
    val c = LocalAppColors.current
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
            a.serviceLocation?.let { Line("محل", it.label()) }
            a.visitAddress?.let { Line("نشانی مشتری", it) }
            a.notes?.takeIf { it.isNotBlank() }?.let { Line("یادداشت", it) }
            a.customer.phone?.let { phone ->
                SecondaryButton(
                    onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }, modifier = Modifier.fillMaxWidth(),
                ) { Text("تماس با مشتری ${phone.toPersianDigits()}") }
            }
            if (a.isOpen) SecondaryButton(onClick = onEdit, modifier = Modifier.fillMaxWidth()) { Text("ویرایش نوبت") }
            nextActions(a.status).forEach { (status, label) ->
                PrimaryButton(
                    label, enabled = !busy,
                    color = when (status) {
                        AppointmentStatus.CANCELLED -> c.danger
                        AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED -> null
                        else -> c.muted
                    },
                ) { onStatus(status) }
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
