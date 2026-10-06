package app.nobatet.update

import android.Manifest
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import app.nobatet.R
import app.nobatet.data.AppVersion
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File

/**
 * In-app update for the `direct` build (UpdateCheck drives it): DownloadManager fetches the APK into
 * the app's external files (Download/updates/, shared through the FileProvider), the SHA-256 from
 * app-version.json is checked, then the system installer gets the file. The download id is kept in
 * prefs so a closed dialog or a restarted app picks up the same download instead of starting another.
 *
 * Some ROMs (MIUI especially) disable or restrict DownloadManager for apps: when it refuses the
 * request or the download fails, [startDirect] fetches the same file with OkHttp instead. One
 * instance per process (AppContainer.apkUpdater), so that download outlives the dialog.
 */
class ApkUpdater(context: Context, private val http: OkHttpClient) {
    private val app = context.applicationContext
    private val dm: DownloadManager? = app.getSystemService(DownloadManager::class.java)
    private val prefs = app.getSharedPreferences("apk_update", Context.MODE_PRIVATE)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var direct: Job? = null
    @Volatile private var directStatus: Status = Status.Failed

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
        val dm = dm ?: error("DownloadManager unavailable")
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
        val dm = dm ?: return Status.Failed
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
        if (id >= 0) runCatching { dm?.remove(id) }
        forget()
        direct?.cancel()
        direct = null
    }

    /** The fallback download: a plain HTTP GET of `downloadUrl` into the same file, progress in [directStatus]. */
    fun startDirect(v: AppVersion) {
        cancel()
        val target = file(v.latestVersionCode) ?: run { directStatus = Status.Failed; return }
        directStatus = Status.Running(0, v.apkSize ?: 0, waitingForNetwork = false)
        direct = scope.launch {
            val ok = runCatching {
                target.parentFile?.mkdirs()
                target.delete()
                val part = File(target.path + ".part").apply { delete() }
                http.newCall(Request.Builder().url(v.downloadUrl).build()).execute().use { res ->
                    val body = res.body
                    if (!res.isSuccessful || body == null) return@use false
                    val total = body.contentLength().takeIf { it > 0 } ?: (v.apkSize ?: 0)
                    var done = 0L
                    body.byteStream().use { input ->
                        part.outputStream().use { out ->
                            val buf = ByteArray(64 * 1024)
                            while (true) {
                                ensureActive()
                                val n = input.read(buf)
                                if (n < 0) break
                                out.write(buf, 0, n)
                                done += n
                                directStatus = Status.Running(done, total, waitingForNetwork = false)
                            }
                        }
                    }
                    part.renameTo(target)
                }
            }.getOrDefault(false)
            directStatus = if (ok) Status.Done else Status.Failed
        }
    }

    /** The fallback download is still going (e.g. the dialog was closed and opened again). */
    fun directActive(): Boolean = direct?.isActive == true

    fun directStatus(): Status = directStatus

    /** Done with the download id (the file stays). */
    fun forget() = prefs.edit().remove(KEY_ID).remove(KEY_CODE).apply()

    fun canInstall(): Boolean = app.packageManager.canRequestPackageInstalls()

    /** «نصب از منابع ناشناس» for this app. */
    fun permissionSettingsIntent() = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${app.packageName}"))

    fun installIntent(apk: File): Intent = Intent(Intent.ACTION_VIEW)
        .setDataAndType(FileProvider.getUriForFile(app, app.packageName + ".files", apk), APK_MIME)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)

    /**
     * «نسخه تازه دریافت شد — برای نصب بزنید». Used when the download finishes while the app isn't in
     * front: Android 10+ silently blocks starting the installer from the background, but a tap on a
     * notification is allowed. Nothing without the notification permission (the dialog's «نصب» still works).
     */
    fun notifyReady(apk: File, versionName: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(app, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val nm = app.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CHANNEL, "به‌روزرسانی اپ", NotificationManager.IMPORTANCE_HIGH))
        val open = PendingIntent.getActivity(app, 0, installIntent(apk), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(app, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(if (versionName.isBlank()) "نسخه تازه نوبتت دریافت شد" else "نسخه ${versionName.toPersianVersion()} نوبتت دریافت شد")
            .setContentText("برای نصب بزنید")
            .setContentIntent(open)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()
        runCatching { nm.notify(NOTIFY_TAG, NOTIFY_ID, n) }
    }

    fun clearReadyNotification() {
        runCatching { app.getSystemService(NotificationManager::class.java)?.cancel(NOTIFY_TAG, NOTIFY_ID) }
    }

    private fun String.toPersianVersion() = map { c -> if (c in '0'..'9') "۰۱۲۳۴۵۶۷۸۹"[c - '0'] else c }.joinToString("")

    companion object {
        private const val CHANNEL = "app_update"
        // tagged, so it can't collide with the booking notifications' ids
        private const val NOTIFY_TAG = "app_update"
        private const val NOTIFY_ID = 1
        const val APK_MIME = "application/vnd.android.package-archive"
        private const val KEY_ID = "download_id"
        private const val KEY_CODE = "version_code"
    }
}
