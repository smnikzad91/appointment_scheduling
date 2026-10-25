package app.nobatet.ui.panels

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.RateReview
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.FEEDBACK_KIND_LABEL
import app.nobatet.data.FEEDBACK_MESSAGE_MAX
import app.nobatet.data.FEEDBACK_MESSAGE_MIN
import app.nobatet.data.FeedbackRequest
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.Toasts
import kotlinx.coroutines.launch

/** «نظرات و پیشنهادات» in the account sheet; [onClick] opens [FeedbackDialog]. */
fun feedbackLink(onClick: () -> Unit) = AccountLink("نظرات و پیشنهادات", Icons.Outlined.RateReview, onClick)

/**
 * The web's /feedback form for a signed-in account: a kind and the message. The sender is known from
 * the token, so no name or phone; [role] (CUSTOMER | SALON_OWNER | STYLIST) tells the admin who wrote.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FeedbackDialog(container: AppContainer, role: String, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    var kind by rememberSaveable { mutableStateOf<String?>(null) }
    var message by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    AppDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("نظرات و پیشنهادات") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Muted("پیشنهاد، انتقاد یا مشکلی که دیدید را بنویسید؛ مستقیم به تیم نوبتت می‌رسد. برای پیگیری یک درخواست، از «پشتیبانی» تیکت بزنید.")
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    FEEDBACK_KIND_LABEL.forEach { (k, label) -> AppChip(kind == k, { kind = k }, { Text(label) }) }
                }
                AppTextField(message, { message = it.take(FEEDBACK_MESSAGE_MAX) }, label = { Text("متن پیام") }, minLines = 4, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            AppTextButton(enabled = !busy, onClick = {
                val k = kind ?: return@AppTextButton Toasts.error("نوع پیام را انتخاب کنید")
                if (message.trim().length < FEEDBACK_MESSAGE_MIN) return@AppTextButton Toasts.error("متن پیام را بنویسید")
                busy = true
                scope.launch {
                    runCatching { container.web.sendFeedback(FeedbackRequest(k, message.trim(), role)) }
                        .onSuccess { Toasts.success("پیام شما رسید؛ ممنون که وقت گذاشتید"); onDismiss() }
                        .onFailure { Toasts.error(persianError(it, "ارسال پیام انجام نشد", container.json)) }
                    busy = false
                }
            }) { Text(if (busy) "در حال ارسال..." else "ارسال") }
        },
        dismissButton = { AppTextButton(onClick = onDismiss, enabled = !busy) { Text("انصراف") } },
    )
}
