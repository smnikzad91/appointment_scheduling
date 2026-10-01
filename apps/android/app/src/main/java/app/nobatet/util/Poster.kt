package app.nobatet.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.FileProvider
import androidx.core.content.res.ResourcesCompat
import androidx.core.graphics.drawable.toBitmap
import app.nobatet.R
import app.nobatet.ui.components.mediaUrl
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

// The share kit's promotional poster — a port of apps/web src/lib/poster.ts, drawn on a Canvas at
// story / post / print resolution: platform header, cover + avatar, name, title, place, a large QR
// code for the direct booking link and a call to action. Keep the two in step.

enum class PosterFormat(val label: String, val hint: String, val w: Int, val h: Int) {
    STORY("استوری", "۱۰۸۰×۱۹۲۰ برای استوری اینستاگرام", 1080, 1920),
    SQUARE("پست مربع", "۱۰۸۰×۱۰۸۰ برای پست", 1080, 1080),
    PRINT("چاپی A5", "A5 با کیفیت چاپ (۳۰۰ dpi) برای پیشخوان سالن", 1748, 2480),
}

/** What a poster shows. */
data class PosterData(
    val name: String,
    /** «آرایشگر مستقل»، «آرایشگر سالن رز» or «سالن زیبایی» */
    val title: String,
    /** Service names; up to three are shown under the title. */
    val specialties: List<String>,
    /** City / province (never a private address). */
    val place: String,
    val coverUrl: String?,
    val avatarUrl: String?,
    /** Round avatar (a person) or rounded square (a salon logo). */
    val squareAvatar: Boolean,
    val brandColor: Int,
    /** "nobatet.app/book/@rosa" — under the QR code. */
    val linkText: String,
    val handle: String,
    /** The QR code, black on white, at high resolution (error level H, for the logo overlay). */
    val qr: Bitmap,
)

private val BG = Color.parseColor("#121319")
private val INK = Color.parseColor("#f8f1e9")
private val MUTED = Color.argb((0.66 * 255).toInt(), 248, 241, 233)
private val ACCENT = Color.parseColor("#f2876a")
private const val CTA = "برای رزرو آنلاین نوبت، کد را با دوربین گوشی اسکن کنید"

private fun withAlpha(color: Int, alpha: Float) = Color.argb((alpha * 255).toInt(), Color.red(color), Color.green(color), Color.blue(color))

private suspend fun loadBitmap(context: Context, path: String?): Bitmap? {
    val url = mediaUrl(path) ?: return null
    val result = context.imageLoader.execute(ImageRequest.Builder(context).data(url).allowHardware(false).build())
    return (result as? SuccessResult)?.drawable?.toBitmap()
}

/** Draws the poster in [format]; photos are fetched (and the drawing done) off the main thread. */
suspend fun drawPoster(context: Context, format: PosterFormat, d: PosterData): Bitmap {
    val cover = loadBitmap(context, d.coverUrl)
    val face = loadBitmap(context, d.avatarUrl)
    return withContext(Dispatchers.Default) { PosterPainter(context, format, d, cover, face).draw() }
}

private class PosterPainter(context: Context, val format: PosterFormat, val d: PosterData, val cover: Bitmap?, val face: Bitmap?) {
    val w = format.w.toFloat()
    val h = format.h.toFloat()
    val u = w / 100 // one "unit" = 1% of the width
    val bmp: Bitmap = Bitmap.createBitmap(format.w, format.h, Bitmap.Config.ARGB_8888)
    val c = Canvas(bmp)
    val regular: Typeface? = ResourcesCompat.getFont(context, R.font.vazirmatn_regular)
    val bold: Typeface? = ResourcesCompat.getFont(context, R.font.vazirmatn_bold)
    val logo: Bitmap? = BitmapFactory.decodeResource(context.resources, R.drawable.logo_symbol)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    fun font(isBold: Boolean, size: Float) {
        paint.typeface = if (isBold) bold else regular
        paint.textSize = size
    }

    /** Shrinks the font until the text fits, then cuts it with "…" if it still doesn't. */
    fun fit(text: String, maxWidth: Float, isBold: Boolean, size: Float, minSize: Float): String {
        var s = size
        font(isBold, s)
        while (paint.measureText(text) > maxWidth && s > minSize) { s -= 2; font(isBold, s) }
        var t = text
        while (paint.measureText(t) > maxWidth && t.length > 1) t = t.dropLast(2) + "…"
        return t
    }

