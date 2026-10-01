package app.nobatet.ui.stylist

import androidx.compose.material3.Icon
import androidx.compose.material.icons.outlined.FileDownload
import androidx.compose.material.icons.Icons
import app.nobatet.ui.components.jalaliMonthSlug
import app.nobatet.ui.components.jalaliDate
import app.nobatet.ui.components.cell
import app.nobatet.ui.components.ReportExportSheet
import app.nobatet.ui.components.ReportSection
import app.nobatet.ui.components.Report
import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import app.nobatet.data.ExpenseInput
import app.nobatet.data.HandleRequest
import app.nobatet.data.ModerateRequest
import app.nobatet.data.ModerationReview
import app.nobatet.data.PAYOUT_METHOD_LABEL
import app.nobatet.data.ReviewStatus
import app.nobatet.data.STYLIST_EXPENSE_CATEGORIES
import app.nobatet.data.SelfStylist
import app.nobatet.data.StylistEarnings
import app.nobatet.data.StylistExpense
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.DayStrip
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.MonthSwitcher
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PageScaffold
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
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import kotlinx.coroutines.launch
import java.time.Instant

@Composable
fun StylistPageScreen(page: StylistPage, container: AppContainer, stylist: SelfStylist, onBack: () -> Unit) {
    PageScaffold(page.title, onBack) {
        when (page) {
            StylistPage.EARNINGS -> EarningsPage(container, stylist)
            StylistPage.EXPENSES -> ExpensesPage(container, stylist)
            StylistPage.REVIEWS -> ReviewsPage(container)
            StylistPage.SHARE -> SharePage(container, stylist)
        }
    }
}

/** A money line: label, amount. Never a minus sign next to a Persian amount (it drifts in RTL). */
@Composable
private fun Money(label: String, amount: Int, accent: Boolean = false) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth()) {
        Text(label, color = c.muted, modifier = Modifier.weight(1f))
        Text(formatToman(amount), color = if (accent) c.accent else c.ink, style = if (accent) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyLarge)
    }
}

/** «درآمد من»: share, tips, payouts, expenses and net income of a Jalali month, the balance with the salon. */
@Composable
private fun EarningsPage(container: AppContainer, stylist: SelfStylist) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    var offset by remember { mutableIntStateOf(0) }
    val period = jalaliMonthPeriod(salonToday(tz), offset)
    var data by remember { mutableStateOf<StylistEarnings?>(null) }
    LaunchedEffect(offset) {
        data = null
        data = runCatching {
            container.api.myEarnings(salonWallTimeToInstant(period.start, 0, tz).toString(), salonWallTimeToInstant(period.end, 0, tz).toString())
        }.getOrNull()
    }
    var exporting by remember { mutableStateOf<Report?>(null) }
    exporting?.let { ReportExportSheet(it) { exporting = null } }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        MonthSwitcher(period.label, onPrev = { if (offset > -11) offset-- }, onNext = { offset++ }, canNext = offset < 0, canPrev = offset > -11)
        val d = data ?: return@Column Loading()
        AppTextButton(onClick = { exporting = buildEarningsReport(stylist.displayName, period.label, salonWallTimeToInstant(period.start, 0, tz).toString(), tz, d) }, modifier = Modifier.align(Alignment.End)) {
            Icon(Icons.Outlined.FileDownload, contentDescription = null, modifier = Modifier.size(18.dp))
            Text("خروجی گزارش", modifier = Modifier.padding(start = 6.dp))
        }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            item {
                AppCard {
                    Money("سهم شما این ماه", d.totals.shareToman, accent = true)
                    Money("انعام‌ها", d.totals.tipsToman)
                    Money("هزینه‌های شما", d.totals.expensesToman)
                    Money(if (d.totals.netIncomeToman < 0) "زیان خالص" else "درآمد خالص", kotlin.math.abs(d.totals.netIncomeToman))
                    Money("پرداخت سالن در این ماه", d.totals.paidInPeriodToman)
                    Money(if (d.balanceToman >= 0) "مانده طلب شما از سالن" else "پیش‌پرداخت سالن", kotlin.math.abs(d.balanceToman))
                    Muted("${d.totals.appointmentCount.toString().toPersianDigits()} نوبت انجام‌شده")
                }
            }
            if (d.items.isNotEmpty()) item { SectionTitle("نوبت‌های انجام‌شده") }
            items(d.items, key = { it.id }) { i ->
                AppCard {
                    Row { Text(i.customerName, color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(i.stylistShareToman), color = c.accent) }
                    Muted(Instant.parse(i.startAt).toSalonDateTime(tz).persianDateTime())
                    Muted(i.services.joinToString("، ") + if (i.tipToman > 0) "، انعام ${formatToman(i.tipToman)}" else "")
                }
            }
            if (d.payouts.isNotEmpty()) item { SectionTitle("پرداخت‌های سالن") }
            items(d.payouts, key = { it.id }) { p ->
                AppCard {
                    Row { Text(PAYOUT_METHOD_LABEL[p.method] ?: p.method, color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(p.amountToman), color = c.ink) }
                    Muted(Instant.parse(p.paidAt).toSalonDateTime(tz).toLocalDate().persianLabel() + (p.note?.let { "، $it" } ?: ""))
                }
            }
        }
    }
}

