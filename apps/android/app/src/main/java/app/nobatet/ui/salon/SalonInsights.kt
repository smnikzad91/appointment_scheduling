package app.nobatet.ui.salon

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.TrendingDown
import androidx.compose.material.icons.automirrored.outlined.TrendingUp
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.ChevronLeft
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ThumbUp
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.data.AppContainer
import app.nobatet.data.CUSTOMER_RANGES
import app.nobatet.data.CustomerInsights
import app.nobatet.data.VISIT_RANGES
import app.nobatet.data.VisitInsights
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.ChipTabs
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.SkeletonBlock
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatAmount
import app.nobatet.util.jalaliMonthName
import app.nobatet.util.persianLabel
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import java.time.Instant
import java.time.LocalDate
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.roundToLong

// The owner's analytics (apps/web app/salon/insights/*, components/app/insights/*): «آمار بازدید» of
// the public booking page and «آنالیز رفتار مشتری» from past bookings, plus the two shortcut cards on the
// salon home. Charts are plain Compose boxes in the theme's colours, right-to-left like the page.

private fun faNum(n: Int) = formatAmount(n.toLong())
private fun faNum(n: Long) = formatAmount(n)

/** «۱۲٪», «۱۲٫۵٪» */
private fun faPct(n: Double): String =
    (if (n % 1.0 != 0.0) "%.1f".format(Locale.US, n).replace('.', '٫') else n.roundToLong().toString()).toPersianDigits() + "٪"

private fun faPct(n: Int) = faPct(n.toDouble())

/** Percent change from [before] to [now]; null when there's nothing to compare with. */
private fun change(now: Int, before: Int): Int? = if (before <= 0) null else ((now - before) * 100.0 / before).roundToInt()

private fun dateOf(key: String): LocalDate? = runCatching { LocalDate.parse(key) }.getOrNull()

/** «۲۸» for a YYYY-MM-DD salon day */
private fun jalaliDay(key: String) = dateOf(key)?.toJalali()?.day?.toString()?.toPersianDigits() ?: ""

/** «۲۸ مهر» */
private fun jalaliDayMonth(key: String) = dateOf(key)?.toJalali()?.let { "${it.day.toString().toPersianDigits()} ${jalaliMonthName(it.month)}" } ?: ""

private val WEEKDAYS_FA = listOf("شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه")
private val WEEKDAYS_SHORT = listOf("ش", "ی", "د", "س", "چ", "پ", "ج")
private val DEVICE_LABEL = mapOf("mobile" to "موبایل", "desktop" to "کامپیوتر", "tablet" to "تبلت")

/** referrer key → label: "direct", "nobatet", a host, or a type when the host is unknown */
private fun referrerLabel(key: String): String {
    if (key == "direct") return "مستقیم (لینک، QR، پیام)"
    if (key == "nobatet") return "جستجو و صفحه‌های نوبتت"
    val k = key.lowercase()
    return when {
        "instagram" in k -> "اینستاگرام"
        "t.me" in k || "telegram" in k -> "تلگرام"
        "whatsapp" in k -> "واتس‌اپ"
        "google" in k -> "گوگل"
        "bing" in k -> "بینگ"
        "eitaa" in k -> "ایتا"
        "rubika" in k -> "روبیکا"
        "bale" in k -> "بله"
        k == "search" -> "موتور جستجو"
        k == "social" -> "شبکه اجتماعی"
        k == "external" -> "سایت‌های دیگر"
        else -> key
    }
}

/** «۲ ساعت» / «۳ روز» */
private fun hoursLabel(hours: Double): String = when {
    hours < 1 -> "کمتر از یک ساعت"
    hours < 48 -> "${hours.roundToInt().toString().toPersianDigits()} ساعت"
    else -> "${(hours / 24).roundToInt().toString().toPersianDigits()} روز"
}

// ── charts ──────────────────────────────────────────────────────────────────────────────────────

/** «۷ روز / ۳۰ روز / ۳ ماه / یک سال» */
@Composable
private fun RangeTabs(options: List<Int>, value: Int, onChange: (Int) -> Unit) {
    val label = { d: Int -> when (d) { 90 -> "۳ ماه"; 365 -> "یک سال"; else -> "${d.toString().toPersianDigits()} روز" } }
    ChipTabs(options.map { it to label(it) }, value, onChange = onChange)
}

