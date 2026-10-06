package app.nobatet.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AlternateEmail
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Print
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.persianError
import app.nobatet.ui.staff.HomeSectionTitle
import app.nobatet.ui.stylist.qrBitmap
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.PosterData
import app.nobatet.util.PosterFormat
import app.nobatet.util.drawPoster
import app.nobatet.util.printPoster
import app.nobatet.util.saveToGallery
import app.nobatet.util.sharePoster
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import kotlinx.coroutines.launch
import java.io.File

/** Who the kit is for — a salon (or an independent stylist's business) or a salon's stylist. */
data class ShareSubject(
    /** The link's handle: the chosen one, or a salon's slug until it picks one. */
    val handle: String,
    /** The chosen handle, if any (prefills «تغییر»). */
    val customHandle: String?,
    val name: String,
    val title: String,
    val specialties: List<String>,
    val place: String,
    val coverUrl: String?,
    val avatarUrl: String?,
    val squareAvatar: Boolean,
    val brandColor: Int,
)

private const val HANDLE_HINT = "۳ تا ۳۰ حرف انگلیسی کوچک، عدد، نقطه، خط تیره یا زیرخط؛ با حرف یا عدد شروع و تمام شود."

private val siteHost = BuildConfig.WEB_BASE_URL.removePrefix("https://").removePrefix("http://").trimEnd('/')

/**
 * The share kit, as apps/web components/app/ShareKit.tsx: the direct booking link
 * (nobatet.app/book/@handle) with copy / send / change, its QR code (PNG / SVG) and the branded
 * poster (story, square post, A5 print) with a live preview.
 */
@Composable
fun ShareKit(container: AppContainer, subject: ShareSubject, intro: String, saveHandle: suspend (String) -> String) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var handle by remember(subject.handle) { mutableStateOf(subject.handle) }
    val url = BuildConfig.WEB_BASE_URL.trimEnd('/') + "/book/@" + handle
    val linkText = "$siteHost/book/@$handle"
    var editing by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 32.dp)) {
        Text(intro, color = c.muted, fontSize = 14.sp, lineHeight = 22.sp, modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp))
        // ── link ──
        HomeSectionTitle("لینک رزرو مستقیم")
        KitCard {
            Text("این لینک مستقیم به صفحه رزرو باز می‌شود؛ در بیو اینستاگرام، واتساپ یا تلگرام بگذارید.", color = c.muted, fontSize = 14.sp, lineHeight = 24.sp)
            Ltr {
                Text(
                    linkText, color = c.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.card2).padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KitButton("کپی", Icons.Outlined.ContentCopy, primary = true, modifier = Modifier.weight(1f)) {
                    (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("link", url))
                    Toasts.success("لینک کپی شد")
                }
                KitButton("ارسال", Icons.Outlined.Share, modifier = Modifier.weight(1f)) {
                    val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "رزرو آنلاین نوبت — ${subject.name}\n$url")
                    runCatching { context.startActivity(Intent.createChooser(send, "ارسال لینک")) }
                }
                KitButton("تغییر", Icons.Outlined.AlternateEmail, modifier = Modifier.weight(1f)) { editing = true }
            }
        }

        // ── QR ──
        HomeSectionTitle("کد QR")
        val qr = remember(url) { qrBitmap(url, 1024) }
        KitCard(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.clip(RoundedCornerShape(24.dp)).background(Color.White).padding(16.dp)) {
                Image(qr.asImageBitmap(), contentDescription = "رزرو نوبت — ${subject.name}", modifier = Modifier.size(196.dp))
            }
            Ltr { Text("@$handle", color = c.ink, fontSize = 14.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KitButton("PNG", Icons.Outlined.Download, primary = true, modifier = Modifier.weight(1f)) {
                    scope.launch { if (saveToGallery(context, qr, "nobatet-$handle-qr.png")) Toasts.success("در گالری ذخیره شد") else Toasts.error("ذخیره تصویر انجام نشد") }
                }
                KitButton("SVG (برداری)", Icons.Outlined.Download, modifier = Modifier.weight(1f)) { shareSvg(context, url, "nobatet-$handle-qr.svg") }
            }
        }

        // ── poster ──
        HomeSectionTitle("پوستر معرفی")
        var format by rememberSaveable { mutableStateOf(PosterFormat.STORY) }
        var poster by remember { mutableStateOf<Bitmap?>(null) }
        var drawing by remember { mutableStateOf(true) }
        LaunchedEffect(format, handle, subject) {
            drawing = true
            poster = runCatching {
                drawPoster(
                    context, format,
                    PosterData(
                        subject.name, subject.title, subject.specialties, subject.place, subject.coverUrl, subject.avatarUrl, subject.squareAvatar,
                        subject.brandColor, linkText, handle, qrBitmap(url, 1024),
                    ),
                )
            }.getOrNull() ?: poster
            drawing = false
        }
        KitCard {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                PosterFormat.entries.forEach { f ->
                    val on = f == format
                    Box(
                        Modifier.weight(1f).height(44.dp).clip(RoundedCornerShape(16.dp)).background(if (on) c.ink else c.card)
                            .then(if (on) Modifier else Modifier.border(1.dp, c.line, RoundedCornerShape(16.dp)))
                            .clickable(role = Role.RadioButton) { format = f },
                        contentAlignment = Alignment.Center,
                    ) { Text(f.label, color = if (on) c.bg else c.muted, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
                }
            }
            Text(format.hint, color = c.muted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 4.dp))
            Box(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card2).padding(12.dp), contentAlignment = Alignment.Center) {
                val frac = if (format == PosterFormat.SQUARE) 1f else 0.62f
                val shape = RoundedCornerShape(16.dp)
                val p = poster
                if (p != null) Image(
                    p.asImageBitmap(), contentDescription = "پیش‌نمایش پوستر",
                    modifier = Modifier.fillMaxWidth(frac).aspectRatio(format.w.toFloat() / format.h).clip(shape).alpha(if (drawing) 0.5f else 1f),
                ) else SkeletonBlock(Modifier.fillMaxWidth(frac).aspectRatio(format.w.toFloat() / format.h), shape)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KitButton("دانلود تصویر", Icons.Outlined.Image, primary = true, enabled = !drawing && poster != null, modifier = Modifier.weight(1f)) {
                    val p = poster ?: return@KitButton
                    scope.launch { if (saveToGallery(context, p, "nobatet-$handle-${format.name.lowercase()}.png")) Toasts.success("در گالری ذخیره شد") else Toasts.error("ذخیره تصویر انجام نشد") }
                }
                KitButton("ارسال به اینستاگرام…", Icons.Outlined.Share, enabled = !drawing && poster != null, modifier = Modifier.weight(1f)) {
                    poster?.let { runCatching { sharePoster(context, it, "nobatet-$handle.png") } }
                }
            }
            AppTextButton(onClick = { poster?.let { printPoster(context, it, "nobatet-$handle") } }, enabled = !drawing && poster != null, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                Icon(Icons.Outlined.Print, contentDescription = null, modifier = Modifier.size(16.dp))
                Text("چاپ یا ذخیره PDF", modifier = Modifier.padding(start = 6.dp))
            }
        }
    }

    if (editing) HandleSheet(subject.customHandle ?: handle, onDismiss = { editing = false }) { draft ->
        try {
            handle = saveHandle(draft)
            editing = false
            Toasts.success("لینک جدید ذخیره شد")
            null
        } catch (e: Exception) {
            persianError(e, "ذخیره نام کاربری انجام نشد", container.json)
        }
    }
}