/** «هزینه‌های من»: this month and the 11 before; add/edit/delete with an optional private receipt photo. */
@Composable
private fun ExpensesPage(container: AppContainer, stylist: SelfStylist) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    val scope = rememberCoroutineScope()
    var offset by remember { mutableIntStateOf(0) }
    val period = jalaliMonthPeriod(salonToday(tz), offset)
    var items by remember { mutableStateOf<List<StylistExpense>?>(null) }
    var totalToman by remember { mutableIntStateOf(0) }
    var editing by remember { mutableStateOf<StylistExpense?>(null) }
    var adding by remember { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    LaunchedEffect(offset, reload) {
        items = null
        runCatching {
            container.api.myExpenses(salonWallTimeToInstant(period.start, 0, tz).toString(), salonWallTimeToInstant(period.end, 0, tz).toString(), page = 1, pageSize = 100)
        }.onSuccess { items = it.items; totalToman = it.totalToman }.onFailure { items = emptyList() }
    }
    Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
        MonthSwitcher(period.label, onPrev = { if (offset > -11) offset-- }, onNext = { offset++ }, canNext = offset < 0, canPrev = offset > -11)
        AppCard { Money("جمع هزینه‌های ماه", totalToman, accent = true) }
        PrimaryButton("ثبت هزینه", Modifier.padding(vertical = 12.dp)) { adding = true }
        val list = items ?: return@Column Loading()
        if (list.isEmpty()) Empty("هزینه‌ای در این ماه ثبت نشده")
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(bottom = 24.dp)) {
            items(list, key = { it.id }) { e ->
                AppCard(Modifier.clickable { editing = e }) {
                    Row { Text(e.description, color = c.ink, modifier = Modifier.weight(1f)); Text(formatToman(e.amountToman), color = c.ink) }
                    Muted((STYLIST_EXPENSE_CATEGORIES[e.category] ?: e.category) + "، " + Instant.parse(e.spentAt).toSalonDateTime(tz).toLocalDate().persianLabel() + if (e.receiptUrl != null) "، رسید دارد" else "")
                }
            }
        }
    }
    if (adding || editing != null) {
        ExpenseDialog(container, tz, editing, onDismiss = { adding = false; editing = null }) { msg ->
            adding = false; editing = null; reload++
            scope.launch { Toasts.success(msg) }
        }
    }
}