    fun wrap(text: String, maxWidth: Float, maxLines: Int): List<String> {
        val lines = mutableListOf<String>()
        var line = ""
        text.split(Regex("\\s+")).filter { it.isNotBlank() }.forEach { word ->
            val next = if (line.isEmpty()) word else "$line $word"
            if (paint.measureText(next) <= maxWidth || line.isEmpty()) line = next else { lines += line; line = word }
        }
        if (line.isNotEmpty()) lines += line
        if (lines.size > maxLines) {
            while (lines.size > maxLines) lines.removeAt(lines.lastIndex)
            lines[maxLines - 1] = lines[maxLines - 1].replace(Regex("\\s*\\S*$"), "") + "…"
        }
        return lines
    }

    fun centered(text: String, x: Float, y: Float, color: Int) {
        paint.color = color
        paint.textAlign = Paint.Align.CENTER
        c.drawText(text, x, y, paint)
    }

    /** Vertically centred on [cy] (the canvas "middle" baseline). */
    fun centeredMiddle(text: String, x: Float, cy: Float, color: Int) {
        val fm = paint.fontMetrics
        centered(text, x, cy - (fm.ascent + fm.descent) / 2, color)
    }

    fun roundRect(x: Float, y: Float, rw: Float, rh: Float, r: Float) = Path().apply { addRoundRect(RectF(x, y, x + rw, y + rh), r, r, Path.Direction.CW) }

    /** Draws [img] covering the box (object-fit: cover). */
    fun drawCover(img: Bitmap, x: Float, y: Float, bw: Float, bh: Float, alpha: Int = 255) {
        val scale = maxOf(bw / img.width, bh / img.height)
        val sw = bw / scale
        val sh = bh / scale
        val src = Rect(((img.width - sw) / 2).toInt(), ((img.height - sh) / 2).toInt(), ((img.width + sw) / 2).toInt(), ((img.height + sh) / 2).toInt())
        paint.alpha = alpha
        c.drawBitmap(img, src, RectF(x, y, x + bw, y + bh), paint)
        paint.alpha = 255
    }

    fun background() {
        c.drawColor(BG)
        fun glow(x: Float, y: Float, r: Float, color: Int) {
            val p = Paint().apply { shader = RadialGradient(x, y, r, color, Color.TRANSPARENT, Shader.TileMode.CLAMP) }
            c.drawRect(0f, 0f, w, h, p)
        }
        glow(w * 0.9f, h * 0.05f, w * 0.8f, withAlpha(d.brandColor, 0.45f))
        glow(w * 0.05f, h * 0.95f, w * 0.9f, Color.argb((0.22 * 255).toInt(), 242, 135, 106))
    }

    /** The logo and «نوبتت» on the right, «رزرو آنلاین نوبت» on the left; returns the bottom. */
    fun header(y: Float): Float {
        val size = u * 7
        val right = w - u * 6
        logo?.let { c.drawBitmap(it, null, RectF(right - size, y, right, y + size), paint) }
        font(true, u * 3.6f)
        paint.color = INK
        paint.textAlign = Paint.Align.RIGHT
        val fm = paint.fontMetrics
        c.drawText("نوبتت", right - size - u * 1.6f, y + size / 2 - (fm.ascent + fm.descent) / 2, paint)
        font(false, u * 2.3f)
        paint.color = MUTED
        paint.textAlign = Paint.Align.LEFT
        val fm2 = paint.fontMetrics
        c.drawText("رزرو آنلاین نوبت", u * 6, y + size / 2 - (fm2.ascent + fm2.descent) / 2, paint)
        return y + size
    }

    fun avatar(cx: Float, cy: Float, dia: Float) {
        val r = dia / 2
        val radius = if (d.squareAvatar) dia * 0.22f else r
        // ring
        paint.color = BG
        c.drawPath(roundRect(cx - r - dia * 0.04f, cy - r - dia * 0.04f, dia * 1.08f, dia * 1.08f, radius + dia * 0.04f), paint)
        c.save()
        c.clipPath(roundRect(cx - r, cy - r, dia, dia, radius))
        if (face != null) drawCover(face, cx - r, cy - r, dia, dia)
        else {
            paint.color = d.brandColor
            c.drawRect(cx - r, cy - r, cx + r, cy + r, paint)
            font(true, dia * 0.42f)
            centeredMiddle(d.name.trim().take(1), cx, cy + dia * 0.03f, Color.WHITE)
        }
        c.restore()
    }

