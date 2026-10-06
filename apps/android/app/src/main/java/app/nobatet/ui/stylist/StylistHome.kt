package app.nobatet.ui.stylist

import java.time.Instant
import app.nobatet.util.toSalonDateTime
import app.nobatet.util.formatClock
import app.nobatet.ui.staff.relativeLabel
import app.nobatet.ui.staff.TodayTimeline
import app.nobatet.ui.staff.StatTile
import app.nobatet.ui.staff.LinkCard
import app.nobatet.ui.staff.HomeSectionTitle
import app.nobatet.ui.staff.HeroInk
import app.nobatet.ui.staff.HeroCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Avatar
import app.nobatet.ui.components.AppTextButton
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.material3.Icon
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.HourglassEmpty
import androidx.compose.material.icons.outlined.EventAvailable
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.RateReview
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Coffee
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.Icons
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.SelfStylist
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.staff.StaffAppointmentCard
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.toPersianDigits

/**
 * «درآمد پیش‌بینی امروز»: the frozen share once COMPLETED, otherwise the commission on each
 * service's booked price at the service's own rate or the stylist's default (web estimatedShare).
 */
fun estimatedShare(a: StaffAppointment, stylist: SelfStylist): Int =
    if (a.status == AppointmentStatus.COMPLETED && a.stylistShareToman != null) a.stylistShareToman
    else a.services.sumOf { s ->
        val rate = stylist.services.firstOrNull { it.serviceId == s.serviceId }?.commissionPercent ?: stylist.commissionPercent
        (s.priceToman * rate / 100.0).toInt()
    }

enum class StylistPage(val title: String) { EARNINGS("درآمد من"), EXPENSES("هزینه‌های من"), REVIEWS("نظرات درباره شما"), SHARE("کیت معرفی من"), WALLET("کیف پول") }

/** «صبح بخیر / روز بخیر / عصر بخیر» by the salon's clock (the web's greeting). */
private fun greeting(minuteOfDay: Int) = when {
    minuteOfDay < 12 * 60 -> "صبح بخیر"
    minuteOfDay < 17 * 60 -> "روز بخیر"
    else -> "عصر بخیر"
}

/**
 * «امروز», as the web's app/stylist/page.tsx: the dark hero (greeting, next booking, today's
 * share), a missing-hours warning, new reviews, share kit, stat tiles, earnings and expenses,
 * what waits for confirmation, today's timeline.
 */
