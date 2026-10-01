package app.nobatet.ui.salon

import app.nobatet.util.openInBrowser
import app.nobatet.ui.staff.TodayTimeline
import app.nobatet.ui.staff.HomeSectionTitle
import app.nobatet.ui.staff.NoticeChip
import app.nobatet.ui.staff.NoticeCard
import app.nobatet.ui.staff.LinkCard
import app.nobatet.ui.staff.StatTile
import app.nobatet.ui.staff.StatusPill
import app.nobatet.ui.staff.HeroInk
import app.nobatet.ui.staff.HeroCard
import app.nobatet.ui.components.Avatar
import app.nobatet.BuildConfig
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.Calculate
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.RateReview
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.automirrored.outlined.OpenInNew
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.background
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import android.net.Uri
import android.content.Intent
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.data.StatusUpdate
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.staff.AppointmentBucket
import app.nobatet.ui.staff.AppointmentDetailSheet
import app.nobatet.ui.staff.AppointmentMonthView
import app.nobatet.ui.staff.AppointmentsView
import app.nobatet.ui.staff.AppointmentsViewSwitch
import app.nobatet.ui.staff.BucketChips
import app.nobatet.ui.staff.FilterPill
import app.nobatet.ui.staff.bucketOf
import app.nobatet.ui.staff.rememberAppointmentsView
import app.nobatet.ui.stylist.DayGroupedList
import app.nobatet.ui.staff.StaffAppointmentCard
import app.nobatet.ui.staff.StaffBookingSheet
import app.nobatet.ui.stylist.localDate
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch
import java.time.Instant

/** The status sheet and booking sheets of the salon panel (the owner picks the stylist; independent: themselves). */
class SalonSheetsState {
    var selected by mutableStateOf<StaffAppointment?>(null)
    var editing by mutableStateOf<StaffAppointment?>(null)
    /** Creating: choosing a stylist (salon) or booking for this stylist id. */
    var choosingStylist by mutableStateOf(false)
    var creatingFor by mutableStateOf<String?>(null)
    /** A booking started by tapping the week view: that day and minute. */
    var prefill by mutableStateOf<Pair<java.time.LocalDate, Int>?>(null)
    var busy by mutableStateOf(false)

    fun startCreate(data: SalonData) {
        val salon = data.salon ?: return
        val only = data.stylists.singleOrNull { it.active }
        if (salon.independent || only != null) creatingFor = (only ?: data.stylists.firstOrNull())?.id else choosingStylist = true
    }
}

@Composable
fun SalonSheets(container: AppContainer, data: SalonData, sheets: SalonSheetsState) {
    val scope = rememberCoroutineScope()
    val salon = data.salon ?: return
    val c = LocalAppColors.current
    sheets.selected?.let { a ->
        AppointmentDetailSheet(
            a, salon.timezone, sheets.busy,
            onDismiss = { sheets.selected = null },
            onEdit = { sheets.selected = null; sheets.editing = a },
            onStatus = { status ->
                scope.launch {
                    sheets.busy = true
                    runCatching { container.api.setStatus(a.id, StatusUpdate(status)) }
                        .onSuccess { sheets.selected = null; data.loadAppointments() }
                        .onFailure { Toasts.error(persianError(it, "تغییر وضعیت نوبت انجام نشد، دوباره تلاش کنید", container.json)) }
                    sheets.busy = false
                }
            },
        )
    }
    if (sheets.choosingStylist) {
        AppDialog(
            onDismissRequest = { sheets.choosingStylist = false; sheets.prefill = null },
            title = { Text("نوبت با کدام آرایشگر؟") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    data.stylists.filter { it.active }.forEach { st ->
                        Text(st.displayName, color = c.ink, modifier = Modifier.clickable { sheets.choosingStylist = false; sheets.creatingFor = st.id }.padding(vertical = 10.dp))
                    }
                    if (data.stylists.none { it.active }) Muted("هنوز آرایشگر فعالی ندارید.")
                }
            },
            confirmButton = { AppTextButton(onClick = { sheets.choosingStylist = false; sheets.prefill = null }) { Text("انصراف") } },
        )
    }
    val stylistId = sheets.editing?.stylistId ?: sheets.creatingFor
    if (stylistId != null) {
        StaffBookingSheet(
            container, salon.slug, salon.timezone, stylistId, data.bookableFor(stylistId), sheets.editing,
            onDismiss = { sheets.editing = null; sheets.creatingFor = null; sheets.prefill = null },
            onSaved = { sheets.editing = null; sheets.creatingFor = null; sheets.prefill = null; data.loadAppointments() },
            prefill = sheets.prefill,
        )
    }
}

