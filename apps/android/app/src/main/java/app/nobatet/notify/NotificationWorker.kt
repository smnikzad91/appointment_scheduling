package app.nobatet.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import app.nobatet.MainActivity
import app.nobatet.NobatetApp
import app.nobatet.R
import app.nobatet.data.Role
import java.time.Instant
import java.util.concurrent.TimeUnit

private const val CHANNEL = "updates"
private const val PREFS = "notifications"
private const val LAST_SEEN = "lastSeenAt"

/**
 * Phone notifications without Firebase (unreliable in Iran) or a push provider: every ~15 minutes
 * (Android's minimum; Doze may stretch it) apps/api's in-app notifications are checked, and each
 * new unread one is shown with the same text as the bell. The first run only marks what's there
 * as seen, so a new install doesn't replay old notifications. Real-time push (Pushe/Najva) can
 * replace this later.
 */
class NotificationWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val container = (applicationContext as NobatetApp).container
        if (container.tokens.current() == null) return Result.success()
        val scope = when (container.tokens.role()) {
            Role.CUSTOMER -> NotificationScope.CUSTOMER
            Role.STYLIST -> NotificationScope.STYLIST
            Role.SALON_OWNER, Role.INDEPENDENT_STYLIST -> NotificationScope.SALON
            else -> return Result.success()
        }
        val list = runCatching { container.api.notifications() }.getOrElse { return Result.retry() }
        val prefs = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val lastSeen = prefs.getString(LAST_SEEN, null)?.let { runCatching { Instant.parse(it) }.getOrNull() }
        val newest = list.items.maxOfOrNull { Instant.parse(it.createdAt) }
        if (lastSeen != null) {
            list.items.filter { it.readAt == null && Instant.parse(it.createdAt).isAfter(lastSeen) }
                .sortedBy { it.createdAt }
                .forEach { show(describe(it, scope), it.id.hashCode()) }
        }
        if (newest != null && (lastSeen == null || newest.isAfter(lastSeen))) prefs.edit().putString(LAST_SEEN, newest.toString()).apply()
        else if (lastSeen == null) prefs.edit().putString(LAST_SEEN, Instant.now().toString()).apply()
        return Result.success()
    }

    private fun show(text: NotificationText, id: Int) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(applicationContext, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        val open = PendingIntent.getActivity(
            applicationContext, 0, Intent(applicationContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(text.title)
            .setContentText(text.detail)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text.detail ?: text.title))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build()
        runCatching { NotificationManagerCompat.from(applicationContext).notify(id, notification) }
    }

    companion object {
        fun setUp(context: Context) {
            if (Build.VERSION.SDK_INT >= 26) {
                context.getSystemService(NotificationManager::class.java)
                    .createNotificationChannel(NotificationChannel(CHANNEL, "نوبت‌ها و اعلان‌ها", NotificationManager.IMPORTANCE_DEFAULT))
            }
            val work = PeriodicWorkRequestBuilder<NotificationWorker>(15, TimeUnit.MINUTES)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("notifications", ExistingPeriodicWorkPolicy.KEEP, work)
        }

        /** A new account on this phone: start from "nothing seen". */
        fun reset(context: Context) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(LAST_SEEN).apply()
        }
    }
}
