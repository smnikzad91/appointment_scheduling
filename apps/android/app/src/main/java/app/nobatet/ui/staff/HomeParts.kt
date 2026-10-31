package app.nobatet.ui.staff

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.outlined.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.components.StatusChip
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.ui.theme.LocalThemeControl
import app.nobatet.util.formatClock
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.delay
import java.time.Instant

// The salon and stylist home screens' pieces (apps/web app/salon/page.tsx, app/stylist/page.tsx,
// components/app/ui.tsx StatTile/LinkCard/SectionTitle, appointments.tsx TodayTimeline).

/** The hero's colours: always dark plum, a little lighter in dark mode (the web's #2a1d26 / #33232f). */
val HeroInk = Color(0xFFF8F1E9)

/** The web's dark hero card with the salon-mirror arch motif in the corner. */
@Composable
fun HeroCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalAppColors.current
    val dark = LocalThemeControl.current.dark
    val shape = RoundedCornerShape(32.dp)
    Column(
        modifier.fillMaxWidth().clip(shape).background(if (dark) Color(0xFF33232F) else Color(0xFF2A1D26))
            .then(if (dark) Modifier.border(1.dp, c.line, shape) else Modifier)
            .drawBehind {
                // two arches at the bottom-left, as on the web (left stays left in RTL there too)
                val stroke = 10.dp.toPx()
                drawRoundRect(
                    c.accent.copy(alpha = 0.35f), topLeft = Offset(-10.dp.toPx(), size.height - 32.dp.toPx()),
                    size = Size(36.dp.toPx() * 4, 48.dp.toPx() * 4), cornerRadius = CornerRadius(72.dp.toPx()), style = Stroke(stroke),
                )
                drawRoundRect(
                    c.accent.copy(alpha = 0.25f), topLeft = Offset(64.dp.toPx(), size.height - 20.dp.toPx()),
                    size = Size(28.dp.toPx() * 4, 40.dp.toPx() * 4), cornerRadius = CornerRadius(56.dp.toPx()),
                )
            }
            .padding(20.dp),
        content = content,
    )
}

/** A pill on the hero (فعال / در انتظار تایید / معلق). */
@Composable
fun StatusPill(label: String, color: Color) {
    Text(
        label, color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier.clip(CircleShape).background(color.copy(alpha = 0.15f)).padding(horizontal = 10.dp, vertical = 2.dp),
    )
}

/** The web's StatTile: an icon, a big number and a label. */
@Composable
fun RowScope.StatTile(label: String, value: Int, icon: ImageVector, tone: Color? = null) {
    val c = LocalAppColors.current
    val color = tone ?: c.ink
    Column(Modifier.weight(1f).clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).padding(16.dp)) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.padding(bottom = 12.dp).size(20.dp))
        Text(value.toString().toPersianDigits(), color = color, fontSize = 28.sp, lineHeight = 30.sp, fontWeight = FontWeight.Bold)
        Text(label, color = c.muted, fontSize = 12.sp, modifier = Modifier.padding(top = 6.dp), maxLines = 1)
    }
}

/** The web's LinkCard: an icon on the accent tint, title, one line, chevron (and an optional count badge). */
@Composable
fun LinkCard(icon: ImageVector, title: String, subtitle: String, modifier: Modifier = Modifier, badge: Int = 0, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Row(
        modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).clickable(onClick = onClick).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(16.dp)).background(c.accentSoft), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = c.accent, modifier = Modifier.size(20.dp))
        }
        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
            Text(title, color = c.ink, fontWeight = FontWeight.Bold)
            Text(subtitle, color = c.muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        if (badge > 0) Text(
            badge.toString().toPersianDigits(), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(end = 8.dp).clip(CircleShape).background(c.pending).padding(horizontal = 7.dp, vertical = 1.dp),
        )
        Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = null, tint = c.muted, modifier = Modifier.size(18.dp))
    }
}

