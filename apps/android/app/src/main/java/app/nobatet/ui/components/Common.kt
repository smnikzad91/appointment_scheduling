package app.nobatet.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
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

@Composable
fun PrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, color: Color? = null, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Button(
        onClick = onClick, enabled = enabled, modifier = modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(999.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color ?: c.accent, contentColor = c.accentInk),
    ) { Text(text) }
}

@Composable
fun Loading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = LocalAppColors.current.accent) }
}

/** A screen that failed to load: the message and «تلاش دوباره» (the web's ErrorBanner onRetry). */
@Composable
fun LoadError(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Column(modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(message, color = c.danger, textAlign = TextAlign.Center)
        TextButton(onClick = onRetry) { Text("تلاش دوباره") }
    }
}

@Composable
fun Empty(title: String, line: String? = null, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Column(modifier.fillMaxWidth().padding(vertical = 48.dp, horizontal = 24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(title, style = MaterialTheme.typography.titleMedium, color = c.ink, textAlign = TextAlign.Center)
        if (line != null) Text(line, color = c.muted, textAlign = TextAlign.Center)
    }
}