    /** The QR on a white card with the platform logo in its middle. */
    fun qrCard(x: Float, y: Float, size: Float) {
        val pad = size * 0.07f
        val card = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; setShadowLayer(size * 0.06f, 0f, 0f, Color.argb(90, 0, 0, 0)) }
        c.drawPath(roundRect(x, y, size, size, size * 0.08f), card)
        c.drawBitmap(d.qr, null, RectF(x + pad, y + pad, x + size - pad, y + size - pad), Paint()) // crisp modules, no smoothing
        logo?.let {
            val l = size * 0.18f
            paint.color = Color.WHITE
            c.drawPath(roundRect(x + size / 2 - l / 2 - l * 0.12f, y + size / 2 - l / 2 - l * 0.12f, l * 1.24f, l * 1.24f, l * 0.3f), paint)
            c.drawBitmap(it, null, RectF(x + size / 2 - l / 2, y + size / 2 - l / 2, x + size / 2 + l / 2, y + size / 2 + l / 2), paint)
        }
    }

    fun ctaBar(x: Float, y: Float, bw: Float, bh: Float, textSize: Float, minSize: Float) {
        paint.color = withAlpha(d.brandColor, 0.95f)
        c.drawPath(roundRect(x, y, bw, bh, bh / 2), paint)
        val t = fit(CTA, bw - u * 6, true, textSize, minSize)
        centeredMiddle(t, w / 2, y + bh / 2 + u * 0.3f, Color.WHITE)
    }

    fun draw(): Bitmap {
        val subtitle = d.specialties.take(3).joinToString("، ")
        background()
        if (format == PosterFormat.SQUARE) drawSquare(subtitle) else drawTall(subtitle)
        return bmp
    }

    /** Cover as a dimmed backdrop; text on the right, QR on the left. */
    fun drawSquare(subtitle: String) {
        cover?.let {
            drawCover(it, 0f, 0f, w, h, alpha = (0.28 * 255).toInt())
            val shade = Paint().apply { shader = LinearGradient(0f, 0f, 0f, h, Color.argb(140, 18, 19, 25), Color.argb(235, 18, 19, 25), Shader.TileMode.CLAMP) }
            c.drawRect(0f, 0f, w, h, shade)
        }
        header(u * 6)
        val colW = w * 0.46f
        val colCx = (w - u * 6) - colW / 2
        val av = u * 22
        avatar(colCx, u * 34, av)
        var y = u * 34 + av / 2 + u * 9
        centered(fit(d.name, colW, true, u * 6.2f, u * 3.6f), colCx, y, INK)
        y += u * 6
        centered(fit(d.title, colW, true, u * 3.4f, u * 2.4f), colCx, y, ACCENT)
        if (subtitle.isNotEmpty()) {
            y += u * 4.8f
            font(false, u * 2.8f)
            wrap(subtitle, colW, 2).forEach { centered(it, colCx, y, MUTED); y += u * 3.8f }
        }
        if (d.place.isNotEmpty()) {
            y += u * 1.4f
            centered(fit(d.place, colW, false, u * 2.8f, u * 2.2f), colCx, y, MUTED)
        }
        val qrSize = u * 38
        val qrX = u * 6
        val qrY = u * 24
        qrCard(qrX, qrY, qrSize)
        centered(fit("@${d.handle}", qrSize, true, u * 3.6f, u * 2.4f), qrX + qrSize / 2, qrY + qrSize + u * 6, INK)
        ctaBar(u * 6, h - u * 16, w - u * 12, u * 10, u * 3.2f, u * 2.4f)
    }

    /** Story and A5 print: one centred column. */
    fun drawTall(subtitle: String) {
        val story = format == PosterFormat.STORY
        var y = header(if (story) u * 10 else u * 6) + u * 5
        // A5 is shorter for its width than a story: smaller cover and avatar leave the QR its room
        val coverH = if (story) h * 0.17f else h * 0.12f
        val coverX = u * 6
        val coverW = w - u * 12
        c.save()
        c.clipPath(roundRect(coverX, y, coverW, coverH, u * 4))
        if (cover != null) drawCover(cover, coverX, y, coverW, coverH)
        else c.drawRect(coverX, y, coverX + coverW, y + coverH, Paint().apply {
            shader = LinearGradient(coverX, y, coverX + coverW, y + coverH, withAlpha(d.brandColor, 0.9f), Color.argb(140, 242, 135, 106), Shader.TileMode.CLAMP)
        })
        c.drawRect(coverX, y, coverX + coverW, y + coverH, Paint().apply {
            shader = LinearGradient(0f, y + coverH * 0.45f, 0f, y + coverH, Color.argb(0, 18, 19, 25), Color.argb(190, 18, 19, 25), Shader.TileMode.CLAMP)
        })
        c.restore()

        val av = if (story) u * 26 else u * 21
        val avCy = y + coverH
        avatar(w / 2, avCy, av)
        y = avCy + av / 2 + u * 9
        centered(fit(d.name, w - u * 14, true, u * 7.4f, u * 4.2f), w / 2, y, INK)
        y += u * 6.4f
        centered(fit(d.title, w - u * 16, true, u * 3.8f, u * 2.6f), w / 2, y, ACCENT)
        if (subtitle.isNotEmpty()) {
            y += u * 5
            font(false, u * 3)
            wrap(subtitle, w - u * 20, 2).forEach { centered(it, w / 2, y, MUTED); y += u * 4.2f }
            y -= u * 4.2f
        }
        if (d.place.isNotEmpty()) {
            y += u * 5
            centered(fit(d.place, w - u * 20, false, u * 3, u * 2.4f), w / 2, y, MUTED)
        }

        // the call to action and link sit on the bottom edge (above a story's bottom UI); the QR
        // fills the space between them and the text, as large as it fits
        val linkY = h - if (story) u * 20 else u * 8
        val ctaTop = linkY - u * 7.5f - u * 11
        val areaTop = y + u * 5
        val areaBottom = ctaTop - u * 5
        val qrSize = minOf(u * 62, areaBottom - areaTop)
        val qrY = areaTop + maxOf(0f, (areaBottom - areaTop - qrSize) / 2)
        qrCard((w - qrSize) / 2, qrY, qrSize)
        ctaBar(u * 8, ctaTop, w - u * 16, u * 11, u * 3.4f, u * 2.4f)
        centered(fit(d.linkText, w - u * 16, true, u * 3.6f, u * 2.2f), w / 2, linkY, INK)
    }
}

