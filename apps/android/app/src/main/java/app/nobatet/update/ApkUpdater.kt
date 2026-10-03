package app.nobatet.update

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import androidx.core.content.FileProvider
import app.nobatet.data.AppVersion
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

/**
 * In-app update for the `direct` build (UpdateCheck drives it): DownloadManager fetches the APK into
 * the app's external files (Download/updates/, shared through the FileProvider), the SHA-256 from
 * app-version.json is checked, then the system installer gets the file. The download id is kept in
 * prefs so a closed dialog or a restarted app picks up the same download instead of starting another.
 */
class ApkUpdater(context: Context) {
    private val app = context.applicationContext
    private val dm = app.getSystemService(DownloadManager::class.java)
    private val prefs = app.getSharedPreferences("apk_update", Context.MODE_PRIVATE)

    sealed interface Status {
        /** [total] ≤ 0 when the size isn't known yet. */
        data class Running(val downloaded: Long, val total: Long, val waitingForNetwork: Boolean) : Status
        data object Done : Status
        /** Failed, or removed from the system's download list. */
        data object Failed : Status
    }

    private val dir: File? get() = app.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS)?.let { File(it, "updates") }

    fun file(versionCode: Int): File? = dir?.let { File(it, UpdateFiles.apkName(versionCode)) }

    /** Deletes update APKs other than [keepCode]'s (older downloads, the one already installed). */
    suspend fun cleanup(keepCode: Int?) = withContext(Dispatchers.IO) {
        val d = dir ?: return@withContext
        UpdateFiles.stale(d.list()?.toList().orEmpty(), keepCode).forEach { File(d, it).delete() }
    }

    /** The fully downloaded APK of this version if its size and hash check out. */
    suspend fun verified(v: AppVersion): File? = withContext(Dispatchers.IO) {
        file(v.latestVersionCode)?.takeIf { f ->
            f.isFile && (v.apkSize == null || f.length() == v.apkSize) && hashMatches(f, v.apkSha256)
        }
    }

    /** A download of this version started earlier and not failed/removed since. */
    fun activeDownload(versionCode: Int): Long? {
        val id = prefs.getLong(KEY_ID, -1).takeIf { it >= 0 && prefs.getInt(KEY_CODE, -1) == versionCode } ?: return null
        return id.takeIf { status(it) != Status.Failed }
    }

    /** Starts downloading [v] (dropping any earlier download and partial file). Throws if DownloadManager refuses. */
    fun start(v: AppVersion): Long {
        cancel()
        val name = UpdateFiles.apkName(v.latestVersionCode)
        file(v.latestVersionCode)?.delete()
        val request = DownloadManager.Request(Uri.parse(v.downloadUrl))
            .setTitle("نوبتت ${v.latestVersionName}".trim())
            .setDescription("دریافت نسخه تازه")
            .setMimeType(APK_MIME)
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setDestinationInExternalFilesDir(app, Environment.DIRECTORY_DOWNLOADS, "updates/$name")
        val id = dm.enqueue(request)
        prefs.edit().putLong(KEY_ID, id).putInt(KEY_CODE, v.latestVersionCode).apply()
        return id
    }

    fun status(id: Long): Status = runCatching {
        dm.query(DownloadManager.Query().setFilterById(id)).use { c ->
            if (!c.moveToFirst()) return Status.Failed
            val status = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS))
            val reason = c.getInt(c.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON))
            val done = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR))
            val total = c.getLong(c.getColumnIndexOrThrow(DownloadManager.COLUMN_TOTAL_SIZE_BYTES))
            when (status) {
                DownloadManager.STATUS_SUCCESSFUL -> Status.Done
                DownloadManager.STATUS_FAILED -> Status.Failed
                DownloadManager.STATUS_PAUSED -> Status.Running(done, total, waitingForNetwork = reason != DownloadManager.PAUSED_UNKNOWN)
                else -> Status.Running(done, total, waitingForNetwork = false)
            }
        }
    }.getOrDefault(Status.Failed)

    /** Stops and removes the current download (DownloadManager deletes the partial file). */
    fun cancel() {
        val id = prefs.getLong(KEY_ID, -1)
        if (id >= 0) runCatching { dm.remove(id) }
        forget()
    }

    /** Done with the download id (the file stays). */
    fun forget() = prefs.edit().remove(KEY_ID).remove(KEY_CODE).apply()

    fun canInstall(): Boolean = app.packageManager.canRequestPackageInstalls()

    /** «نصب از منابع ناشناس» for this app. */
    fun permissionSettingsIntent() = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${app.packageName}"))

    fun installIntent(apk: File): Intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(FileProvider.getUriForFile(app, app.packageName + ".files", apk), APK_MIME)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)

    companion object {
        const val APK_MIME = "application/vnd.android.package-archive"
        private const val KEY_ID = "download_id"
        private const val KEY_CODE = "version_code"
    }
}