/** «نام کاربری لینک»: the @handle, a preview of the link, and the warning that the old one stops. */
@Composable
private fun HandleSheet(initial: String, onDismiss: () -> Unit, onSave: suspend (String) -> String?) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var draft by remember { mutableStateOf(initial) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    AppDialog(
        onDismissRequest = { if (!saving) onDismiss() },
        title = { Text("نام کاربری لینک") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Ltr {
                    AppTextField(
                        draft, { draft = it.replace(Regex("\\s"), "").lowercase().take(30) }, label = { Text("نام کاربری") }, singleLine = true,
                        prefix = { Text("@", color = c.muted, fontWeight = FontWeight.Bold) }, placeholder = { Text("rosa.makeup") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, autoCorrectEnabled = false), modifier = Modifier.fillMaxWidth(),
                    )
                }
                Text(HANDLE_HINT, color = c.muted, fontSize = 12.sp, lineHeight = 20.sp)
                Ltr {
                    Text(
                        "$siteHost/book/@${draft.ifEmpty { "…" }}", color = c.muted, fontSize = 14.sp, fontFamily = FontFamily.Monospace,
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.card2).padding(horizontal = 16.dp, vertical = 12.dp),
                    )
                }
                Text("با تغییر نام کاربری، لینک و کد QR قبلی دیگر کار نمی‌کند؛ پوسترهای چاپ‌شده را دوباره بگیرید.", color = c.pending, fontSize = 12.sp, lineHeight = 20.sp)
                error?.let { Text(it, color = c.danger, fontSize = 14.sp) }
            }
        },
        confirmButton = {
            PrimaryButton(if (saving) "لطفاً صبر کنید…" else "ذخیره", enabled = !saving && draft.isNotBlank()) {
                scope.launch {
                    saving = true
                    error = onSave(draft.trim().trimStart('@').lowercase())
                    saving = false
                }
            }
        },
    )
}

/** The kit's cards: rounded, card colour, hairline border. */
@Composable
private fun KitCard(horizontalAlignment: Alignment.Horizontal = Alignment.Start, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalAppColors.current
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = horizontalAlignment, content = content,
    )
}

/** The web's Button with an icon: primary (accent) or secondary (card, hairline). */
@Composable
private fun KitButton(label: String, icon: ImageVector, modifier: Modifier = Modifier, primary: Boolean = false, enabled: Boolean = true, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val content: @Composable () -> Unit = {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center, modifier = Modifier.padding(start = 6.dp))
    }
    if (primary) Button(
        onClick = onClick, enabled = enabled, modifier = modifier.height(48.dp), shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(containerColor = c.accent, contentColor = c.accentInk), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp),
    ) { content() }
    else SecondaryButton(onClick = onClick, enabled = enabled, modifier = modifier.height(48.dp)) { content() }
}

/** Links, handles and the QR caption read left-to-right. */
@Composable
private fun Ltr(content: @Composable () -> Unit) {
    androidx.compose.runtime.CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr, content = content)
}

/** The QR as an SVG file (vector, for print shops), handed to the share sheet. */
private fun shareSvg(context: Context, text: String, fileName: String) {
    val m = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, 0, 0, mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M, EncodeHintType.MARGIN to 1))
    val n = m.width
    val svg = buildString {
        append("""<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 $n $n" shape-rendering="crispEdges"><rect width="$n" height="$n" fill="#fff"/><path fill="#000" d="""")
        for (y in 0 until n) for (x in 0 until n) if (m[x, y]) append("M$x ${y}h1v1h-1z")
        append("\"/></svg>")
    }
    val dir = File(context.cacheDir, "posters").apply { mkdirs() }
    val file = File(dir, fileName).apply { writeText(svg) }
    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
    val send = Intent(Intent.ACTION_SEND).setType("image/svg+xml").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { context.startActivity(Intent.createChooser(send, "فایل SVG")) }
}
