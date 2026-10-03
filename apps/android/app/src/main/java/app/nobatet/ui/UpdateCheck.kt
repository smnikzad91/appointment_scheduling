package app.nobatet.ui

import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.AppVersion
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.update.ApkUpdater
import app.nobatet.update.UpdateNeed
import app.nobatet.update.normalizedSha256
import app.nobatet.update.updateNeed
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/** Where the in-app update is in the `direct` build. */
private sealed interface Step {
    data object Idle : Step
    /** [percent] null while the size isn't known. */
    data class Downloading(val id: Long, val percent: Int?, val waitingForNetwork: Boolean = false) : Step
    data object Verifying : Step
    data class NeedsPermission(val apk: java.io.File) : Step
    data class InstallerOpened(val apk: java.io.File) : Step
    data class Failed(val message: String) : Step
}

private const val MSG_CORRUPT = "فایل دریافتی سالم نیست، دوباره تلاش کنید"
private const val MSG_NO_INSTALLER = "نصب‌کننده اندروید باز نشد، دوباره تلاش کنید."
private const val MSG_DOWNLOAD_FAILED = "دریافت نسخه تازه انجام نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید."

/**
 * At start: apps/web public/app-version.json. Below `minVersionCode` the app can't be used until
 * updated (the API may have changed); below `latestVersionCode` an update is offered once.
 * A failed check (or a failed download, for an optional update) never blocks the app.
 *
 * `direct` build: downloads the APK in-app (update/ApkUpdater.kt), checks its SHA-256 and opens the
 * installer. `bazaar` / `myket`: those stores forbid self-updates, so the button opens the store page.
 */