/** Percent change chip; green when up. */
@Composable
private fun Delta(value: Int) {
    val c = LocalAppColors.current
    if (value == 0) return Text("بدون تغییر", color = c.muted, fontSize = 11.sp)
    val tone = if (value > 0) c.done else c.danger
    Row(
        Modifier.clip(CircleShape).background(tone.copy(alpha = 0.12f)).padding(horizontal = 8.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(if (value > 0) Icons.AutoMirrored.Outlined.TrendingUp else Icons.AutoMirrored.Outlined.TrendingDown, null, tint = tone, modifier = Modifier.size(12.dp))
        Text(faPct(abs(value)), color = tone, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text("نسبت به دوره قبل", color = tone.copy(alpha = 0.8f), fontSize = 11.sp)
    }
}

/** A KPI: big value, label, optional change against the previous window. */
@Composable
private fun Kpi(label: String, value: String, modifier: Modifier = Modifier, delta: Int? = null, hint: String? = null, tone: Color? = null) {
    val c = LocalAppColors.current
    AppCard(modifier) {
        Text(label, color = c.muted, fontSize = 12.sp)
        Text(value, color = tone ?: c.ink, fontSize = 24.sp, fontWeight = FontWeight.Black)
        delta?.let { Delta(it) }
        hint?.let { Text(it, color = c.muted, fontSize = 11.sp, lineHeight = 15.sp) }
    }
}

@Composable
private fun KpiRow(content: @Composable (Modifier) -> Unit) {
    Row(Modifier.height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(10.dp)) { content(Modifier.weight(1f).fillMaxHeight()) }
}

/** A titled card around one chart. */
@Composable
private fun Panel(title: String, hint: String? = null, content: @Composable ColumnScope.() -> Unit) {
    AppCard {
        SectionTitle(title)
        hint?.let { Muted(it) }
        Spacer(Modifier.height(4.dp))
        content()
    }
}

/** Vertical bars with labels under some of them; [highlight] drawn in the accent colour (e.g. today). */
@Composable
private fun Bars(values: List<Int>, labels: List<String>, highlight: Int? = null, height: Dp = 120.dp, labelEvery: Int = 1) {
    val c = LocalAppColors.current
    val max = maxOf(1, values.maxOrNull() ?: 0)
    Column {
        Row(Modifier.fillMaxWidth().height(height), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            values.forEachIndexed { i, v ->
                Box(
                    Modifier.weight(1f).fillMaxHeight(if (v == 0) 0.015f else maxOf(0.04f, v.toFloat() / max))
                        .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                        .background(if (i == highlight) c.accent else c.accent.copy(alpha = if (v == 0) 0.15f else 0.45f)),
                )
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            labels.forEachIndexed { i, l ->
                Text(if (i % labelEvery == 0) l else "", color = c.muted, fontSize = 9.sp, maxLines = 1, softWrap = false, modifier = Modifier.weight(1f))
            }
        }
    }
}

private data class MeterRow(val key: String, val label: String, val value: Int, val sub: String? = null)

/** Horizontal bars, longest first as given: label, formatted value, a bar against the biggest. */
@Composable
private fun Meters(rows: List<MeterRow>, format: (Int) -> String) {
    val c = LocalAppColors.current
    if (rows.isEmpty()) return Muted("هنوز داده‌ای نیست")
    val max = maxOf(1, rows.maxOf { it.value })
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        rows.forEach { r ->
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(r.label, color = c.ink, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(format(r.value) + (r.sub?.let { " $it" } ?: ""), color = c.muted, fontSize = 12.sp)
                }
                Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(c.card2)) {
                    Box(Modifier.fillMaxWidth(r.value.toFloat() / max).fillMaxHeight().clip(CircleShape).background(c.accent))
                }
            }
        }
    }
}