/** «نوبت‌ها» of the salon, as the web's: «فهرست / هفته / ماه», a stylist filter (salon), «+». */
@Composable
fun SalonAppointmentsScreen(data: SalonData, sheets: SalonSheetsState) {
    val c = LocalAppColors.current
    val salon = data.salon ?: return
    val tz = salon.timezone
    val today = salonToday(tz)
    val (view, setView) = rememberAppointmentsView()
    var bucket by rememberSaveable { mutableStateOf(AppointmentBucket.UPCOMING) }
    var stylistFilter by rememberSaveable { mutableStateOf<String?>(null) }
    val stylistName: (StaffAppointment) -> String? = { a -> if (salon.independent) null else a.stylist?.displayName }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppointmentsViewSwitch(view, setView, Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp))
            if (!salon.independent && data.stylists.size > 1) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterPill("همه آرایشگرها", stylistFilter == null) { stylistFilter = null }
                    data.stylists.forEach { st -> FilterPill(st.displayName, stylistFilter == st.id) { stylistFilter = st.id } }
                }
            }
            val list = data.appointments?.filter { stylistFilter == null || it.stylistId == stylistFilter }
            if (view == AppointmentsView.LIST && list != null) BucketChips(list, bucket) { bucket = it }
            when {
                list == null -> Loading()
                view == AppointmentsView.WEEK -> app.nobatet.ui.staff.WeekGrid(
                    list, tz, today, Modifier.weight(1f),
                    // with a stylist picked in the filter, book with them; otherwise ask who
                    onCreateAt = { d, m -> sheets.prefill = d to m; stylistFilter?.let { sheets.creatingFor = it } ?: sheets.startCreate(data) },
                ) { sheets.selected = it }
                view == AppointmentsView.MONTH -> AppointmentMonthView(list, tz, today, Modifier.weight(1f), stylistName) { sheets.selected = it }
                else -> {
                    val filtered = bucketOf(list, bucket)
                    if (filtered.isEmpty()) Empty(bucket.empty, modifier = Modifier.padding(16.dp))
                    else DayGroupedList(filtered, tz, today, Modifier.weight(1f), stylistName) { sheets.selected = it }
                }
            }
        }
        FloatingActionButton(onClick = { sheets.startCreate(data) }, containerColor = c.accent, contentColor = c.accentInk, modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp)) {
            Icon(Icons.Outlined.Add, contentDescription = "نوبت تازه")
        }
    }
}

enum class SalonPage(val title: String) { ACCOUNTING("حسابداری"), REVIEWS("نظرات مشتری‌ها"), GALLERY("گالری نمونه کارها"), SHARE("کیت معرفی") }

/**
 * The salon home, as the web's app/salon/page.tsx: the dark hero (logo, status, today's forecast,
 * «اشتراک لینک رزرو» / «صفحه سالن»), pending/suspended notes, new reviews, stat tiles, accounting
 * and share-kit cards, unset-share and plan warnings, what waits for confirmation, today's timeline.
 */
