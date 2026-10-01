package app.nobatet.ui.salon

import app.nobatet.ui.components.Toasts
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.ChargeRequest
import app.nobatet.data.PAYOUT_METHOD_LABEL
import app.nobatet.data.PayoutRequest
import app.nobatet.data.SALON_EXPENSE_CATEGORIES
import app.nobatet.data.SalonExpense
import app.nobatet.data.SalonExpenseInput
import app.nobatet.data.SalonIncomeItem
import app.nobatet.data.SalonPayout
import app.nobatet.data.SalonSummary
import app.nobatet.data.StylistAccount
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.DayStrip
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.MonthSwitcher
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.jalaliMonthPeriod
import app.nobatet.util.normalizeDigits
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.salonWallTimeToInstant
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant

@Composable
private fun Money(label: String, amount: Int, accent: Boolean = false) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth()) {
        Text(label, color = c.muted, modifier = Modifier.weight(1f))
        Text(formatToman(amount), color = if (accent) c.accent else c.ink, style = if (accent) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyLarge)
    }
}

/** «حسابداری»: a Jalali month's income, stylist balances and payouts (salon), expenses, services. */
@Composable
fun SalonAccountingPage(container: AppContainer, data: SalonData) {
    val salon = data.salon ?: return
    val c = LocalAppColors.current
    val tz = salon.timezone
    val indie = salon.independent
    var offset by remember { mutableIntStateOf(0) }
    val period = jalaliMonthPeriod(salonToday(tz), offset)
    val from = salonWallTimeToInstant(period.start, 0, tz).toString()
    val to = salonWallTimeToInstant(period.end, 0, tz).toString()
    var summary by remember { mutableStateOf<SalonSummary?>(null) }
    var income by remember { mutableStateOf<List<SalonIncomeItem>>(emptyList()) }
    var payouts by remember { mutableStateOf<List<SalonPayout>>(emptyList()) }
    var expenses by remember { mutableStateOf<List<SalonExpense>>(emptyList()) }
    var reload by remember { mutableIntStateOf(0) }
    var tab by remember { mutableIntStateOf(0) }
    var charging by remember { mutableStateOf<SalonIncomeItem?>(null) }
    var paying by remember { mutableStateOf<StylistAccount?>(null) }
    var expense by remember { mutableStateOf<SalonExpense?>(null) }
    var addingExpense by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(offset, reload) {
        summary = null
        launch { summary = runCatching { container.api.salonSummary(from, to) }.getOrNull() }
        launch { income = runCatching { container.api.salonIncome(from, to) }.getOrDefault(emptyList()) }
        if (!indie) launch { payouts = runCatching { container.api.salonPayouts(from, to) }.getOrDefault(emptyList()) }
        launch { expenses = runCatching { container.api.salonExpenses(from, to) }.getOrDefault(emptyList()) }
    }
    // independent stylists: no stylists tab, shares or balances (their whole income is the business's)
    val tabs = if (indie) listOf("درآمد", "هزینه‌ها", "خدمات") else listOf("درآمد", "آرایشگرها", "هزینه‌ها", "خدمات")
    val tabName = tabs.getOrElse(tab) { tabs[0] }

    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            MonthSwitcher(period.label, onPrev = { offset-- }, onNext = { offset++ }, canNext = offset < 0)
            summary?.let { s ->
                AppCard {
                    Money("درآمد ماه", s.totals.incomeToman, accent = true)
                    if (!indie) Money("سهم آرایشگرها", s.totals.stylistShareToman)
                    if (!indie) Money("سهم سالن", s.totals.salonShareToman)
                    Money("هزینه‌ها", s.totals.expensesToman)
                    Money(if (s.totals.netProfitToman < 0) "زیان خالص" else "سود خالص", kotlin.math.abs(s.totals.netProfitToman))
                    Muted("${s.totals.appointmentCount.toString().toPersianDigits()} نوبت انجام‌شده")
                }
            } ?: Loading(Modifier.padding(24.dp))
        }
        ScrollableTabRow(selectedTabIndex = tab, containerColor = c.bg, contentColor = c.accent, edgePadding = 8.dp) {
            tabs.forEachIndexed { i, t -> Tab(selected = tab == i, onClick = { tab = i }, text = { Text(t) }) }
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when (tabName) {
                "درآمد" -> {
                    if (income.isEmpty()) item { Empty("درآمدی در این ماه ثبت نشده", "نوبت‌های انجام‌شده اینجا می‌آیند.") }
                    items(income, key = { it.id }) { i ->
                        AppCard(Modifier.clickable { charging = i }) {
                            Row { Text(i.customerName, color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(i.chargedToman + i.tipToman), color = c.ink) }
                            Muted(Instant.parse(i.startAt).toSalonDateTime(tz).persianDateTime() + if (!indie) "، ${i.stylist.displayName}" else "")
                            Muted(i.services.joinToString("، ") + if (i.tipToman > 0) "، انعام ${formatToman(i.tipToman)}" else "")
                        }
                    }
                }
                "آرایشگرها" -> {
                    items(summary?.stylists.orEmpty(), key = { it.id }) { st ->
                        AppCard(Modifier.clickable { paying = st }) {
                            Text(st.displayName, color = c.ink, style = MaterialTheme.typography.titleSmall)
                            Money("سهم این ماه", st.shareToman)
                            Money(if (st.balanceToman >= 0) "طلب از سالن" else "پیش‌پرداخت", kotlin.math.abs(st.balanceToman))
                            Muted("سهم ${st.commissionPercent.toInt().toString().toPersianDigits()}٪، ${st.appointmentCount.toString().toPersianDigits()} نوبت؛ برای ثبت پرداخت بزنید")
                        }
                    }
                    if (payouts.isNotEmpty()) item { SectionTitle("پرداخت‌های این ماه") }
                    items(payouts, key = { it.id }) { p ->
                        AppCard {
                            Row { Text(p.stylist?.displayName ?: "", color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(p.amountToman), color = c.ink) }
                            Muted((PAYOUT_METHOD_LABEL[p.method] ?: p.method) + "، " + Instant.parse(p.paidAt).toSalonDateTime(tz).toLocalDate().persianLabel() + (p.note?.let { "، $it" } ?: ""))
                            TextButton(onClick = {
                                scope.launch { runCatching { container.api.deletePayout(p.id) }.onSuccess { reload++ }.onFailure { Toasts.error(persianError(it, "حذف پرداخت انجام نشد", container.json)) } }
                            }) { Text("حذف پرداخت", color = c.danger) }
                        }
                    }
                }
                "هزینه‌ها" -> {
                    item { PrimaryButton("ثبت هزینه") { addingExpense = true } }
                    if (expenses.isEmpty()) item { Empty("هزینه‌ای در این ماه ثبت نشده") }
                    items(expenses, key = { it.id }) { e ->
                        AppCard(Modifier.clickable { expense = e }) {
                            Row { Text(SALON_EXPENSE_CATEGORIES[e.category] ?: e.category, color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(e.amountToman), color = c.ink) }
                            Muted(Instant.parse(e.spentAt).toSalonDateTime(tz).toLocalDate().persianLabel() + (e.note?.let { "، $it" } ?: "") + if (e.receiptUrl != null) "، رسید دارد" else "")
                        }
                    }
                }
                else -> {
                    val list = summary?.services.orEmpty()
                    if (list.isEmpty()) item { Empty("خدمتی در این ماه انجام نشده") }
                    items(list, key = { it.serviceId }) { s ->
                        AppCard { Row { Text(s.name, color = c.ink, modifier = Modifier.weight(1f)); Text("${s.count.toString().toPersianDigits()} بار", color = c.muted) }; Money("مبلغ", s.bookedToman) }
                    }
                }
            }
        }
    }

    charging?.let { item -> ChargeDialog(container, item, onDismiss = { charging = null }) { charging = null; reload++; scope.launch { Toasts.success("مبلغ اصلاح شد") } } }
    paying?.let { st -> PayoutDialog(container, st, onDismiss = { paying = null }) { paying = null; reload++; scope.launch { Toasts.success("پرداخت ثبت شد") } } }
    if (addingExpense || expense != null) {
        SalonExpenseDialog(container, tz, expense, onDismiss = { addingExpense = false; expense = null }) { msg ->
            addingExpense = false; expense = null; reload++; scope.launch { Toasts.success(msg) }
        }
    }
}

