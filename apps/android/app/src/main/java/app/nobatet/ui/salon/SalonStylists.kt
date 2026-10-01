package app.nobatet.ui.salon

import app.nobatet.ui.components.Toasts
import android.content.Intent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.InviteStylistRequest
import app.nobatet.data.OwnerStylist
import app.nobatet.data.StylistPatch
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.ui.stylist.qrBitmap
import app.nobatet.util.isValidIranianMobile
import app.nobatet.util.normalizeDigits
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject

/** «آرایشگرها»: invite, activation links, on/off, commission and which services each does. */
@Composable
fun SalonStylistsScreen(container: AppContainer, data: SalonData) {
    val c = LocalAppColors.current
    var inviting by remember { mutableStateOf(false) }
    var open by remember { mutableStateOf<OwnerStylist?>(null) }
    var link by remember { mutableStateOf<Pair<String, String>?>(null) } // name, token
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { PrimaryButton("افزودن آرایشگر") { inviting = true } }
            data.subscription?.stylists?.limit?.let { limit ->
                item { Muted("ظرفیت پلن: ${data.subscription!!.stylists.active.toString().toPersianDigits()} از ${limit.toString().toPersianDigits()} آرایشگر فعال") }
            }
            if (data.stylists.isEmpty()) item { Empty("هنوز آرایشگری اضافه نکرده‌اید") }
            items(data.stylists, key = { it.id }) { st ->
                AppCard(Modifier.clickable { open = st }) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        RemoteImage(st.avatarUrl, Modifier.size(44.dp).clip(CircleShape))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(st.displayName, color = if (st.active) c.ink else c.muted, style = MaterialTheme.typography.titleSmall)
                            Muted(buildList {
                                add("سهم ${st.commissionPercent.toInt().toString().toPersianDigits()}٪")
                                add("${st.services.size.toString().toPersianDigits()} خدمت")
                                if (!st.active) add("غیرفعال")
                                if (st.user.mustSetPassword) add("منتظر فعال‌سازی")
                            }.joinToString("، "))
                        }
                    }
                }
            }
        }
    }
    if (inviting) InviteDialog(container, data, onDismiss = { inviting = false }) { st ->
        inviting = false
        data.loadCatalog(); data.loadSubscription()
        st.setupToken?.let { link = st.displayName to it }
    }
    open?.let { st -> StylistDialog(container, data, st, onDismiss = { open = null }, onLink = { token -> open = null; link = st.displayName to token }) }
    link?.let { (name, token) -> SetupLinkDialog(name, token) { link = null } }
}