@Composable
fun SalonHomeScreen(container: AppContainer, data: SalonData, sheets: SalonSheetsState, onGoToTab: (Int) -> Unit, onOpenPage: (SalonPage) -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val salon = data.salon ?: return
    val tz = salon.timezone
    val independent = salon.independent
    val stylistName: (StaffAppointment) -> String? = { a -> if (independent) null else a.stylist?.displayName }
    var pendingReviews by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { pendingReviews = runCatching { container.api.salonReviews() }.getOrNull()?.count { it.status == app.nobatet.data.ReviewStatus.PENDING } ?: 0 }

    val now = Instant.now()
    val today = salonToday(tz)
    val loaded = data.appointments
    val live = loaded.orEmpty().filter { it.status != AppointmentStatus.CANCELLED }
    val todays = live.filter { it.localDate(tz) == today }.sortedBy { it.startAt }
    val upcoming = live.filter { !Instant.parse(it.startAt).isBefore(now) }
    val needs = upcoming.filter { it.status == AppointmentStatus.PENDING }.sortedBy { it.startAt }
    val revenue = todays.filter { it.status != AppointmentStatus.NO_SHOW }.sumOf { it.priceToman }
    // the share kit's short link (book/@handle; the slug until a handle is chosen)
    val bookingUrl = BuildConfig.WEB_BASE_URL + "book/@" + (salon.handle ?: salon.slug)

    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(key = "hero") {
            HeroCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(salon.name, salon.logoUrl, size = 52.dp)
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(salon.name, color = HeroInk, fontSize = 20.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        when (salon.status) {
                            "PENDING" -> StatusPill("در انتظار تایید", c.pending)
                            "SUSPENDED" -> StatusPill("معلق", c.danger)
                            else -> StatusPill("فعال", c.done)
                        }
                    }
                }
                Text("درآمد پیش‌بینی امروز", color = HeroInk.copy(alpha = 0.6f), fontSize = 12.sp, modifier = Modifier.padding(top = 20.dp))
                Text(if (loaded == null) "…" else formatToman(revenue), color = HeroInk, fontSize = 26.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold)
                if (salon.status == "ACTIVE") Row(Modifier.padding(top = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    HeroButton("اشتراک لینک رزرو", Icons.Outlined.Share, c.accent, c.accentInk, Modifier.weight(1f)) {
                        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "رزرو آنلاین نوبت در ${salon.name}\n$bookingUrl")
                        runCatching { context.startActivity(Intent.createChooser(send, "اشتراک لینک رزرو")) }
                    }
                    HeroButton(if (independent) "صفحه رزرو" else "صفحه سالن", Icons.AutoMirrored.Outlined.OpenInNew, Color.White.copy(alpha = 0.1f), HeroInk) {
                        context.openInBrowser(BuildConfig.WEB_BASE_URL + "s/" + salon.slug)
                    }
                }
            }
        }
        if (salon.status == "PENDING") item(key = "pending") {
            TintNote(
                if (independent) "حساب شما در انتظار تایید پشتیبانی است. تا آن موقع صفحه رزرو برای مشتری‌ها نمایش داده نمی‌شود؛ اما می‌توانید خدمات، ساعات کاری و تنظیمات را آماده کنید."
                else "سالن شما در انتظار تایید پشتیبانی است. تا آن موقع صفحه رزرو برای مشتری‌ها نمایش داده نمی‌شود؛ اما می‌توانید خدمات، آرایشگرها و تنظیمات را آماده کنید.",
                c.pending,
            )
        }
        if (salon.status == "SUSPENDED") item(key = "suspended") {
            TintNote("${if (independent) "صفحه شما" else "سالن شما"} به‌طور موقت معلق شده و برای مشتری‌ها قابل مشاهده نیست. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.", c.danger)
        }
        if (pendingReviews > 0) item(key = "reviews") {
            LinkCard(Icons.Outlined.RateReview, "نظرهای تازه مشتری‌ها", "${pendingReviews.toString().toPersianDigits()} نظر منتظر تایید شما", badge = pendingReviews) { onOpenPage(SalonPage.REVIEWS) }
        }
        item(key = "stats") {
            if (loaded == null) app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(110.dp))
            else Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("نوبت امروز", todays.size, Icons.Outlined.EventAvailable, c.accent)
                StatTile("منتظر تایید", needs.size, Icons.Outlined.HourglassEmpty, if (needs.isNotEmpty()) c.pending else null)
                StatTile("نوبت‌های آینده", upcoming.size, Icons.Outlined.Schedule)
            }
        }
        item(key = "accounting") {
            LinkCard(Icons.Outlined.Calculate, "حسابداری", if (independent) "درآمد، هزینه‌ها و سود خالص ماه" else "درآمد، سهم آرایشگرها، پرداخت‌ها و هزینه‌ها") { onOpenPage(SalonPage.ACCOUNTING) }
        }
        item(key = "share") { LinkCard(Icons.Outlined.QrCode2, "کیت معرفی", "لینک مستقیم رزرو، کد QR و پوستر برای استوری و چاپ") { onOpenPage(SalonPage.SHARE) } }
        item(key = "gallery") { LinkCard(Icons.Outlined.PhotoLibrary, "گالری نمونه کارها", "عکس کارهای انجام‌شده برای صفحه رزرو") { onOpenPage(SalonPage.GALLERY) } }
        // an independent stylist's own 0% is by design: all the money is theirs
        if (!independent) item(key = "zero") { ZeroCommissionNotice(data.stylists) { onGoToTab(3) } }
        item(key = "plan") { SubscriptionNotice(data.subscription) { onGoToTab(4) } }
        if (needs.isNotEmpty()) {
            item(key = "needsTitle") {
                HomeSectionTitle("منتظر تایید شما") {
                    if (needs.size > 3) AppTextButton(onClick = { onGoToTab(1) }) { Text("همه") }
                }
            }
            items(needs.take(3), key = { "p" + it.id }) { a -> StaffAppointmentCard(a, tz, stylistName(a)) { sheets.selected = a } }
        }
        item(key = "todayTitle") { HomeSectionTitle("برنامه امروز") }
        item(key = "today") {
            when {
                loaded == null -> app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(160.dp))
                todays.isEmpty() -> Empty(
                    "امروز نوبتی ثبت نشده", "لینک رزرو ${if (independent) "خودتان" else "سالن"} را برای مشتری‌ها بفرستید تا خودشان آنلاین نوبت بگیرند.",
                    icon = Icons.Outlined.AutoAwesome,
                )
                else -> TodayTimeline(todays, tz, stylistName) { sheets.selected = it }
            }
        }
    }
}

