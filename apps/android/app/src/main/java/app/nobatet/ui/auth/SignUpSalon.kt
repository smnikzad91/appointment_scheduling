package app.nobatet.ui.auth

import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextField
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AuthResponse
import app.nobatet.data.RegisterSalonRequest
import app.nobatet.data.SalonKind
import app.nobatet.data.ServiceLocation
import app.nobatet.data.persianError
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PickerField
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.salon.PinMap
import app.nobatet.ui.salon.rememberProvinces
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.isValidIranianMobile
import app.nobatet.util.normalizeDigits
import kotlinx.coroutines.launch

private val PLACE_LABEL = linkedMapOf(
    ServiceLocation.IN_SALON to "در یک سالن، با نام خودم", ServiceLocation.STUDIO to "استودیو شخصی",
    ServiceLocation.HOME to "در منزل آرایشگر", ServiceLocation.CLIENT_HOME to "خدمات در منزل مشتری",
)

/**
 * «ثبت‌نام سالن» / «آرایشگر مستقل هستم» — the web's /signup-salon: owner account + salon (or an
 * independent stylist's one-person business) in one go, signed in straight away; the platform
 * admin approves it before it shows publicly.
 */
@Composable
fun SignUpSalonForm(container: AppContainer, onSignedIn: (AuthResponse) -> Unit, onError: (String) -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val provinces = rememberProvinces(container)
    var kind by rememberSaveable { mutableStateOf(SalonKind.SALON) }
    var firstName by rememberSaveable { mutableStateOf("") }
    var lastName by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var salonName by rememberSaveable { mutableStateOf("") }
    var province by rememberSaveable { mutableStateOf("") }
    var city by rememberSaveable { mutableStateOf("") }
    var address by rememberSaveable { mutableStateOf("") }
    var pin by remember { mutableStateOf<Pair<Double, Double>?>(null) }
    // IN_SALON first: most independent stylists rent a chair in a salon, under their own name
    var places by remember { mutableStateOf(setOf(ServiceLocation.IN_SALON)) }
    var host by rememberSaveable { mutableStateOf("") }
    var picking by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val independent = kind == SalonKind.INDEPENDENT

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        app.nobatet.ui.components.ChipTabs(listOf(SalonKind.SALON to "سالن", SalonKind.INDEPENDENT to "آرایشگر مستقل هستم"), kind, Modifier.padding(horizontal = 0.dp)) { kind = it }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AppTextField(firstName, { firstName = it }, label = { Text("نام") }, singleLine = true, modifier = Modifier.weight(1f))
            AppTextField(lastName, { lastName = it }, label = { Text("نام خانوادگی") }, singleLine = true, modifier = Modifier.weight(1f))
        }
        AppTextField(phone, { phone = it.normalizeDigits().filter(Char::isDigit).take(11) }, label = { Text("شماره موبایل برای ورود") }, singleLine = true,
            modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
        AppTextField(password, { password = it }, label = { Text("رمز عبور (حداقل ۸ کاراکتر)") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
        AppTextField(salonName, { salonName = it.take(100) }, label = { Text(if (independent) "نام کاری" else "نام سالن") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        if (independent) {
            Muted("کجا کار می‌کنید؟")
            PLACE_LABEL.forEach { (loc, label) ->
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically, modifier = Modifier.clickable { places = if (loc in places) places - loc else places + loc }) {
                    Checkbox(checked = loc in places, onCheckedChange = { places = if (it) places + loc else places - loc })
                    Text(label, color = c.ink)
                }
            }
            if (ServiceLocation.IN_SALON in places) AppTextField(host, { host = it.take(100) }, label = { Text("نام سالن محل کار") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            PickerField("استان", province.ifEmpty { "انتخاب کنید" }, Modifier.weight(1f)) { picking = "province" }
            PickerField("شهر / شهرستان", city.ifEmpty { "ابتدا استان" }, Modifier.weight(1f)) { if (province.isNotEmpty()) picking = "city" }
        }
        AppTextField(address, { address = it.take(300) }, label = { Text("آدرس دقیق") }, minLines = 2, modifier = Modifier.fillMaxWidth())
        Muted(if (independent && ServiceLocation.IN_SALON !in places && ServiceLocation.STUDIO !in places) "محل را روی نقشه بزنید؛ نشانی شما عمومی نمایش داده نمی‌شود." else "محل را روی نقشه بزنید.")
        PinMap(pin, provinces.firstOrNull { it.name == province }?.center) { pin = it }
        PrimaryButton(if (busy) "در حال ثبت‌نام..." else "ثبت‌نام", enabled = !busy) {
            val p = pin
            val problem = when {
                firstName.isBlank() || lastName.isBlank() -> "نام و نام خانوادگی را وارد کنید"
                !isValidIranianMobile(phone) -> "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد"
                password.length < 8 -> "رمز عبور باید حداقل ۸ کاراکتر باشد"
                salonName.isBlank() -> if (independent) "نام کاری را وارد کنید" else "نام سالن را وارد کنید"
                independent && places.isEmpty() -> "محل ارائه خدمات را انتخاب کنید"
                province.isEmpty() || city.isEmpty() -> "استان و شهر را انتخاب کنید"
                address.isBlank() -> "آدرس را وارد کنید"
                p == null -> "محل را روی نقشه مشخص کنید"
                else -> null
            }
            if (problem != null) return@PrimaryButton onError(problem)
            scope.launch {
                busy = true
                runCatching {
                    container.api.registerSalonOwner(
                        RegisterSalonRequest(
                            firstName.trim(), lastName.trim(), phone, password, salonName.trim(), province, city, address.trim(), p!!.first, p.second, kind,
                            serviceLocations = if (independent) places.toList() else null,
                            hostSalonName = if (independent && ServiceLocation.IN_SALON in places) host.trim().ifEmpty { null } else null,
                        ),
                    )
                }.onSuccess(onSignedIn).onFailure { onError(persianError(it, "ثبت‌نام انجام نشد؛ دوباره تلاش کنید", container.json)) }
                busy = false
            }
        }
    }

    picking?.let { what ->
        val options = if (what == "province") provinces.map { it.name } else provinces.firstOrNull { it.name == province }?.cities.orEmpty()
        var query by remember(what) { mutableStateOf("") }
        AppDialog(
            onDismissRequest = { picking = null },
            title = { Text(if (what == "province") "استان" else "شهر / شهرستان") },
            text = {
                Column {
                    AppTextField(query, { query = it }, placeholder = { Text("جستجو") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    LazyColumn(Modifier.heightIn(max = 360.dp)) {
                        items(options.filter { query.isBlank() || it.contains(query.trim()) }) { o ->
                            Text(o, color = c.ink, modifier = Modifier.fillMaxWidth().clickable {
                                if (what == "province") { if (o != province) city = ""; province = o; picking = "city" } else { city = o; picking = null }
                            }.padding(vertical = 12.dp))
                        }
                    }
                }
            },
            confirmButton = { AppTextButton(onClick = { picking = null }) { Text("بستن") } },
        )
    }
}