/** Weekday × hour, only the hours that have bookings; the darker, the busier. */
@Composable
private fun Heatmap(grid: List<List<Int>>) {
    val c = LocalAppColors.current
    val hours = (0 until 24).filter { h -> grid.any { (it.getOrNull(h) ?: 0) > 0 } }
    if (hours.isEmpty()) return Muted("هنوز نوبتی در این بازه نیست")
    val span = (hours.first()..hours.last()).toList()
    val max = maxOf(1, grid.maxOf { row -> row.maxOrNull() ?: 0 })
    Row {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Spacer(Modifier.height(14.dp))
            WEEKDAYS_FA.forEach { Box(Modifier.height(22.dp), contentAlignment = Alignment.CenterStart) { Text(it, color = c.muted, fontSize = 10.sp, fontWeight = FontWeight.SemiBold) } }
        }
        Spacer(Modifier.width(4.dp))
        Column(Modifier.horizontalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                span.forEach { h -> Box(Modifier.width(20.dp).height(14.dp), contentAlignment = Alignment.Center) { Text(h.toString().toPersianDigits(), color = c.muted, fontSize = 9.sp) } }
            }
            grid.forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    span.forEach { h ->
                        val v = row.getOrNull(h) ?: 0
                        Box(Modifier.width(20.dp).height(22.dp).clip(RoundedCornerShape(5.dp)).background(if (v > 0) c.accent.copy(alpha = 0.15f + 0.85f * v / max) else c.card2))
                    }
                }
            }
        }
    }
}

/**
 * A range tab strip over [content]; a new range keeps the tabs and shows a skeleton until its numbers
 * arrive (a newer range cancels the older request).
 */