private fun digits(v: String, max: Int = 10) = v.normalizeDigits().filter(Char::isDigit).take(max)

/** The amount actually received and a tip (all the stylist's). */
@Composable
private fun ChargeDialog(container: AppContainer, item: SalonIncomeItem, onDismiss: () -> Unit, onDone: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var charged by remember { mutableStateOf(item.chargedToman.toString()) }
    var tip by remember { mutableStateOf(item.tipToman.takeIf { it > 0 }?.toString().orEmpty()) }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("اصلاح مبلغ و انعام") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Muted("${item.customerName}، ${item.services.joinToString("، ")}")
                OutlinedTextField(charged.toPersianDigits(), { charged = digits(it) }, label = { Text("مبلغ دریافتی (تومان)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(tip.toPersianDigits(), { tip = digits(it) }, label = { Text("انعام (تومان، اختیاری)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val amt = charged.toIntOrNull() ?: return@TextButton run { error = "مبلغ را وارد کنید" }
                scope.launch {
                    runCatching { container.api.adjustCharge(item.id, ChargeRequest(amt, tip.toIntOrNull() ?: 0)) }.onSuccess { onDone() }
                        .onFailure { error = persianError(it, "اصلاح مبلغ انجام نشد", container.json) }
                }
            }) { Text("ذخیره") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

@Composable
private fun PayoutDialog(container: AppContainer, st: StylistAccount, onDismiss: () -> Unit, onDone: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var amount by remember { mutableStateOf(st.balanceToman.takeIf { it > 0 }?.toString().orEmpty()) }
    var method by remember { mutableStateOf("CARD_TO_CARD") }
    var note by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("ثبت پرداخت به ${st.displayName}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(amount.toPersianDigits(), { amount = digits(it) }, label = { Text("مبلغ (تومان)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    PAYOUT_METHOD_LABEL.forEach { (k, label) -> FilterChip(selected = method == k, onClick = { method = k }, label = { Text(label) }) }
                }
                OutlinedTextField(note, { note = it.take(200) }, label = { Text("یادداشت (اختیاری)") }, singleLine = true)
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val amt = amount.toIntOrNull()?.takeIf { it > 0 } ?: return@TextButton run { error = "مبلغ را وارد کنید" }
                scope.launch {
                    runCatching { container.api.addPayout(PayoutRequest(st.id, amt, method, note.trim().ifEmpty { null })) }.onSuccess { onDone() }
                        .onFailure { error = persianError(it, "ثبت پرداخت انجام نشد", container.json) }
                }
            }) { Text("ثبت پرداخت") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

@Composable
private fun SalonExpenseDialog(container: AppContainer, tz: String, editing: SalonExpense?, onDismiss: () -> Unit, onDone: (String) -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = salonToday(tz)
    var category by remember { mutableStateOf(editing?.category ?: "SUPPLIES") }
    var amount by remember { mutableStateOf(editing?.amountToman?.toString().orEmpty()) }
    var note by remember { mutableStateOf(editing?.note.orEmpty()) }
    var day by remember { mutableStateOf(editing?.let { Instant.parse(it.spentAt).toSalonDateTime(tz).toLocalDate() } ?: today) }
    var receipt by remember { mutableStateOf(editing?.receiptUrl) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri != null) scope.launch {
            busy = true
            // private folder: only the owner can open it
            runCatching { uploadPhoto(container, context, uri, "salon-expenses") }.onSuccess { receipt = it }.onFailure { error = persianError(it, "آپلود رسید انجام نشد", container.json) }
            busy = false
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "ثبت هزینه" else "ویرایش هزینه") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    SALON_EXPENSE_CATEGORIES.forEach { (k, label) -> FilterChip(selected = category == k, onClick = { category = k }, label = { Text(label) }) }
                }
                OutlinedTextField(amount.toPersianDigits(), { amount = digits(it) }, label = { Text("مبلغ (تومان)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                OutlinedTextField(note, { note = it.take(200) }, label = { Text("توضیح (اختیاری)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Muted("روز")
                DayStrip((0L until 60L).map { today.minusDays(it) }, day, today) { day = it }
                TextButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !busy) {
                    Text(if (busy) "در حال آپلود..." else if (receipt != null) "تغییر عکس رسید" else "پیوست عکس رسید (اختیاری)")
                }
                if (receipt != null) TextButton(onClick = { receipt = null }) { Text("حذف رسید", color = c.danger) }
                error?.let { Text(it, color = c.danger) }
                if (editing != null) TextButton(onClick = {
                    scope.launch { runCatching { container.api.deleteSalonExpense(editing.id) }.onSuccess { onDone("هزینه حذف شد") }.onFailure { error = persianError(it, "حذف هزینه انجام نشد", container.json) } }
                }) { Text("حذف هزینه", color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val amt = amount.toIntOrNull()?.takeIf { it > 0 } ?: return@TextButton run { error = "مبلغ را وارد کنید" }
                scope.launch {
                    busy = true
                    val input = SalonExpenseInput(category, amt, salonWallTimeToInstant(day, 12 * 60, tz).toString(), note.trim().ifEmpty { null }, receipt)
                    runCatching { if (editing == null) container.api.addSalonExpense(input) else container.api.updateSalonExpense(editing.id, input) }
                        .onSuccess { onDone(if (editing == null) "هزینه ثبت شد" else "هزینه ویرایش شد") }
                        .onFailure { error = persianError(it, "ذخیره هزینه انجام نشد", container.json) }
                    busy = false
                }
            }) { Text("ذخیره") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
