package app.nobatet.ui.stylist

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.SelfStylist
import app.nobatet.data.SelfStylistService
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Muted
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatDuration
import app.nobatet.util.formatToman
import app.nobatet.util.normalizeDigits
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch

private const val REBOOK_MAX_DAYS = 365

/** «خدمات»: the stylist's own price/duration per service (blank = the salon's) and their «وقت نوبت بعدی» SMS. */
@Composable
fun StylistServicesScreen(container: AppContainer, stylist: SelfStylist, onChanged: () -> Unit) {
    val snackbar = remember { SnackbarHostState() }
    Box(Modifier.fillMaxSize()) {
        val services = stylist.services.filter { it.service.active }
        if (services.isEmpty()) Empty("هنوز خدمتی به شما اختصاص داده نشده", "مدیر سالن خدمات شما را مشخص می‌کند.")
        else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            items(services, key = { it.serviceId }) { ServiceEditor(container, it, snackbar, onChanged) }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }
}

@Composable
private fun ServiceEditor(container: AppContainer, s: SelfStylistService, snackbar: SnackbarHostState, onChanged: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var price by remember(s) { mutableStateOf(s.overridePriceToman?.toString().orEmpty()) }
    var duration by remember(s) { mutableStateOf(s.overrideDurationMinutes?.toString().orEmpty()) }
    var rebookOn by remember(s) { mutableStateOf(s.overrideRebookReminderEnabled ?: s.service.rebookReminderEnabled) }
    var rebookDays by remember(s) { mutableStateOf((s.overrideRebookReminderDays ?: s.service.rebookReminderDays).toString()) }
    var saving by remember { mutableStateOf(false) }
    AppCard {
        Text(s.service.name, color = c.ink, style = MaterialTheme.typography.titleSmall)
        Muted("سالن: ${formatDuration(s.service.durationMinutes)}، ${formatToman(s.service.priceToman)}")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                price.toPersianDigits(), { price = it.normalizeDigits().filter(Char::isDigit).take(9) }, label = { Text("قیمت شما (تومان)") }, singleLine = true,
                modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), placeholder = { Text("مثل سالن") },
            )
            OutlinedTextField(
                duration.toPersianDigits(), { duration = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("مدت (دقیقه)") }, singleLine = true,
                modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), placeholder = { Text("مثل سالن") },
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("پیامک «وقت نوبت بعدی»", color = c.ink, modifier = Modifier.weight(1f))
            Switch(checked = rebookOn, onCheckedChange = { rebookOn = it }, colors = SwitchDefaults.colors(checkedTrackColor = c.accent))
        }
        if (rebookOn) OutlinedTextField(
            rebookDays.toPersianDigits(), { rebookDays = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("چند روز بعد از نوبت") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
        )
        TextButton(enabled = !saving, onClick = {
            val days = rebookDays.toIntOrNull()
            if (rebookOn && (days == null || days !in 1..REBOOK_MAX_DAYS)) {
                scope.launch { snackbar.showSnackbar("فاصله یادآوری باید بین ۱ تا ۳۶۵ روز باشد") }
                return@TextButton
            }
            scope.launch {
                saving = true
                runCatching {
                    // null = the salon's value (a blank price/duration resets it); nulls are sent on purpose
                    container.api.updateMyService(
                        s.serviceId,
                        app.nobatet.data.jsonBody(
                            "overridePriceToman" to price.toIntOrNull(),
                            "overrideDurationMinutes" to duration.toIntOrNull()?.takeIf { it > 0 },
                            "overrideRebookReminderEnabled" to rebookOn.takeIf { it != s.service.rebookReminderEnabled },
                            "overrideRebookReminderDays" to (if (rebookOn) days?.takeIf { it != s.service.rebookReminderDays } else null),
                        ),
                    )
                }.onSuccess { snackbar.showSnackbar("ذخیره شد"); onChanged() }
                    .onFailure { snackbar.showSnackbar(persianError(it, "ذخیره تغییرات انجام نشد", container.json)) }
                saving = false
            }
        }) { Text(if (saving) "در حال ذخیره..." else "ذخیره") }
    }
}
