package app.nobatet.ui.components

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material3.Icon
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.BuildConfig
import app.nobatet.data.AppointmentStatus
import app.nobatet.ui.theme.LocalAppColors
import coil.compose.AsyncImage

/** "/uploads/…" from apps/api → a full URL on the website. */
fun mediaUrl(path: String?): String? = when {
    path.isNullOrBlank() -> null
    path.startsWith("http") -> path
    else -> BuildConfig.WEB_BASE_URL.trimEnd('/') + "/" + path.trimStart('/')
}

@Composable
fun RemoteImage(path: String?, modifier: Modifier = Modifier, contentScale: ContentScale = ContentScale.Crop) {
    val colors = LocalAppColors.current
    val url = mediaUrl(path)
    if (url == null) Box(modifier.background(colors.card2)) else AsyncImage(model = url, contentDescription = null, modifier = modifier.background(colors.card2), contentScale = contentScale)
}

/** The web's Card: rounded, card colour, hairline border. */
@Composable
fun AppCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    val colors = LocalAppColors.current
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(colors.card).border(1.dp, colors.line, RoundedCornerShape(24.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = content,
    )
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.titleMedium, color = LocalAppColors.current.ink, modifier = modifier)
}

@Composable
fun Muted(text: String, modifier: Modifier = Modifier) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = LocalAppColors.current.muted, modifier = modifier)
}

/** Status labels and colours of apps/web components/app/appointments.tsx. */
@Composable
fun StatusChip(status: AppointmentStatus) {
    val c = LocalAppColors.current
    val (label, color) = when (status) {
        AppointmentStatus.PENDING -> "در انتظار تایید" to c.pending
        AppointmentStatus.CONFIRMED -> "تایید شده" to c.confirmed
        AppointmentStatus.COMPLETED -> "انجام شده" to c.done
        AppointmentStatus.CANCELLED -> "لغو شده" to c.muted
        AppointmentStatus.NO_SHOW -> "عدم حضور" to c.danger
    }
    Text(
        label, color = color, style = MaterialTheme.typography.labelMedium,
        modifier = Modifier.clip(RoundedCornerShape(999.dp)).background(color.copy(alpha = 0.12f)).padding(horizontal = 10.dp, vertical = 3.dp),
    )
}

/** The web's primary Button: rounded-2xl, 48 high, bold. */
@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, color: Color? = null, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Button(
        onClick = onClick, enabled = enabled, modifier = modifier.fillMaxWidth().height(48.dp), shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color ?: c.accent, contentColor = c.accentInk),
    ) { Text(text, fontSize = 15.sp, fontWeight = FontWeight.Bold) }
}

/** The web's Avatar: a photo, or the name's first letter on the accent tint; square = salon logo. */
@Composable
fun Avatar(name: String, path: String?, size: Dp = 44.dp, square: Boolean = false, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    val shape = if (square) RoundedCornerShape(size * 0.26f) else CircleShape
    Box(modifier.size(size).clip(shape).background(c.accentSoft), contentAlignment = Alignment.Center) {
        val url = mediaUrl(path)
        if (url != null) AsyncImage(model = url, contentDescription = name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        else Text(name.trim().take(1), color = c.accent, fontWeight = FontWeight.Bold, fontSize = (size.value * 0.4f).sp)
    }
}

/** A screen still loading: the web's ListSkeleton (pulsing card-shaped rows), not a spinner. */
@Composable
fun Loading(modifier: Modifier = Modifier, rows: Int = 4) {
    ListSkeleton(modifier.fillMaxSize().padding(16.dp), rows)
}

/** The web's ListSkeleton: [rows] card-shaped placeholders, 80 high. */
@Composable
fun ListSkeleton(modifier: Modifier = Modifier, rows: Int = 4) {
    Column(modifier.semantics { contentDescription = "در حال بارگذاری" }, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        repeat(rows) { SkeletonBlock(Modifier.fillMaxWidth().height(80.dp)) }
    }
}

/** One pulsing placeholder (Tailwind's animate-pulse: opacity 1 → 0.5 → 1 every 2 s) on card-2. */
@Composable
fun SkeletonBlock(modifier: Modifier = Modifier, shape: Shape = RoundedCornerShape(24.dp)) {
    val c = LocalAppColors.current
    val pulse by rememberInfiniteTransition(label = "skeleton").animateFloat(
        initialValue = 1f, targetValue = 0.5f, label = "pulse",
        animationSpec = infiniteRepeatable(tween(1000, easing = CubicBezierEasing(0.4f, 0f, 0.6f, 1f)), RepeatMode.Reverse),
    )
    Box(modifier.graphicsLayer { alpha = pulse }.clip(shape).background(c.card2))
}

/** A screen that failed to load: the web's ErrorBanner with «تلاش دوباره». */
@Composable
fun LoadError(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Box(modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.TopCenter) {
        Row(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.danger.copy(alpha = 0.1f)).padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(message, color = c.danger, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
            TextButton(onClick = onRetry) { Text("تلاش دوباره", color = c.danger, fontWeight = FontWeight.Bold) }
        }
    }
}

/** The web's EmptyState: dashed outline, the icon on the accent tint, title and hint. */
@Composable
fun Empty(title: String, line: String? = null, modifier: Modifier = Modifier, icon: ImageVector = Icons.Outlined.Inbox) {
    val c = LocalAppColors.current
    Column(
        modifier.fillMaxWidth().padding(vertical = 8.dp)
            .drawBehind {
                val r = 24.dp.toPx()
                drawRoundRect(
                    c.line, cornerRadius = CornerRadius(r),
                    style = Stroke(width = 1.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(6.dp.toPx(), 4.dp.toPx()))),
                )
            }
            .padding(vertical = 48.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(Modifier.padding(bottom = 12.dp).size(56.dp).clip(CircleShape).background(c.accentSoft), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = c.accent, modifier = Modifier.size(24.dp))
        }
        Text(title, fontWeight = FontWeight.Bold, color = c.ink, textAlign = TextAlign.Center)
        if (line != null) Text(line, color = c.muted, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
    }
}