@Composable
private fun <T : Any> InsightsPage(ranges: List<Int>, initial: Int, load: suspend (Int) -> T, content: @Composable ColumnScope.(T) -> Unit) {
    var days by rememberSaveable { mutableIntStateOf(initial) }
    // with the range it was loaded for
    var data by remember { mutableStateOf<Pair<Int, T>?>(null) }
    var failed by remember { mutableStateOf(false) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(days, retry) {
        failed = false
        runCatching { load(days) }
            .onSuccess { data = days to it }
            .onFailure { if (it is kotlinx.coroutines.CancellationException) throw it; failed = true }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        RangeTabs(ranges, days) { days = it }
        val d = data
        when {
            failed -> LoadError("آمار دریافت نشد", onRetry = { retry++ })
            d == null || d.first != days -> Loading(rows = 4)
            else -> content(d.second)
        }
    }
}

// ── «آمار بازدید» ───────────────────────────────────────────────────────────────────────────────

/**
 * The owner's public booking page (/s/<slug>): views, unique visitors, the daily (or, over 3 months,
 * weekly) trend, where visitors came from, devices, the booking funnel and the visits → booking
 * conversion, each against the window just before.
 */
@Composable
fun SalonVisitsPage(container: AppContainer, onOpenShare: () -> Unit) {
    val c = LocalAppColors.current
    InsightsPage(VISIT_RANGES, 30, { container.api.visitInsights(it) }) { data ->
        Text(
            (if (data.liveVisitors > 0) "${faNum(data.liveVisitors)} نفر همین الان" else "الان کسی در صفحه نیست") + " · امروز ${faNum(data.today.visitors)} نفر",
            color = c.done, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.clip(CircleShape).background(c.done.copy(alpha = 0.12f)).padding(horizontal = 12.dp, vertical = 6.dp),
        )
        if (data.totals.views == 0) {
            Empty("هنوز بازدیدی در این بازه ثبت نشده", "لینک رزرو را در بیو اینستاگرام، استوری و پیام‌ها بگذارید تا مشتری‌ها صفحه شما را ببینند.", icon = Icons.Outlined.Visibility)
            Text("کیت معرفی", color = c.accent, fontWeight = FontWeight.Bold, modifier = Modifier.clickable(onClick = onOpenShare).padding(8.dp))
            return@InsightsPage
        }
        KpiRow { m ->
            Kpi("بازدیدکننده یکتا", faNum(data.totals.visitors), m, change(data.totals.visitors, data.previous.visitors), tone = c.accent)
            Kpi("بازدید صفحه", faNum(data.totals.views), m, change(data.totals.views, data.previous.views))
        }
        KpiRow { m ->
            Kpi("نوبت آنلاین", faNum(data.onlineBookings), m, change(data.onlineBookings, data.previous.onlineBookings), hint = "رزرو خود مشتری‌ها (سایت و اپ)")
            Kpi(
                "نرخ تبدیل بازدید به نوبت", faPct(data.conversion), m,
                hint = if (data.previous.visitors > 0) "دوره قبل: ${faPct(data.previous.conversion)}" else "نوبت آنلاین به ازای هر ۱۰۰ بازدیدکننده",
            )
        }

        // 3 months: weekly bars (last bar = the latest 7 days), otherwise one bar a day
        if (data.days < 90) {
            Panel("روند بازدیدکننده‌ها (روزانه)", "بازدیدکننده یکتا: هر نفر در هر روز یک بار شمرده می‌شود.") {
                Bars(data.perDay.map { it.visitors }, data.perDay.map { jalaliDay(it.day) }, highlight = data.perDay.lastIndex, labelEvery = if (data.days > 7) 5 else 1)
            }
        } else {
            val weeks = data.perDay.indices.reversed().step(7).map { end ->
                val chunk = data.perDay.subList(maxOf(0, end - 6), end + 1)
                chunk.first().day to chunk.sumOf { it.visitors }
            }.reversed()
            Panel("روند بازدیدکننده‌ها (هفتگی)", "بازدیدکننده یکتا: هر نفر در هر روز یک بار شمرده می‌شود.") {
                Bars(weeks.map { it.second }, weeks.map { jalaliDayMonth(it.first) }, highlight = weeks.lastIndex, labelEvery = 2)
            }
        }

        val funnelTop = maxOf(1, data.totals.visitors)
        Panel("مسیر رزرو", "بازدیدکننده‌ها، کسانی که رزرو را شروع کردند و نوبت‌های آنلاین ثبت‌شده.") {
            listOf(
                Triple("بازدید صفحه", data.totals.visitors, "نفر"),
                Triple("شروع رزرو", data.funnel.openedVisitors, "نفر"),
                Triple("نوبت آنلاین", minOf(data.onlineBookings, funnelTop), "نوبت"),
            ).forEachIndexed { i, (label, value, unit) ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row {
                        Text(label, color = c.ink, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        Text("${faNum(value)} $unit" + if (i > 0) " (${faPct((value * 1000.0 / funnelTop).roundToInt() / 10.0)})" else "", color = c.muted, fontSize = 13.sp)
                    }
                    Box(Modifier.fillMaxWidth().height(12.dp).clip(CircleShape).background(c.card2)) {
                        Box(Modifier.fillMaxWidth(value.toFloat() / funnelTop).fillMaxHeight().clip(CircleShape).background(c.accent))
                    }
                }
            }
            if (data.funnel.openedVisitors >= 5 && data.onlineBookings.toDouble() / data.funnel.openedVisitors < 0.3) {
                Text(
                    "بیشتر کسانی که رزرو را شروع می‌کنند آن را تمام نمی‌کنند. ساعات کاری بیشتر، قیمت شفاف خدمات و عکس نمونه‌کار در گالری کمک می‌کند.",
                    color = c.pending, fontSize = 12.sp, lineHeight = 20.sp,
                    modifier = Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.pending.copy(alpha = 0.12f)).padding(12.dp),
                )
            }
        }

        // several hosts can be one source (instagram.com, l.instagram.com): merge by label
        val referrers = data.referrers.groupBy { referrerLabel(it.key) }
            .map { (label, rows) -> MeterRow(label, label, rows.sumOf { it.visitors }) }.sortedByDescending { it.value }
        Panel("از کجا آمدند", "بازدیدکننده یکتا به تفکیک منبع") { Meters(referrers) { "${faNum(it)} نفر" } }
        Panel("دستگاه بازدیدکننده‌ها") {
            Meters(data.devices.map { MeterRow(it.key, DEVICE_LABEL[it.key] ?: it.key, it.visitors) }) { "${faNum(it)} نفر" }
        }
        Muted("آمار بدون ذخیره IP و بدون کوکی جمع می‌شود؛ ربات‌ها و پیش‌نمایش لینک‌ها شمرده نمی‌شوند. بازدیدهای بیش از ۱۲۰ روز پیش پاک می‌شوند.")
    }
}

// ── «آنالیز رفتار مشتری» ────────────────────────────────────────────────────────────────────────

/**
 * The owner's past bookings: when customers book (weekday × hour), which services sell and earn, new vs
 * returning customers, how far ahead they book, cancellations and no-shows, monthly retention cohorts
 * and plain-Persian takeaways (all computed by apps/api insights/customer-insights.ts).
 */
