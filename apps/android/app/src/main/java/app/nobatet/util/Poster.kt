package app.nobatet.util

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import androidx.core.content.FileProvider
import androidx.core.content.res.ResourcesCompat
import app.nobatet.R
import java.io.File

/** What a share-kit poster shows. */
data class PosterData(
    val name: String,
    /** e.g. «آرایشگر در سالن رز، قائم‌شهر» */
    val subtitle: String,
    val services: List<String>,
    val link: String,
    val brandColor: Int,
    val qr: Bitmap,
)

/**
 * The story poster (1080×1920) of the web's share kit (src/lib/poster.ts), drawn on a Canvas:
 * brand colour, platform name, name and subtitle, up to three services, the QR on a white card,
 * the call to action and the link — kept above Instagram's bottom UI.
 */
fun drawStoryPoster(context: Context, d: PosterData): Bitmap {
    val w = 1080
    val h = 1920
    val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)
    val regular = ResourcesCompat.getFont(context, R.font.vazirmatn_regular)
    val bold = ResourcesCompat.getFont(context, R.font.vazirmatn_bold)
    val darker = android.graphics.Color.rgb(
        (android.graphics.Color.red(d.brandColor) * 0.55).toInt(), (android.graphics.Color.green(d.brandColor) * 0.55).toInt(), (android.graphics.Color.blue(d.brandColor) * 0.55).toInt(),
    )
    canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), Paint().apply { shader = LinearGradient(0f, 0f, 0f, h.toFloat(), d.brandColor, darker, Shader.TileMode.CLAMP) })

    fun text(s: String, size: Float, y: Float, font: android.graphics.Typeface?, alpha: Int = 255, maxLines: Int = 2): Float {
        val paint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE; textSize = size; typeface = font; this.alpha = alpha }
        val layout = StaticLayout.Builder.obtain(s, 0, s.length, paint, w - 160)
            .setAlignment(Layout.Alignment.ALIGN_CENTER).setTextDirection(android.text.TextDirectionHeuristics.RTL).setMaxLines(maxLines)
            .setEllipsize(android.text.TextUtils.TruncateAt.END).build()
        canvas.save(); canvas.translate(80f, y); layout.draw(canvas); canvas.restore()
        return y + layout.height
    }

    var y = text("نوبتت", 52f, 150f, bold, 220)
    y = text(d.name, 92f, y + 120f, bold)
    y = text(d.subtitle, 46f, y + 24f, regular, 230)
    if (d.services.isNotEmpty()) y = text(d.services.take(3).joinToString("، "), 40f, y + 40f, regular, 210)

    // the QR on a white card
    val card = 640f
    val top = maxOf(y + 80f, 760f)
    val left = (w - card) / 2
    canvas.drawRoundRect(RectF(left, top, left + card, top + card), 48f, 48f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = android.graphics.Color.WHITE })
    val pad = 48f
    canvas.drawBitmap(d.qr, null, RectF(left + pad, top + pad, left + card - pad, top + card - pad), Paint(Paint.FILTER_BITMAP_FLAG))

    y = text("اسکن کنید و آنلاین نوبت بگیرید", 54f, top + card + 70f, bold)
    text(d.link, 42f, y + 24f, regular, 230, maxLines = 1)
    return bmp
}

/** Writes the poster to the cache and opens the share sheet (Instagram story, messengers…). */
fun sharePoster(context: Context, bitmap: Bitmap, fileName: String) {
    val dir = File(context.cacheDir, "posters").apply { mkdirs() }
    val file = File(dir, fileName)
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
    val send = Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    context.startActivity(Intent.createChooser(send, "ارسال پوستر"))
}