@Composable
private fun InviteDialog(container: AppContainer, data: SalonData, onDismiss: () -> Unit, onInvited: (OwnerStylist) -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var phone by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    // new stylists default to 20% (the web's invite form)
    var commission by remember { mutableStateOf("20") }
    var chosen by remember { mutableStateOf(data.services.filter { it.active }.map { it.id }.toSet()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("افزودن آرایشگر") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(phone, { phone = it.normalizeDigits().filter(Char::isDigit).take(11) }, label = { Text("شماره موبایل") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(firstName, { firstName = it }, label = { Text("نام") }, singleLine = true, modifier = Modifier.weight(1f))
                    OutlinedTextField(lastName, { lastName = it }, label = { Text("نام خانوادگی") }, singleLine = true, modifier = Modifier.weight(1f))
                }
                OutlinedTextField(displayName, { displayName = it }, label = { Text("نام نمایشی (اختیاری)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(commission.toPersianDigits(), { commission = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("سهم آرایشگر (٪)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                Muted("خدمات")
                data.services.filter { it.active }.forEach { s ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { chosen = if (s.id in chosen) chosen - s.id else chosen + s.id }) {
                        Checkbox(checked = s.id in chosen, onCheckedChange = { chosen = if (it) chosen + s.id else chosen - s.id })
                        Text(s.name, color = c.ink)
                    }
                }
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val pct = commission.toIntOrNull()
                when {
                    !isValidIranianMobile(phone) -> error = "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد"
                    firstName.isBlank() || lastName.isBlank() -> error = "نام و نام خانوادگی را وارد کنید"
                    pct == null || pct !in 0..100 -> error = "سهم باید بین ۰ تا ۱۰۰ باشد"
                    else -> scope.launch {
                        busy = true
                        runCatching {
                            container.api.inviteStylist(
                                InviteStylistRequest(phone, firstName.trim(), lastName.trim(), displayName.trim().ifEmpty { "${firstName.trim()} ${lastName.trim()}" }, chosen.toList(), pct.toDouble()),
                            )
                        }.onSuccess(onInvited).onFailure { error = persianError(it, "افزودن آرایشگر انجام نشد", container.json) }
                        busy = false
                    }
                }
            }) { Text("افزودن") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

@Composable
private fun StylistDialog(container: AppContainer, data: SalonData, st: OwnerStylist, onDismiss: () -> Unit, onLink: (String) -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var active by remember { mutableStateOf(st.active) }
    var commission by remember { mutableStateOf(st.commissionPercent.toInt().toString()) }
    var chosen by remember { mutableStateOf(st.services.map { it.serviceId }.toSet()) }
    // per service: this stylist's own price / duration / rate ("" = the salon's / their default)
    var overrides by remember {
        mutableStateOf(st.services.associate { it.serviceId to Triple(it.overridePriceToman?.toString().orEmpty(), it.overrideDurationMinutes?.toString().orEmpty(), it.commissionPercent?.toInt()?.toString().orEmpty()) })
    }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(st.displayName) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                st.user.phone?.let { Muted(it.toPersianDigits()) }
                if (st.user.mustSetPassword) Muted("هنوز حساب را فعال نکرده است.")
                TextButton(onClick = {
                    scope.launch { runCatching { container.api.newSetupLink(st.id) }.onSuccess { onLink(it.setupToken) }.onFailure { error = persianError(it, "ساخت لینک انجام نشد", container.json) } }
                }) { Text(if (st.user.mustSetPassword) "لینک فعال‌سازی تازه" else "لینک تعیین رمز تازه") }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("فعال", color = c.ink, modifier = Modifier.weight(1f))
                    Switch(checked = active, onCheckedChange = { active = it }, colors = SwitchDefaults.colors(checkedTrackColor = c.accent))
                }
                OutlinedTextField(commission.toPersianDigits(), { commission = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("سهم آرایشگر (٪)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                Muted("خدماتی که انجام می‌دهد (خالی = قیمت و مدت سالن، سهم پیش‌فرض)")
                data.services.filter { it.active }.forEach { s ->
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { chosen = if (s.id in chosen) chosen - s.id else chosen + s.id }) {
                        Checkbox(checked = s.id in chosen, onCheckedChange = { chosen = if (it) chosen + s.id else chosen - s.id })
                        Text(s.name, color = c.ink)
                    }
                    if (s.id in chosen) {
                        val (price, minutes, rate) = overrides[s.id] ?: Triple("", "", "")
                        fun set(t: Triple<String, String, String>) { overrides = overrides + (s.id to t) }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            OutlinedTextField(price.toPersianDigits(), { set(Triple(it.normalizeDigits().filter(Char::isDigit).take(9), minutes, rate)) }, label = { Text("قیمت") }, singleLine = true,
                                modifier = Modifier.weight(1.4f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                            OutlinedTextField(minutes.toPersianDigits(), { set(Triple(price, it.normalizeDigits().filter(Char::isDigit).take(3), rate)) }, label = { Text("دقیقه") }, singleLine = true,
                                modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                            OutlinedTextField(rate.toPersianDigits(), { set(Triple(price, minutes, it.normalizeDigits().filter(Char::isDigit).take(3))) }, label = { Text("سهم ٪") }, singleLine = true,
                                modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                        }
                    }
                }
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val pct = commission.toIntOrNull()
                if (pct == null || pct !in 0..100) { error = "سهم باید بین ۰ تا ۱۰۰ باشد"; return@TextButton }
                if (overrides.filterKeys { it in chosen }.values.any { (it.third.toIntOrNull() ?: 0) > 100 }) { error = "سهم هر خدمت باید بین ۰ تا ۱۰۰ باشد"; return@TextButton }
                scope.launch {
                    busy = true
                    try {
                        if (active != st.active || pct.toDouble() != st.commissionPercent) {
                            container.api.updateStylist(st.id, StylistPatch(active = active.takeIf { it != st.active }, commissionPercent = pct.toDouble().takeIf { it != st.commissionPercent }))
                        }
                        // services and their own price/duration/rate (nulls on purpose: blank = the salon's / the default)
                        val entries = chosen.map { id ->
                            val (price, minutes, rate) = overrides[id] ?: Triple("", "", "")
                            app.nobatet.data.jsonBody(
                                "serviceId" to id, "overridePriceToman" to price.toIntOrNull(),
                                "overrideDurationMinutes" to minutes.toIntOrNull()?.takeIf { it > 0 }, "commissionPercent" to rate.toIntOrNull()?.toDouble(),
                            )
                        }
                        container.api.setStylistServices(st.id, JsonObject(mapOf("services" to JsonArray(entries))))
                        data.loadCatalog(); data.loadSubscription()
                        onDismiss()
                        Toasts.success("ذخیره شد")
                    } catch (e: Exception) {
                        error = persianError(e, "ذخیره تغییرات انجام نشد", container.json)
                    } finally {
                        busy = false
                    }
                }
            }) { Text("ذخیره") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

/** The one-time «set your password» link for a stylist: QR on white, share, as the web's SetupLinkCard. */
@Composable
private fun SetupLinkDialog(name: String, token: String, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val url = BuildConfig.WEB_BASE_URL.trimEnd('/') + "/set-password/" + token
    val qr = remember(url) { qrBitmap(url) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("لینک فعال‌سازی $name") },
        text = {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Muted("این لینک را برای آرایشگر بفرستید تا رمز بگذارد و وارد پنل شود. تا ۷ روز و فقط یک بار کار می‌کند.")
                Image(qr.asImageBitmap(), contentDescription = "کد QR لینک فعال‌سازی", modifier = Modifier.size(220.dp).background(androidx.compose.ui.graphics.Color.White).padding(8.dp))
            }
        },
        confirmButton = {
            TextButton(onClick = {
                context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "لینک فعال‌سازی حساب آرایشگری شما در نوبتت: $url"), "ارسال لینک"))
            }) { Text("ارسال لینک") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("بستن") } },
    )
}