@Composable
private fun ExpenseDialog(container: AppContainer, tz: String, editing: StylistExpense?, onDismiss: () -> Unit, onDone: (String) -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val today = salonToday(tz)
    var category by remember { mutableStateOf(editing?.category ?: "SUPPLIES") }
    var amount by remember { mutableStateOf(editing?.amountToman?.toString().orEmpty()) }
    var description by remember { mutableStateOf(editing?.description.orEmpty()) }
    var day by remember { mutableStateOf(editing?.let { Instant.parse(it.spentAt).toSalonDateTime(tz).toLocalDate() } ?: today) }
    var receipt by remember { mutableStateOf(editing?.receiptUrl) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri != null) scope.launch {
            busy = true
            // private folder: only this stylist can open it
            runCatching { uploadPhoto(container, context, uri, "expenses") }.onSuccess { receipt = it }.onFailure { error = persianError(it, "آپلود رسید انجام نشد", container.json) }
            busy = false
        }
    }
    AppDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "ثبت هزینه" else "ویرایش هزینه") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    STYLIST_EXPENSE_CATEGORIES.forEach { (k, label) -> AppChip(selected = category == k, onClick = { category = k }, label = { Text(label) }) }
                }
                AppTextField(
                    amount.toPersianDigits(), { amount = it.normalizeDigits().filter(Char::isDigit).take(10) }, label = { Text("مبلغ (تومان)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
                )
                AppTextField(description, { description = it.take(200) }, label = { Text("توضیح") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Muted("روز")
                DayStrip((0L until 60L).map { today.minusDays(it) }, day, today) { day = it }
                AppTextButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !busy) {
                    Text(if (busy) "در حال آپلود..." else if (receipt != null) "تغییر عکس رسید" else "پیوست عکس رسید (اختیاری)")
                }
                if (receipt != null) AppTextButton(onClick = { receipt = null }) { Text("حذف رسید", color = c.danger) }
                error?.let { Text(it, color = c.danger) }
                if (editing != null) AppTextButton(onClick = {
                    scope.launch { runCatching { container.api.deleteExpense(editing.id) }.onSuccess { onDone("هزینه حذف شد") }.onFailure { error = persianError(it, "حذف هزینه انجام نشد", container.json) } }
                }) { Text("حذف هزینه", color = c.danger) }
            }
        },
        confirmButton = {
            AppTextButton(enabled = !busy, onClick = {
                val amt = amount.toIntOrNull()
                when {
                    amt == null || amt <= 0 -> error = "مبلغ را وارد کنید"
                    description.isBlank() -> error = "توضیح هزینه را بنویسید"
                    else -> scope.launch {
                        busy = true
                        val input = ExpenseInput(category, amt, salonWallTimeToInstant(day, 12 * 60, tz).toString(), description.trim(), receipt)
                        runCatching { if (editing == null) container.api.addExpense(input) else container.api.updateExpense(editing.id, input) }
                            .onSuccess { onDone(if (editing == null) "هزینه ثبت شد" else "هزینه ویرایش شد") }
                            .onFailure { error = persianError(it, "ذخیره هزینه انجام نشد", container.json) }
                        busy = false
                    }
                }
            }) { Text("ذخیره") }
        },
        dismissButton = { AppTextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

/** «نظرات درباره شما»: approve or reject what customers wrote about you. */
@Composable
private fun ReviewsPage(container: AppContainer) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var reviews by remember { mutableStateOf<List<ModerationReview>?>(null) }
    LaunchedEffect(Unit) { reviews = runCatching { container.api.myReviews() }.getOrDefault(emptyList()) }
    val list = reviews ?: return Loading()
    if (list.isEmpty()) return Empty("هنوز نظری درباره شما ثبت نشده")
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(list.sortedByDescending { it.status == ReviewStatus.PENDING }, key = { it.id }) { r ->
            AppCard {
                Row { Text(r.customerName, color = c.ink, modifier = Modifier.weight(1f)); r.rating?.let { Text("★".repeat(it), color = c.pending) } }
                r.comment?.let { Text(it, color = c.ink) }
                Muted(when (r.status) { ReviewStatus.PENDING -> "در انتظار تایید"; ReviewStatus.APPROVED -> "منتشر شده"; ReviewStatus.REJECTED -> "رد شده" })
                Row {
                    fun moderate(status: ReviewStatus) = scope.launch {
                        runCatching { container.api.moderateReview(r.id, ModerateRequest(status)) }
                            .onSuccess { updated -> reviews = list.map { if (it.id == r.id) updated else it } }
                            .onFailure { Toasts.error(persianError(it, "انجام نشد، دوباره تلاش کنید", container.json)) }
                    }
                    if (r.status != ReviewStatus.APPROVED) AppTextButton(onClick = { moderate(ReviewStatus.APPROVED) }) { Text("تایید و انتشار") }
                    if (r.status != ReviewStatus.REJECTED) AppTextButton(onClick = { moderate(ReviewStatus.REJECTED) }) { Text("رد", color = c.danger) }
                }
            }
        }
    }
}

/** A QR code of [text], drawn on the phone (never a third-party QR service). */
fun qrBitmap(text: String, size: Int = 720): Bitmap {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.H, EncodeHintType.MARGIN to 1))
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size) bmp.setPixel(x, y, if (matrix[x, y]) AndroidColor.BLACK else AndroidColor.WHITE)
    return bmp
}