@Composable
fun SalonCustomerInsightsPage(container: AppContainer, timezone: String?) {
    val c = LocalAppColors.current
    InsightsPage(CUSTOMER_RANGES, 90, { container.api.customerInsights(it) }) { data ->
        val t = data.totals
        val cu = data.customers
        if (t.bookings == 0) return@InsightsPage Empty("در این بازه نوبتی نبوده", "با چند نوبت ثبت‌شده، الگوی مشتری‌هایتان اینجا نمایش داده می‌شود.")

        if (data.tips.isNotEmpty()) Panel("نکته‌های کلیدی", "خلاصه‌ای از نوبت‌های این بازه") {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                data.tips.forEach { tip ->
                    val (icon, tone) = when (tip.tone) {
                        "good" -> Icons.Outlined.ThumbUp to c.done
                        "warn" -> Icons.Outlined.WarningAmber to c.pending
                        else -> Icons.Outlined.Lightbulb to c.accent
                    }
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(tone.copy(alpha = 0.12f)).padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Icon(icon, null, tint = tone, modifier = Modifier.size(16.dp).padding(top = 2.dp))
                        Text(tip.text, color = tone, fontSize = 14.sp, lineHeight = 22.sp)
                    }
                }
            }
        }

        KpiRow { m ->
            Kpi("نوبت‌ها", faNum(t.bookings), m, hint = "${faNum(t.completed)} انجام‌شده", tone = c.accent)
            Kpi("مشتری‌ها", faNum(cu.total), m, hint = "${faNum(cu.new)} تازه، ${faNum(cu.returning)} قدیمی")
        }
        KpiRow { m ->
            Kpi("نرخ لغو", faPct(t.cancelRate), m, hint = "${faNum(t.cancelled)} نوبت (از هر دو طرف)", tone = if (t.cancelRate >= 20) c.danger else null)
            Kpi("عدم حضور", faPct(t.noShowRate), m, hint = "${faNum(t.noShow)} نوبت", tone = if (t.noShowRate >= 10) c.danger else null)
        }

        Panel("شلوغی هفته", "نوبت‌های لغونشده به تفکیک روز و ساعت؛ هرچه پررنگ‌تر، شلوغ‌تر.") { Heatmap(data.grid) }

        val open = data.byHour.indices.filter { data.byHour[it] > 0 }
        if (open.isNotEmpty()) Panel("ساعت‌های پرطرفدار") {
            val span = (open.first()..open.last()).toList()
            Bars(span.map { data.byHour[it] }, span.map { it.toString().toPersianDigits() }, height = 110.dp, labelEvery = if (span.size > 12) 2 else 1)
        }
        Panel("روزهای هفته") { Bars(data.byWeekday, WEEKDAYS_SHORT, height = 110.dp) }

        Panel("خدمات پرطرفدار", if (t.revenueToman > 0) "درآمد نوبت‌های انجام‌شده: ${faNum(t.revenueToman)} تومان" else null) {
            Meters(data.services.map { MeterRow(it.serviceId, it.name, it.bookings, if (it.revenueToman > 0) "(${faPct(it.revenueShare)} درآمد)" else null) }) { "${faNum(it)} نوبت" }
        }

        Panel("مشتری تازه یا قدیمی", "تازه: اولین نوبتش پیش شما در همین بازه بوده.") {
            Row(Modifier.fillMaxWidth().height(16.dp).clip(CircleShape).background(c.card2)) {
                if (cu.returning > 0) Box(Modifier.weight(cu.returning.toFloat()).fillMaxHeight().background(c.accent))
                if (cu.new > 0) Box(Modifier.weight(cu.new.toFloat()).fillMaxHeight().background(c.accent.copy(alpha = 0.35f)))
            }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                Legend("قدیمی ${faNum(cu.returning)}", c.accent, Modifier.weight(1f))
                Legend("تازه ${faNum(cu.new)}", c.accent.copy(alpha = 0.35f))
            }
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniStat("بیش از یک بار در این بازه", "${faNum(cu.repeatInWindow)} نفر", Modifier.weight(1f))
                MiniStat("میانگین نوبت هر مشتری", cu.avgVisits.let { if (it % 1.0 == 0.0) it.toLong().toString() else it.toString() }.toPersianDigits(), Modifier.weight(1f))
            }
        }

        val lead = data.leadTime.buckets
        val leadTotal = lead.sameDay + lead.upTo3Days + lead.upTo7Days + lead.moreThan7Days
        Panel("چقدر زودتر نوبت می‌گیرند", "میانه: ${hoursLabel(data.leadTime.medianHours)} قبل از نوبت") {
            Meters(
                listOf(
                    MeterRow("same", "همان روز", lead.sameDay),
                    MeterRow("3", "۱ تا ۳ روز قبل", lead.upTo3Days),
                    MeterRow("7", "۴ تا ۷ روز قبل", lead.upTo7Days),
                    MeterRow("more", "بیش از یک هفته قبل", lead.moreThan7Days),
                ),
            ) { if (leadTotal > 0) faPct((it * 100.0 / leadTotal).roundToInt()) else "—" }
        }

        Panel("بازگشت مشتری‌ها", "مشتری‌ها به تفکیک ماه اولین نوبت انجام‌شده؛ چند درصد در ۳۰، ۶۰ و ۹۰ روز بعد دوباره آمدند.") {
            if (data.cohorts.none { it.customers > 0 }) return@Panel Muted("هنوز نوبت انجام‌شده‌ای در ۶ ماه اخیر نیست.")
            Row {
                listOf("ماه اولین نوبت" to 1.6f, "مشتری" to 1f, "۳۰ روز" to 1f, "۶۰ روز" to 1f, "۹۰ روز" to 1f).forEach { (h, w) ->
                    Text(h, color = c.muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(w))
                }
            }
            data.cohorts.forEach { m ->
                Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(m.month, color = c.ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1.6f))
                    Text(faNum(m.customers), color = c.muted, fontSize = 12.sp, modifier = Modifier.weight(1f))
                    listOf(m.returned.d30, m.returned.d60, m.returned.d90).forEach { v ->
                        Box(Modifier.weight(1f)) {
                            val shown = if (m.customers > 0) v else null
                            if (shown == null) Text("—", color = c.muted, fontSize = 12.sp)
                            else Text(
                                faPct(shown.roundToInt()), color = c.ink, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(c.accent.copy(alpha = (0.1f + shown.toFloat() * 0.008f).coerceAtMost(0.9f))).padding(horizontal = 6.dp, vertical = 3.dp),
                            )
                        }
                    }
                }
            }
            Muted("«—» یعنی هنوز آن‌قدر زمان نگذشته که بشود گفت.")
        }

        Panel("لغو و عدم حضور مکرر", "مشتری‌هایی که دست‌کم ۲ بار نیامدند یا ۳ بار لغو یا غیبت داشتند. لغو شامل لغو از طرف شما هم می‌شود.") {
            if (data.unreliable.isEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(Icons.Outlined.AutoAwesome, null, tint = c.done, modifier = Modifier.size(16.dp))
                    Text("مشتری بدقولی در این بازه نیست.", color = c.done, fontSize = 14.sp)
                }
                return@Panel
            }
            data.unreliable.forEach { u ->
                Row(Modifier.padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Outlined.Person, null, tint = c.muted, modifier = Modifier.size(20.dp))
                    Column(Modifier.weight(1f)) {
                        Text(u.name, color = c.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        val last = runCatching { Instant.parse(u.lastAt).toSalonDateTime(timezone).toLocalDate().persianLabel() }.getOrDefault("")
                        Muted("آخرین نوبت $last · ${faNum(u.bookings)} نوبت")
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (u.noShows > 0) Text("${faNum(u.noShows)} عدم حضور", color = c.danger, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        if (u.cancellations > 0) Text("${faNum(u.cancellations)} لغو", color = c.muted, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun Legend(text: String, color: Color, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Text(text, color = c.ink, fontSize = 12.sp)
    }
}

@Composable
private fun MiniStat(label: String, value: String, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(c.card2).padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, color = c.muted, fontSize = 11.sp)
        Text(value, color = c.ink, fontSize = 18.sp, fontWeight = FontWeight.Black)
    }
}

// ── home shortcuts ──────────────────────────────────────────────────────────────────────────────

@Composable
private fun ShortcutCard(icon: ImageVector, title: String, loading: Boolean, modifier: Modifier, onClick: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalAppColors.current
    Column(
        modifier.heightIn(min = 148.dp).clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp))
            .clickable(onClick = onClick).padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Box(Modifier.size(32.dp).clip(RoundedCornerShape(12.dp)).background(c.accentSoft), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = c.accent, modifier = Modifier.size(16.dp))
            }
            Text(title, color = c.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Icon(Icons.Outlined.ChevronLeft, null, tint = c.muted, modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.height(12.dp))
        if (loading) {
            SkeletonBlock(Modifier.width(64.dp).height(28.dp), RoundedCornerShape(8.dp))
            Spacer(Modifier.weight(1f))
            SkeletonBlock(Modifier.fillMaxWidth().height(32.dp), RoundedCornerShape(8.dp))
        } else content()
    }
}

