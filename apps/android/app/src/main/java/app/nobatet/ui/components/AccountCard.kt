package app.nobatet.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.NewTicket
import app.nobatet.data.PasswordChange
import app.nobatet.data.persianError
import app.nobatet.ui.theme.LocalAppColors
import kotlinx.coroutines.launch

/** Change the password (apps/web /api/user/password, same token) — for every role. */
@Composable
fun PasswordChangeCard(container: AppContainer, snackbar: SnackbarHostState) {
    val scope = rememberCoroutineScope()
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var repeat by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }
    AppCard {
        SectionTitle("تغییر رمز عبور")
        listOf(
            Triple("رمز عبور فعلی", current) { v: String -> current = v },
            Triple("رمز عبور جدید (حداقل ۸ کاراکتر)", next) { v: String -> next = v },
            Triple("تکرار رمز عبور جدید", repeat) { v: String -> repeat = v },
        ).forEach { (label, value, set) ->
            OutlinedTextField(
                value = value, onValueChange = set, label = { Text(label) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
        }
        PrimaryButton(if (saving) "در حال ذخیره..." else "ذخیره رمز عبور", enabled = !saving) {
            val problem = when {
                current.isEmpty() || next.isEmpty() -> "رمز فعلی و رمز جدید را وارد کنید"
                next.length < 8 -> "رمز عبور باید حداقل ۸ کاراکتر باشد"
                next != repeat -> "تکرار رمز عبور یکسان نیست"
                else -> null
            }
            scope.launch {
                if (problem != null) return@launch snackbar.showSnackbar(problem).let { }
                saving = true
                runCatching { container.web.changePassword(PasswordChange(current, next)) }
                    .onSuccess { current = ""; next = ""; repeat = ""; snackbar.showSnackbar("رمز عبور تغییر کرد") }
                    .onFailure { snackbar.showSnackbar(persianError(it, "تغییر رمز عبور انجام نشد", container.json)) }
                saving = false
            }
        }
    }
}

/**
 * «راهنمای استفاده» (the web's Help Center for this role) and «حذف حساب»: a deletion request sent
 * to support as a ticket (handled by the platform admin).
 */
@Composable
fun AccountLinks(container: AppContainer, helpRole: String, snackbar: SnackbarHostState) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var confirm by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        TextButton(onClick = {
            runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.WEB_BASE_URL + "tutorials?role=$helpRole"))) }
        }) { Text("راهنمای استفاده") }
        TextButton(onClick = { confirm = true }) { Text("درخواست حذف حساب", color = c.danger) }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false },
        title = { Text("حذف حساب") },
        text = { Text("درخواست حذف حساب و اطلاعات شما برای پشتیبانی فرستاده می‌شود و پس از بررسی انجام می‌شود. نوبت‌ها و سوابق مالی سالن طبق قانون نگه داشته می‌شوند.") },
        confirmButton = {
            TextButton(onClick = {
                confirm = false
                scope.launch {
                    runCatching {
                        container.web.createTicket(NewTicket("درخواست حذف حساب", "لطفاً حساب کاربری من و اطلاعات مرتبط با آن را حذف کنید. (ارسال‌شده از اپ اندروید)"))
                    }.onSuccess { snackbar.showSnackbar("درخواست حذف حساب ثبت شد؛ پشتیبانی پیگیری می‌کند") }
                        .onFailure { snackbar.showSnackbar(persianError(it, "ثبت درخواست انجام نشد", container.json)) }
                }
            }) { Text("ارسال درخواست", color = c.danger) }
        },
        dismissButton = { TextButton(onClick = { confirm = false }) { Text("انصراف") } },
    )
}