/** «کیت معرفی»: the short booking link nobatet.app/book/@handle, copy/share, its QR, and changing the handle. */
@Composable
private fun SharePage(container: AppContainer, stylist: SelfStylist) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var handle by remember { mutableStateOf<String?>(null) }
    var draft by remember { mutableStateOf("") }
    LaunchedEffect(Unit) { handle = runCatching { container.api.myHandle().handle }.getOrNull(); draft = handle.orEmpty() }
    val h = handle ?: return Loading()
    val url = BuildConfig.WEB_BASE_URL.trimEnd('/') + "/book/@" + h
    val qr = remember(url) { qrBitmap(url) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("لینک رزرو شما", color = c.muted)
        Text("nobatet.app/book/@$h", color = c.ink, style = MaterialTheme.typography.titleMedium)
        Image(qr.asImageBitmap(), contentDescription = "کد QR لینک رزرو", modifier = Modifier.size(240.dp).clip(RoundedCornerShape(16.dp)).background(androidx.compose.ui.graphics.Color.White).padding(8.dp))
        PrimaryButton("ارسال لینک") {
            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "نوبت آنلاین با ${stylist.displayName}: $url"), "ارسال لینک"))
        }
        AppTextButton(onClick = {
            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("link", url))
            scope.launch { Toasts.success("لینک کپی شد") }
        }) { Text("کپی لینک") }
        AppTextButton(onClick = {
            val poster = app.nobatet.util.drawStoryPoster(
                context,
                app.nobatet.util.PosterData(
                    name = stylist.displayName,
                    subtitle = "آرایشگر در ${stylist.salon.name}" + (stylist.salon.city.takeIf { it.isNotBlank() }?.let { "، $it" } ?: ""),
                    services = stylist.services.filter { it.service.active }.map { it.service.name },
                    link = "nobatet.app/book/@$h",
                    brandColor = android.graphics.Color.parseColor("#a34a30"),
                    qr = qrBitmap(url, 900),
                ),
            )
            app.nobatet.util.sharePoster(context, poster, "nobatet-$h-story.png")
        }) { Text("پوستر استوری (اینستاگرام)") }
        AppCard {
            SectionTitle("تغییر نام کاربری")
            Muted("با تغییر آن، لینک و کد QR قبلی دیگر کار نمی‌کنند.")
            AppTextField(draft, { draft = it.lowercase().take(30) }, prefix = { Text("@") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            PrimaryButton("ذخیره", enabled = draft.isNotBlank() && draft != h) {
                scope.launch {
                    runCatching { container.api.setMyHandle(HandleRequest(draft.trim())) }
                        .onSuccess { handle = it.handle; draft = it.handle; Toasts.success("نام کاربری ذخیره شد") }
                        .onFailure { Toasts.error(persianError(it, "ذخیره انجام نشد", container.json)) }
                }
            }
        }
    }
}

/** The month's earnings as a report (the web's buildEarningsReport). */
private fun buildEarningsReport(name: String, label: String, from: String, tz: String?, d: StylistEarnings): Report {
    val t = d.totals
    return Report(
        title = "گزارش درآمد $name — $label",
        subtitle = "${t.appointmentCount.toString().toPersianDigits()} نوبت انجام‌شده، ${d.payouts.size.toString().toPersianDigits()} پرداخت از سالن، ${d.expenses.size.toString().toPersianDigits()} هزینه",
        fileSlug = "daramad-${jalaliMonthSlug(from, tz)}",
        sections = listOf(
            ReportSection(
                "خلاصه", listOf("شرح", "مبلغ (تومان)"),
                listOf(
                    "مبلغ نوبت‌ها (با انعام)" to t.incomeToman, "انعام‌ها" to t.tipsToman, "سهم شما (با انعام) — درآمد ناخالص" to t.shareToman,
                    "هزینه‌های شما" to t.expensesToman,
                    (if (t.netIncomeToman < 0) "زیان خالص (سهم − هزینه‌ها)" else "درآمد خالص (سهم − هزینه‌ها)") to kotlin.math.abs(t.netIncomeToman),
                    "دریافتی از سالن در این ماه" to t.paidInPeriodToman,
                    (if (d.balanceToman < 0) "پیش‌دریافت (کل)" else "مانده طلب از سالن (کل)") to kotlin.math.abs(d.balanceToman),
                ).map { (k, v) -> listOf(cell(k), cell(v)) },
            ),
            ReportSection(
                "نوبت‌های انجام‌شده", listOf("تاریخ", "مشتری", "خدمات", "مبلغ دریافتی", "انعام", "درصد سهم", "سهم شما"),
                d.items.map {
                    listOf(cell(jalaliDate(it.startAt, tz)), cell(it.customerName), cell(it.services.joinToString("، ")), cell(it.chargedToman), cell(it.tipToman),
                        cell(Math.round(it.commissionPercent * 10) / 10.0), cell(it.stylistShareToman))
                },
                listOf(cell("جمع"), cell(""), cell(""), cell(d.items.sumOf { it.chargedToman }), cell(t.tipsToman), cell(""), cell(t.shareToman)),
            ),
            ReportSection(
                "پرداخت‌های سالن", listOf("تاریخ", "روش", "مبلغ", "توضیح"),
                d.payouts.map { listOf(cell(jalaliDate(it.paidAt, tz)), cell(PAYOUT_METHOD_LABEL[it.method] ?: it.method), cell(it.amountToman), cell(it.note.orEmpty())) },
                listOf(cell("جمع"), cell(""), cell(t.paidInPeriodToman), cell("")),
            ),
            ReportSection(
                "هزینه‌های شما", listOf("تاریخ", "دسته", "مبلغ", "توضیح", "رسید"),
                d.expenses.map {
                    listOf(cell(jalaliDate(it.spentAt, tz)), cell(STYLIST_EXPENSE_CATEGORIES[it.category] ?: it.category), cell(it.amountToman), cell(it.description), cell(if (it.receiptUrl != null) "دارد" else ""))
                },
                listOf(cell("جمع"), cell(""), cell(t.expensesToman), cell(""), cell("")),
            ),
        ),
    )
}