@Composable
fun UpdateCheck(container: AppContainer) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val updater = remember { ApkUpdater(context) }
    var version by remember { mutableStateOf<AppVersion?>(null) }
    var dismissed by remember { mutableStateOf(false) }
    var step by remember { mutableStateOf<Step>(Step.Idle) }
    val direct = BuildConfig.DISTRIBUTION == "direct"

    suspend fun check() {
        // keeps what we knew when the request fails: a known mandatory update stays mandatory
        val v = runCatching { container.web.appVersion() }.getOrNull() ?: return
        if (v.latestVersionCode != version?.latestVersionCode) step = Step.Idle
        version = v
        if (direct) updater.cleanup(keepCode = v.latestVersionCode.takeIf { updateNeed(BuildConfig.VERSION_CODE, v) != UpdateNeed.NONE })
    }
    LaunchedEffect(Unit) { check() }

    val v = version
    val need = v?.let { updateNeed(BuildConfig.VERSION_CODE, it) } ?: UpdateNeed.NONE
    val required = need == UpdateNeed.REQUIRED
    val visible = required || (need == UpdateNeed.OFFERED && !dismissed)

    fun openInstaller(apk: java.io.File) {
        step = if (!updater.canInstall()) Step.NeedsPermission(apk)
        else if (runCatching { context.startActivity(updater.installIntent(apk)) }.isSuccess) Step.InstallerOpened(apk)
        else Step.Failed(MSG_NO_INSTALLER)
    }

    // Back from the unknown-sources screen or the installer (or the store): continue, and look again
    // so a mandatory update the user backed out of stays up — and goes once it's installed.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        val s = step
        if (s is Step.NeedsPermission && updater.canInstall()) openInstaller(s.apk)
        if (visible) scope.launch { check() }
    }
    // the sheet doesn't close on back when required; this keeps back from reaching the screen under it
    BackHandler(enabled = visible && required) {}

    if (v == null || !visible) return

    fun begin() {
        when {
            !direct -> openStore(context)
            // no hash to check against → never install in-app; the browser download is the fallback
            normalizedSha256(v.apkSha256) == null -> openUrl(context, v.downloadUrl)
            else -> scope.launch {
                updater.verified(v)?.let { openInstaller(it); return@launch }
                val id = updater.activeDownload(v.latestVersionCode)
                    ?: runCatching { updater.start(v) }.getOrElse { step = Step.Failed(MSG_DOWNLOAD_FAILED); return@launch }
                step = Step.Downloading(id, null)
            }
        }
    }

    // Progress while the dialog is up (the download itself goes on in the background if it's closed).
    val downloadId = (step as? Step.Downloading)?.id
    if (downloadId != null) LaunchedEffect(downloadId) {
        while (true) {
            when (val s = updater.status(downloadId)) {
                is ApkUpdater.Status.Running -> {
                    val total = if (s.total > 0) s.total else v.apkSize ?: 0
                    step = Step.Downloading(downloadId, if (total > 0) (s.downloaded * 100 / total).toInt().coerceIn(0, 100) else null, s.waitingForNetwork)
                }
                ApkUpdater.Status.Done -> {
                    updater.forget()
                    step = Step.Verifying
                    val apk = updater.verified(v)
                    if (apk != null) openInstaller(apk)
                    else {
                        updater.file(v.latestVersionCode)?.delete()
                        step = Step.Failed(MSG_CORRUPT)
                    }
                    return@LaunchedEffect
                }
                ApkUpdater.Status.Failed -> {
                    updater.cancel()
                    step = Step.Failed(MSG_DOWNLOAD_FAILED)
                    return@LaunchedEffect
                }
            }
            delay(300)
        }
    }

    val c = LocalAppColors.current
    val intro = listOfNotNull(if (required) "برای ادامه، نسخه تازه اپ را نصب کنید." else "نسخه ${v.latestVersionName} آماده نصب است.", v.notes?.takeIf { it.isNotBlank() }).joinToString("\n")
    val laterButton: @Composable () -> Unit = { AppTextButton(onClick = { dismissed = true }) { Text("بعداً") } }
    val later = if (required) null else laterButton
    // offline mid-download: «تلاش دوباره» is the main button, so cancel moves here
    val cancelAndLater: @Composable () -> Unit = {
        AppTextButton(onClick = { updater.cancel(); step = Step.Idle }) { Text("انصراف") }
        later?.invoke()
    }
    val s = step
    AppDialog(
        onDismissRequest = { if (!required) dismissed = true },
        dismissible = !required,
        title = { Text(if (required) "به‌روزرسانی لازم است" else "نسخه تازه نوبتت") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                when (s) {
                    Step.Idle -> Text(intro)
                    is Step.Downloading -> {
                        Text(
                            if (s.waitingForNetwork) "اتصال اینترنت برقرار نیست؛ با وصل شدن، دریافت ادامه پیدا می‌کند."
                            else "در حال دریافت…" + (s.percent?.let { " $it٪".toPersianDigits() } ?: "")
                        )
                        val mod = Modifier.fillMaxWidth()
                        if (s.percent == null) LinearProgressIndicator(mod, color = c.accent, trackColor = c.line)
                        else LinearProgressIndicator({ s.percent / 100f }, mod, color = c.accent, trackColor = c.line)
                    }
                    Step.Verifying -> {
                        Text("در حال بررسی فایل…")
                        LinearProgressIndicator(Modifier.fillMaxWidth(), color = c.accent, trackColor = c.line)
                    }
                    is Step.NeedsPermission -> Text("برای نصب، در صفحه بعد «اجازه از این منبع» را برای نوبتت روشن کنید.")
                    is Step.InstallerOpened -> Text("نصب انجام نشد؟ اگر نصب‌کننده خطای «تداخل با بسته موجود» داد، اول نوبتت فعلی را حذف کنید و دوباره نصب کنید.", color = c.muted)
                    is Step.Failed -> Text(s.message, color = c.danger)
                }
            }
        },
        confirmButton = {
            when (s) {
                Step.Idle -> AppTextButton(onClick = { begin() }) { Text("دریافت نسخه تازه") }
                is Step.Downloading ->
                    if (s.waitingForNetwork) AppTextButton(onClick = { updater.cancel(); step = Step.Idle; begin() }) { Text("تلاش دوباره") }
                    else AppTextButton(onClick = { updater.cancel(); step = Step.Idle }) { Text("انصراف") }
                Step.Verifying -> AppTextButton(onClick = {}, enabled = false) { Text("دریافت نسخه تازه") }
                is Step.NeedsPermission -> AppTextButton(onClick = {
                    // a ROM without this screen: the installer asks for the permission itself
                    runCatching { context.startActivity(updater.permissionSettingsIntent()) }.onFailure { runCatching { context.startActivity(updater.installIntent(s.apk)) } }
                }) { Text("ادامه") }
                is Step.InstallerOpened -> AppTextButton(onClick = { if (s.apk.isFile) openInstaller(s.apk) else { step = Step.Idle; begin() } }) { Text("نصب") }
                is Step.Failed -> AppTextButton(onClick = { step = Step.Idle; begin() }) { Text("تلاش دوباره") }
            }
        },
        dismissButton = if (s is Step.Downloading && s.waitingForNetwork) cancelAndLater else later,
    )
}

/** The store page (bazaar/myket builds); its website when the store app isn't installed. */
private fun openStore(context: Context) {
    val id = BuildConfig.APPLICATION_ID
    val (app, pkg, web) = when (BuildConfig.DISTRIBUTION) {
        "myket" -> Triple("myket://details?id=$id", "ir.mservices.market", "https://myket.ir/app/$id")
        else -> Triple("bazaar://details?id=$id", "com.farsitel.bazaar", "https://cafebazaar.ir/app/$id")
    }
    try {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(app)).setPackage(pkg).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    } catch (_: ActivityNotFoundException) {
        openUrl(context, web)
    }
}

private fun openUrl(context: Context, url: String) {
    runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}
