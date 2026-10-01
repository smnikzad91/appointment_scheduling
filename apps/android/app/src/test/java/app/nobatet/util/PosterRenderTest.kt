package app.nobatet.util

import android.graphics.Bitmap
import android.graphics.Color
import androidx.test.core.app.ApplicationProvider
import app.nobatet.ui.stylist.qrBitmap
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Draws each poster format with Android's real graphics (Robolectric native mode) into
 * app/build/posters/ — to eyeball against the web's share kit.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], application = android.app.Application::class)
class PosterRenderTest {
    @Test
    fun drawsEveryFormat() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val out = File("build/posters").apply { mkdirs() }
        val data = PosterData(
            name = "سالن رز", title = "سالن زیبایی", specialties = listOf("کوتاهی مو", "رنگ مو", "کراتین"), place = "قائم‌شهر، مازندران",
            coverUrl = null, avatarUrl = null, squareAvatar = true, brandColor = Color.parseColor("#a34a30"),
            linkText = "nobatet.app/book/@rose", handle = "rose", qr = qrBitmap("https://nobatet.app/book/@rose", 1024),
        )
        PosterFormat.entries.forEach { f ->
            val bmp = drawPoster(context, f, data)
            File(out, "poster-${f.name.lowercase()}.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
        }
    }
}