/** A button on the hero. */
@Composable
private fun HeroButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, bg: Color, fg: Color, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Row(
        modifier.height(44.dp).clip(RoundedCornerShape(16.dp)).background(bg).clickable(onClick = onClick).padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(16.dp))
        Text(label, color = fg, fontSize = 14.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
    }
}

/** A tinted note (the web's pending/suspended paragraphs). */
@Composable
private fun TintNote(text: String, color: Color) {
    Text(text, color = color, fontSize = 14.sp, lineHeight = 26.sp, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(color.copy(alpha = 0.12f)).padding(16.dp))
}

private const val ZERO_OK_KEY = "zeroCommissionOk"

/**
 * The web's ZeroCommissionNotice: active stylists still at 0% share; «عمداً ۰٪ است» hides them
 * on this device.
 */
@Composable
private fun ZeroCommissionNotice(stylists: List<app.nobatet.data.OwnerStylist>, onPick: () -> Unit) {
    val prefs = LocalContext.current.getSharedPreferences("ui", android.content.Context.MODE_PRIVATE)
    var ok by remember { mutableStateOf(prefs.getStringSet(ZERO_OK_KEY, emptySet()).orEmpty()) }
    val zero = stylists.filter { it.active && it.commissionPercent == 0.0 && it.id !in ok }
    if (zero.isEmpty()) return
    val names = zero.joinToString("، ") { it.displayName }
    NoticeCard(
        "تا سهم را تعیین نکنید، کل مبلغ نوبت‌هایشان سهم سالن حساب می‌شود و طلبی برایشان ثبت نمی‌شود.",
        title = if (zero.size == 1) "سهم $names تعیین نشده (۰٪)" else "سهم این آرایشگرها تعیین نشده (۰٪): $names",
    ) {
        NoticeChip("تعیین سهم", onPick)
        AppTextButton(onClick = {
            ok = ok + zero.map { it.id }
            prefs.edit().putStringSet(ZERO_OK_KEY, ok).apply()
        }) { Text("عمداً ۰٪ است", color = LocalAppColors.current.muted) }
    }
}

/** The web's SubscriptionNotice: expired, ending within 7 days, or the plan's stylist seats full. */
@Composable
private fun SubscriptionNotice(sub: app.nobatet.data.OwnerSubscription?, onDetails: () -> Unit) {
    if (sub == null || sub.status == "none") return
    val left = sub.expiresAt?.let { java.time.Duration.between(Instant.now(), Instant.parse(it)).toHours().let { h -> maxOf(0L, (h + 23) / 24) } }
    val text = when {
        sub.status == "expired" -> "اشتراک سالن به پایان رسیده است؛ تا تمدید، افزودن آرایشگر و پیامک یادآوری متوقف است."
        left != null && left <= 7 -> "${left.toString().toPersianDigits()} روز تا پایان اشتراک سالن مانده است."
        else -> return
    }
    NoticeCard(text, onClick = onDetails)
}

