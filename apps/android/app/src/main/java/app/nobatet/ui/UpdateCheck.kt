package app.nobatet.ui

import android.content.Intent
import android.net.Uri
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.AppVersion

/**
 * At start: apps/web public/app-version.json. Below `minVersionCode` the app can't be used until
 * updated (the API may have changed); below `latestVersionCode` an update is offered once.
 */
@Composable
fun UpdateCheck(container: AppContainer) {
    val context = LocalContext.current
    var version by remember { mutableStateOf<AppVersion?>(null) }
    var dismissed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { version = runCatching { container.web.appVersion() }.getOrNull() }
    val v = version ?: return
    val required = BuildConfig.VERSION_CODE < v.minVersionCode
    val offered = BuildConfig.VERSION_CODE < v.latestVersionCode
    if (!required && (!offered || dismissed)) return
    val open = { runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(v.downloadUrl))) } }
    AlertDialog(
        onDismissRequest = { if (!required) dismissed = true },
        title = { Text(if (required) "به‌روزرسانی لازم است" else "نسخه تازه نوبتت") },
        text = { Text(listOfNotNull(if (required) "برای ادامه، نسخه تازه اپ را نصب کنید." else "نسخه ${v.latestVersionName} آماده نصب است.", v.notes).joinToString("\n")) },
        confirmButton = { TextButton(onClick = { open() }) { Text("دریافت نسخه تازه") } },
        dismissButton = if (required) null else ({ TextButton(onClick = { dismissed = true }) { Text("بعداً") } }),
    )
}
