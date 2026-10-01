package app.nobatet.util

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.google.android.gms.auth.api.phone.SmsRetriever
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Status

/**
 * Fills in the SMS code (the app's version of the web's WebOTP): Android's SMS User Consent asks
 * "allow نوبتت to read this message?" for the next SMS with a code, so the code needs no special
 * format or app hash. Phones without Google Play services just type it.
 */
@Composable
fun SmsCodeListener(active: Boolean, length: Int, onCode: (String) -> Unit) {
    val context = LocalContext.current
    val consent = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val message = result.data?.getStringExtra(SmsRetriever.EXTRA_SMS_MESSAGE).orEmpty().normalizeDigits()
            Regex("(?<!\\d)\\d{$length}(?!\\d)").find(message)?.value?.let(onCode)
        }
    }
    DisposableEffect(active) {
        if (!active) return@DisposableEffect onDispose { }
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                if (intent.action != SmsRetriever.SMS_RETRIEVED_ACTION) return
                val extras = intent.extras ?: return
                @Suppress("DEPRECATION")
                val status = (if (Build.VERSION.SDK_INT >= 33) extras.getParcelable(SmsRetriever.EXTRA_STATUS, Status::class.java) else extras.get(SmsRetriever.EXTRA_STATUS) as? Status) ?: return
                if (status.statusCode != CommonStatusCodes.SUCCESS) return
                @Suppress("DEPRECATION")
                val ask = (if (Build.VERSION.SDK_INT >= 33) extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT, Intent::class.java) else extras.getParcelable(SmsRetriever.EXTRA_CONSENT_INTENT)) ?: return
                runCatching { consent.launch(ask) }
            }
        }
        val started = runCatching {
            SmsRetriever.getClient(context).startSmsUserConsent(null)
            ContextCompat.registerReceiver(context, receiver, IntentFilter(SmsRetriever.SMS_RETRIEVED_ACTION), SmsRetriever.SEND_PERMISSION, null, ContextCompat.RECEIVER_EXPORTED)
        }.isSuccess
        onDispose { if (started) runCatching { context.unregisterReceiver(receiver) } }
    }
}
