package app.nobatet.ui.auth

import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextField
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import app.nobatet.util.formatAmount
import app.nobatet.util.toPersianDigits
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
import app.nobatet.data.SIGNUP_SOURCE_LABEL
import app.nobatet.data.SMS_BILLING_NOTE
import app.nobatet.data.SignUpPlan
import app.nobatet.data.SignUpPlans
import app.nobatet.data.trialBadge
import app.nobatet.data.SalonKind
import app.nobatet.data.ServiceLocation
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppChip
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
@OptIn(ExperimentalLayoutApi::class)
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
    // plans for this kind of business (apps/web /api/public/pricing); switching kind falls back to its recommended/first plan
    var offer by remember { mutableStateOf<SignUpPlans?>(null) }
    LaunchedEffect(Unit) { offer = runCatching { container.web.signUpPlans() }.getOrDefault(SignUpPlans()) }
    var planId by rememberSaveable { mutableStateOf<String?>(null) }
    var source by rememberSaveable { mutableStateOf<String?>(null) }
    var sourceNote by rememberSaveable { mutableStateOf("") }
    var picking by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    // the phone is confirmed by SMS before anything is created: form → code → account (its state stays)
    var codeSent by remember { mutableStateOf(false) }
    var devCode by remember { mutableStateOf<String?>(null) }
    val independent = kind == SalonKind.INDEPENDENT
    val kindPlans = offer?.plans.orEmpty().filter { it.audience == if (independent) "INDEPENDENT" else "SALON" }
    val chosenPlan = kindPlans.firstOrNull { it.id == planId } ?: kindPlans.firstOrNull { it.recommended } ?: kindPlans.firstOrNull()
    if (codeSent) return PhoneCodeStep(
        container, phone, devCode, "تایید و ثبت‌نام",
        onSubmit = { code ->
            val p = pin!!
            onSignedIn(
                container.api.registerSalonOwner(
                    RegisterSalonRequest(
                        firstName.trim(), lastName.trim(), phone, code, password, salonName.trim(), province, city, address.trim(), p.first, p.second, kind,
                        serviceLocations = if (independent) places.toList() else null,
                        hostSalonName = if (independent && ServiceLocation.IN_SALON in places) host.trim().ifEmpty { null } else null,
                        signupSource = source,
                        planId = chosenPlan?.id,
                        signupSourceNote = if (source == "OTHER") sourceNote.trim().ifEmpty { null } else null,
                    ),
                ),
            )
        },
        onResend = { container.api.requestOtp(app.nobatet.data.OtpRequest(phone, "register")).devCode },
        onBack = { codeSent = false; devCode = null },
        onError = onError,
    )

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
        if (kindPlans.isNotEmpty()) {
            Muted("پلن")
            kindPlans.forEach { plan -> PlanOption(plan, plan.id == chosenPlan?.id, trialBadge(offer?.trialDays ?: 0)) { planId = plan.id } }
            val trialDays = offer?.trialDays ?: 0
            Muted(
                (if (trialDays > 0) "${trialDays.toString().toPersianDigits()} روز اول رایگان است؛ بعداً می‌توانید پلن را عوض کنید."
                else "بعداً می‌توانید پلن را عوض کنید."),
            )
        }
        Muted("از کجا با ما آشنا شدید؟")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            SIGNUP_SOURCE_LABEL.forEach { (key, label) -> AppChip(source == key, { source = key }, { Text(label) }) }
        }
        if (source == "OTHER") AppTextField(sourceNote, { sourceNote = it.take(200) }, label = { Text("کجا؟ (اختیاری)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Muted(SMS_BILLING_NOTE)
        PrimaryButton(if (busy) "در حال ارسال کد..." else "ثبت‌نام", enabled = !busy) {
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
                source == null -> "بگویید از کجا با نوبتت آشنا شدید"
                else -> null
            }
            if (problem != null) return@PrimaryButton onError(problem)
            scope.launch {
                busy = true
                runCatching { container.api.requestOtp(app.nobatet.data.OtpRequest(phone, "register")) }
                    .onSuccess { devCode = it.devCode; codeSent = true }
                    .onFailure { onError(persianError(it, "ارسال کد تایید ممکن نشد، دوباره تلاش کنید", container.json)) }
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

/** One plan at sign-up (the web's PlanOption): name, «پیشنهادی», the price and its first two feature lines. */
@Composable
private fun PlanOption(plan: SignUpPlan, selected: Boolean, badge: String?, onSelect: () -> Unit) {
    val c = LocalAppColors.current
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(if (selected) c.accentSoft else c.card)
            .border(1.dp, if (selected) c.accent else c.line, RoundedCornerShape(16.dp)).clickable(onClick = onSelect).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
            Text(plan.name, color = c.ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (plan.recommended) Text("پیشنهادی", color = c.accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
        Text(
            when (val price = plan.monthlyPriceToman) {
                null -> "توافقی"
                0 -> "رایگان"
                else -> "${formatAmount(price.toLong())} تومان / ماه"
            } + (badge?.let { " · $it" } ?: ""),
            color = c.ink, fontSize = 14.sp,
        )
        plan.features.take(2).takeIf { it.isNotEmpty() }?.let { Muted(it.joinToString("، ")) }
    }
}
