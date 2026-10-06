package app.nobatet.data

import android.content.Context
import android.net.Uri
import app.nobatet.util.compressForUpload
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/** A picked photo → shrunk JPEG → apps/web /api/upload?folder=… → its /uploads/… URL (like the web's uploadImage). */
suspend fun uploadPhoto(container: AppContainer, context: Context, uri: Uri, folder: String): String {
    val bytes = withContext(Dispatchers.IO) { compressForUpload(context, uri) }
    val part = MultipartBody.Part.createFormData("file", "photo.jpg", bytes.toRequestBody("image/jpeg".toMediaType()))
    return container.web.upload(folder, part).url
}