/** A warning card on the pending tint (subscription, unset shares, missing hours). */
@Composable
fun NoticeCard(text: String, modifier: Modifier = Modifier, title: String? = null, onClick: (() -> Unit)? = null, actions: (@Composable RowScope.() -> Unit)? = null) {
    val c = LocalAppColors.current
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.pending.copy(alpha = 0.1f)).border(1.dp, c.pending.copy(alpha = 0.3f), RoundedCornerShape(24.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(16.dp),
    ) {
        Row {
            Icon(Icons.Outlined.WarningAmber, contentDescription = null, tint = c.pending, modifier = Modifier.padding(top = 2.dp).size(20.dp))
            Column(Modifier.padding(start = 12.dp)) {
                if (title != null) Text(title, color = c.ink, fontWeight = FontWeight.Bold)
                Text(text, color = if (title != null) c.muted else c.ink, fontSize = if (title != null) 13.sp else 14.sp, lineHeight = 24.sp)
            }
        }
        if (actions != null) Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}

/** A small pending-coloured pill button inside a [NoticeCard] (the web's «تعیین سهم …»). */
@Composable
fun NoticeChip(label: String, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Text(
        label, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold,
        modifier = Modifier.height(36.dp).clip(CircleShape).background(c.pending).clickable(onClick = onClick).padding(horizontal = 14.dp, vertical = 7.dp),
    )
}

/** The web's list SectionTitle: small bold muted text over a group, with an optional action. */
@Composable
fun HomeSectionTitle(text: String, action: (@Composable () -> Unit)? = null) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth().padding(top = 16.dp, start = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text, color = c.muted, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        action?.invoke()
    }
}

/**
 * The web's TodayTimeline: today's bookings on a vertical line with a dot each (accent, pending,
 * or grey once over), and «اکنون ۱۴:۲۰» where now falls.
 */
@Composable
fun TodayTimeline(appointments: List<StaffAppointment>, tz: String, stylistName: (StaffAppointment) -> String? = { null }, onOpen: (StaffAppointment) -> Unit) {
    val c = LocalAppColors.current
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) { while (true) { delay(60_000); now = System.currentTimeMillis() } }
    val sorted = appointments.sortedBy { it.startAt }
    val nowInstant = Instant.ofEpochMilli(now)
    val nowIndex = sorted.indexOfFirst { Instant.parse(it.startAt).isAfter(nowInstant) }.let { if (it == -1) sorted.size else it }
    val nowWall = nowInstant.toSalonDateTime(tz)
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp))
            .drawBehind {
                // the line behind the dots, at the start side (right in RTL)
                val x = if (layoutDirection == androidx.compose.ui.unit.LayoutDirection.Rtl) size.width - 26.dp.toPx() else 26.dp.toPx()
                drawLine(c.line, Offset(x, 28.dp.toPx()), Offset(x, size.height - 28.dp.toPx()), 1.dp.toPx())
            }
            .padding(16.dp),
    ) {
        sorted.forEachIndexed { i, a ->
            if (i == nowIndex) NowMarker(nowWall.hour * 60 + nowWall.minute)
            TimelineRow(a, tz, Instant.parse(a.endAt).isBefore(nowInstant), stylistName(a)) { onOpen(a) }
        }
        if (nowIndex == sorted.size) NowMarker(nowWall.hour * 60 + nowWall.minute)
    }
}

@Composable
private fun NowMarker(minute: Int) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.offset(x = 2.dp).size(16.dp).clip(CircleShape).background(c.accent.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
            Box(Modifier.size(8.dp).clip(CircleShape).background(c.accent))
        }
        Box(Modifier.padding(start = 12.dp, end = 8.dp).weight(1f).height(1.dp).background(c.accent.copy(alpha = 0.5f)))
        Text("اکنون ${formatClock(minute)}", color = c.accent, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun TimelineRow(a: StaffAppointment, tz: String, past: Boolean, stylist: String?, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val s = Instant.parse(a.startAt).toSalonDateTime(tz)
    val e = Instant.parse(a.endAt).toSalonDateTime(tz)
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).alpha(if (past) 0.55f else 1f).padding(vertical = 10.dp)) {
        // the dot, ringed in the card colour so it sits on the line
        Box(Modifier.padding(top = 4.dp).size(20.dp).clip(CircleShape).background(c.card), contentAlignment = Alignment.Center) {
            Box(Modifier.size(12.dp).clip(CircleShape).background(when { past -> c.line; a.status == AppointmentStatus.PENDING -> c.pending; else -> c.accent }))
        }
        Column(Modifier.padding(start = 12.dp).weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(formatClock(s.hour * 60 + s.minute), color = c.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Text("تا ${formatClock(e.hour * 60 + e.minute)}", color = c.muted, fontSize = 12.sp, modifier = Modifier.padding(start = 6.dp).weight(1f))
                if (a.status == AppointmentStatus.PENDING) StatusChip(a.status)
            }
            Text(
                "${a.customerName} — " + a.services.joinToString("، ") { it.service.name } + (stylist?.let { " · $it" } ?: ""),
                color = c.ink.copy(alpha = 0.85f), fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