@Composable
fun StylistHomeScreen(stylist: SelfStylist, appointments: List<StaffAppointment>?, actions: StaffActions, onGoToTab: (Int) -> Unit, onOpenPage: (StylistPage) -> Unit) {
    val c = LocalAppColors.current
    val tz = stylist.salon.timezone
    val today = salonToday(tz)
    var pendingReviews by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) { pendingReviews = runCatching { actions.container.api.myReviews() }.getOrNull()?.count { it.status == app.nobatet.data.ReviewStatus.PENDING } ?: 0 }

    val now = Instant.now()
    val nowWall = now.toSalonDateTime(tz)
    val list = appointments.orEmpty()
    val todays = list.filter { it.status != AppointmentStatus.CANCELLED && it.localDate(tz) == today }.sortedBy { it.startAt }
    val upcoming = list.filter { (it.status == AppointmentStatus.PENDING || it.status == AppointmentStatus.CONFIRMED) && !Instant.parse(it.startAt).isBefore(now) }.sortedBy { it.startAt }
    val pending = upcoming.filter { it.status == AppointmentStatus.PENDING }
    val next = upcoming.firstOrNull()
    val todayShare = todays.filter { it.status != AppointmentStatus.NO_SHOW }.sumOf { estimatedShare(it, stylist) }

    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item(key = "hero") {
            HeroCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(stylist.displayName, stylist.avatarUrl, size = 48.dp)
                    Column(Modifier.padding(start = 12.dp)) {
                        Text(greeting(nowWall.hour * 60 + nowWall.minute), color = HeroInk.copy(alpha = 0.6f), fontSize = 12.sp)
                        Text(stylist.displayName, color = HeroInk, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
                if (next != null) {
                    val w = Instant.parse(next.startAt).toSalonDateTime(tz)
                    Column(Modifier.padding(top = 20.dp).fillMaxWidth().clickable { actions.selected = next }) {
                        Text("نوبت بعدی · ${w.toLocalDate().relativeLabel(today)}", color = HeroInk.copy(alpha = 0.6f), fontSize = 12.sp)
                        Text(formatClock(w.hour * 60 + w.minute), color = HeroInk, fontSize = 30.sp, lineHeight = 38.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "${next.customerName} — " + next.services.joinToString("، ") { it.service.name },
                            color = HeroInk.copy(alpha = 0.8f), fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        )
                    }
                } else if (appointments != null) Row(Modifier.padding(top = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Coffee, contentDescription = null, tint = HeroInk.copy(alpha = 0.75f), modifier = Modifier.size(16.dp))
                    Text("فعلاً نوبت پیش‌رویی ندارید.", color = HeroInk.copy(alpha = 0.75f), fontSize = 14.sp, modifier = Modifier.padding(start = 8.dp))
                }
                HorizontalDivider(color = Color.White.copy(alpha = 0.1f), modifier = Modifier.padding(top = 16.dp))
                Row(Modifier.fillMaxWidth().clickable { onOpenPage(StylistPage.EARNINGS) }.padding(top = 12.dp), verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Text("درآمد پیش‌بینی امروز (سهم شما)", color = HeroInk.copy(alpha = 0.6f), fontSize = 12.sp)
                        Text(if (appointments == null) "…" else formatToman(todayShare), color = HeroInk, fontSize = 22.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold)
                    }
                    Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = null, tint = HeroInk.copy(alpha = 0.5f))
                }
            }
        }
        if (stylist.workingHours.isEmpty()) item(key = "hours") {
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.pending.copy(alpha = 0.12f)).clickable { onGoToTab(2) }.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.Outlined.Schedule, contentDescription = null, tint = c.pending, modifier = Modifier.size(20.dp))
                Text(
                    "هنوز ساعات کاری‌تان را تنظیم نکرده‌اید؛ تا آن موقع مشتری‌ها نمی‌توانند با شما نوبت بگیرند.",
                    color = c.pending, fontSize = 14.sp, fontWeight = FontWeight.Bold, lineHeight = 24.sp, modifier = Modifier.weight(1f).padding(horizontal = 12.dp),
                )
                Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = null, tint = c.pending, modifier = Modifier.size(18.dp))
            }
        }
        if (pendingReviews > 0) item(key = "reviews") {
            LinkCard(Icons.Outlined.RateReview, "نظرهای تازه مشتری‌ها", "${pendingReviews.toString().toPersianDigits()} نظر منتظر تایید شما", badge = pendingReviews) { onOpenPage(StylistPage.REVIEWS) }
        }
        item(key = "wallet") { app.nobatet.ui.wallet.WalletBalanceCard(actions.container) { onOpenPage(StylistPage.WALLET) } }
        item(key = "share") { LinkCard(Icons.Outlined.QrCode2, "کیت معرفی من", "لینک رزرو مستقیم با شما، کد QR و پوستر") { onOpenPage(StylistPage.SHARE) } }
        item(key = "stats") {
            if (appointments == null) app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(110.dp))
            else Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                StatTile("نوبت امروز", todays.size, Icons.Outlined.EventAvailable, c.accent)
                StatTile("منتظر تایید", pending.size, Icons.Outlined.HourglassEmpty, if (pending.isNotEmpty()) c.pending else null)
                StatTile("نوبت‌های آینده", upcoming.size, Icons.Outlined.Schedule)
            }
        }
        item(key = "earnings") { LinkCard(Icons.Outlined.AccountBalanceWallet, "درآمد من", "سهم شما از نوبت‌ها، پرداخت‌های سالن و مانده حساب") { onOpenPage(StylistPage.EARNINGS) } }
        item(key = "expenses") { LinkCard(Icons.Outlined.ReceiptLong, "هزینه‌های من", "مواد مصرفی، ابزار و خریدهای کاری") { onOpenPage(StylistPage.EXPENSES) } }
        if (pending.isNotEmpty()) {
            item(key = "pendingTitle") {
                HomeSectionTitle("منتظر تایید شما") { if (pending.size > 3) AppTextButton(onClick = { onGoToTab(1) }) { Text("همه") } }
            }
            items(pending.take(3), key = { "p" + it.id }) { a -> StaffAppointmentCard(a, tz) { actions.selected = a } }
        }
        item(key = "todayTitle") { HomeSectionTitle("برنامه امروز") }
        item(key = "today") {
            when {
                appointments == null -> app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(160.dp))
                todays.isEmpty() -> Empty("امروز نوبتی ندارید", "نوبت‌های جدید اینجا و در تب نوبت‌ها نمایش داده می‌شوند.", icon = Icons.Outlined.Coffee)
                else -> TodayTimeline(todays, tz) { actions.selected = it }
            }
        }
    }
}