/** Writes an image to the cache and opens the share sheet (Instagram story, messengers…). */
fun sharePoster(context: Context, bitmap: Bitmap, fileName: String) {
    val dir = File(context.cacheDir, "posters").apply { mkdirs() }
    val file = File(dir, fileName)
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
    val send = Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    context.startActivity(Intent.createChooser(send, "ارسال تصویر"))
}

/** Saves an image to the gallery (Pictures/Nobatet); true when it worked. */
suspend fun saveToGallery(context: Context, bitmap: Bitmap, fileName: String): Boolean = withContext(Dispatchers.IO) {
    runCatching {
        if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, fileName)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Nobatet")
            }
            val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values) ?: error("no uri")
            context.contentResolver.openOutputStream(uri)!!.use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
        } else {
            // Android 8–9: the app's own Pictures folder, then let the media scanner see it
            val dir = File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Nobatet").apply { mkdirs() }
            val file = File(dir, fileName)
            file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            android.media.MediaScannerConnection.scanFile(context, arrayOf(file.path), arrayOf("image/png"), null)
        }
        true
    }.getOrDefault(false)
}

// The WebView must outlive the call until printing has the page; one at a time.
private var printing: android.webkit.WebView? = null

/** Prints an image on one page, fitted (the web's «چاپ یا ذخیره PDF»; the dialog offers «Save as PDF»). */
fun printPoster(context: Context, bitmap: Bitmap, jobName: String) {
    val png = java.io.ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
    val html = "<!doctype html><html><head><style>@page{margin:0}html,body{margin:0;height:100%}" +
        "img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src=\"data:image/png;base64," +
        android.util.Base64.encodeToString(png, android.util.Base64.NO_WRAP) + "\"></body></html>"
    val web = android.webkit.WebView(context)
    printing = web
    web.webViewClient = object : android.webkit.WebViewClient() {
        override fun onPageFinished(view: android.webkit.WebView, url: String?) {
            val pm = context.getSystemService(Context.PRINT_SERVICE) as android.print.PrintManager
            pm.print(jobName, view.createPrintDocumentAdapter(jobName), android.print.PrintAttributes.Builder().setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A5).build())
        }
    }
    web.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
}
