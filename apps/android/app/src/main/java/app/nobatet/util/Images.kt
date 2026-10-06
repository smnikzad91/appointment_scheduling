package app.nobatet.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import java.io.ByteArrayOutputStream

/**
 * A picked photo as a JPEG small enough to upload — like the web's uploadImage: decoded on the
 * phone (HEIC included where Android can), longest edge ≤ [maxEdge], quality stepped down to stay
 * under [maxBytes].
 */
fun compressForUpload(context: Context, uri: Uri, maxEdge: Int = 1600, maxBytes: Int = 900 * 1024): ByteArray {
    val source: Bitmap = if (Build.VERSION.SDK_INT >= 28) {
        ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri)) { decoder, info, _ ->
            val (w, h) = info.size.width to info.size.height
            val scale = maxEdge.toFloat() / maxOf(w, h)
            if (scale < 1f) decoder.setTargetSize((w * scale).toInt(), (h * scale).toInt())
            decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
        }
    } else {
        @Suppress("DEPRECATION")
        MediaStore.Images.Media.getBitmap(context.contentResolver, uri).let { b ->
            val scale = maxEdge.toFloat() / maxOf(b.width, b.height)
            if (scale < 1f) Bitmap.createScaledBitmap(b, (b.width * scale).toInt(), (b.height * scale).toInt(), true) else b
        }
    }
    var quality = 88
    while (true) {
        val out = ByteArrayOutputStream()
        source.compress(Bitmap.CompressFormat.JPEG, quality, out)
        if (out.size() <= maxBytes || quality <= 40) return out.toByteArray()
        quality -= 12
    }
}