/**
 * The salon home's two analytics shortcuts: «آمار بازدید» (last 7 days' visitors with a mini trend and
 * the visit → booking conversion) and «رفتار مشتری» (returning share and the top takeaway). Each opens
 * its full page; if the numbers can't load the cards still lead there.
 */
@Composable
fun InsightsHomeCards(container: AppContainer, onOpenVisits: () -> Unit, onOpenCustomers: () -> Unit) {
    val c = LocalAppColors.current
    // null = loading; Result failure = couldn't load
    var visits by remember { mutableStateOf<Result<VisitInsights>?>(null) }
    var customers by remember { mutableStateOf<Result<CustomerInsights>?>(null) }
    LaunchedEffect(Unit) { visits = runCatching { container.api.visitInsights(7) } }
    LaunchedEffect(Unit) { customers = runCatching { container.api.customerInsights(30) } }

    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        ShortcutCard(Icons.Outlined.Visibility, "آمار بازدید", visits == null, Modifier.weight(1f), onOpenVisits) {
            val v = visits?.getOrNull()
            if (v == null) return@ShortcutCard Text("بازدید صفحه رزرو و نرخ تبدیل به نوبت", color = c.muted, fontSize = 12.sp, lineHeight = 18.sp)
            Row(verticalAlignment = Alignment.Bottom) {
                Text(faNum(v.totals.visitors), color = c.ink, fontSize = 26.sp, fontWeight = FontWeight.Black)
                Text(" نفر در ۷ روز", color = c.muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 4.dp))
            }
            change(v.totals.visitors, v.previous.visitors)?.let { d ->
                Text((if (d >= 0) "▲ " else "▼ ") + faPct(abs(d)), color = if (d >= 0) c.done else c.danger, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.weight(1f))
            val max = maxOf(1, v.perDay.maxOfOrNull { it.visitors } ?: 0)
            Row(Modifier.fillMaxWidth().height(32.dp).padding(top = 8.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                v.perDay.forEachIndexed { i, d ->
                    Box(
                        Modifier.weight(1f).fillMaxHeight(if (d.visitors == 0) 0.08f else maxOf(0.12f, d.visitors.toFloat() / max))
                            .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
                            .background(if (i == v.perDay.lastIndex) c.accent else c.accent.copy(alpha = 0.4f)),
                    )
                }
            }
            Text("تبدیل به نوبت ${faPct(v.conversion)}", color = c.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
        }

        ShortcutCard(Icons.Outlined.Groups, "رفتار مشتری", customers == null, Modifier.weight(1f), onOpenCustomers) {
            val cu = customers?.getOrNull()
            if (cu == null || cu.totals.bookings == 0) {
                return@ShortcutCard Text("ساعت‌های شلوغ، خدمات پرطرفدار و مشتری‌های وفادار", color = c.muted, fontSize = 12.sp, lineHeight = 18.sp)
            }
            val share = if (cu.customers.total > 0) (cu.customers.returning * 100.0 / cu.customers.total).roundToInt() else 0
            Row(verticalAlignment = Alignment.Bottom) {
                Text(faPct(share), color = c.ink, fontSize = 26.sp, fontWeight = FontWeight.Black)
                Text(" مشتری قدیمی", color = c.muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 4.dp))
            }
            Text("${faNum(cu.customers.total)} مشتری در ۳۰ روز", color = c.muted, fontSize = 11.sp)
            Spacer(Modifier.weight(1f))
            val tip = cu.tips.firstOrNull { it.tone == "warn" } ?: cu.tips.firstOrNull()
            Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Outlined.Lightbulb, null, tint = c.accent, modifier = Modifier.size(14.dp).padding(top = 2.dp))
                Text(tip?.text ?: "نمودارها و جزئیات", color = if (tip != null) c.ink else c.muted, fontSize = 11.sp, lineHeight = 17.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
