package app.nobatet.ui.customer

import app.nobatet.ui.components.AppSwitch
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import app.nobatet.data.ApiUser
import app.nobatet.data.AppContainer
import app.nobatet.data.PasswordChange
import app.nobatet.data.Profile
import app.nobatet.data.SmsPreferences
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.compressForUpload
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

/** «پروفایل»: photo, account, password, promo SMS, support — the web's /dashboard/profile + /account. */
@Composable
fun ProfileScreen(container: AppContainer, user: ApiUser, onOpenSupport: () -> Unit, onSignOut: () -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var profile by remember { mutableStateOf<Profile?>(null) }
    var avatar by remember { mutableStateOf(user.avatarUrl) }
    var uploading by remember { mutableStateOf(false) }
    var promoOn by remember { mutableStateOf<Boolean?>(null) }
    var current by remember { mutableStateOf("") }
    var next by remember { mutableStateOf("") }
    var repeat by remember { mutableStateOf("") }
    var savingPassword by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        launch { profile = runCatching { container.web.profile() }.getOrNull() }
        launch { promoOn = runCatching { !container.web.smsPreferences().promoSmsOptOut }.getOrNull() }
    }

    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            uploading = true
            try {
                val bytes = withContext(Dispatchers.IO) { compressForUpload(context, uri, maxEdge = 1024, maxBytes = 1_800_000) }
                val part = MultipartBody.Part.createFormData("avatar", "avatar.jpg", bytes.toRequestBody("image/jpeg".toMediaType()))
                avatar = container.web.uploadAvatar(part).avatar
                Toasts.success("عکس پروفایل به‌روز شد")
            } catch (e: Exception) {
                Toasts.error(persianError(e, "آپلود عکس انجام نشد", container.json))
            } finally {
                uploading = false
            }
        }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
                RemoteImage(avatar, Modifier.size(96.dp).clip(CircleShape).clickable(enabled = !uploading) {
                    pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                })
                AppTextButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !uploading) {
                    Text(if (uploading) "در حال آپلود..." else "تغییر عکس")
                }
                Text("${user.firstName} ${user.lastName}", style = MaterialTheme.typography.titleLarge, color = c.ink)
                (profile?.phone ?: user.phone)?.takeIf { it.isNotBlank() }?.let { Muted(it.toPersianDigits()) }
                (profile?.email ?: user.email)?.let { Muted(it) }
            }

            AppCard {
                SectionTitle("پیامک‌ها")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("یادآوری «وقت نوبت بعدی»", color = c.ink)
                        Muted("کد ورود، یادآوری نوبت‌ها و تغییرات رزرو همیشه ارسال می‌شوند.")
                    }
                    AppSwitch(
                        checked = promoOn ?: true, enabled = promoOn != null,
                        onCheckedChange = { on ->
                            promoOn = on
                            scope.launch {
                                runCatching { container.web.setSmsPreferences(SmsPreferences(promoSmsOptOut = !on)) }
                                    .onFailure { promoOn = !on; Toasts.error("ذخیره تنظیم پیامک انجام نشد") }
                            }
                        },
                    )
                }
            }

            AppCard {
                SectionTitle("تغییر رمز عبور")
                listOf(
                    Triple("رمز عبور فعلی", current) { v: String -> current = v },
                    Triple("رمز عبور جدید (حداقل ۸ کاراکتر)", next) { v: String -> next = v },
                    Triple("تکرار رمز عبور جدید", repeat) { v: String -> repeat = v },
                ).forEach { (label, value, set) ->
                    AppTextField(
                        value = value, onValueChange = set, label = { Text(label) }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                        visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    )
                }
                PrimaryButton(if (savingPassword) "در حال ذخیره..." else "ذخیره رمز عبور", enabled = !savingPassword) {
                    when {
                        current.isEmpty() || next.isEmpty() -> scope.launch { Toasts.error("رمز فعلی و رمز جدید را وارد کنید") }
                        next.length < 8 -> scope.launch { Toasts.error("رمز عبور باید حداقل ۸ کاراکتر باشد") }
                        next != repeat -> scope.launch { Toasts.error("تکرار رمز عبور یکسان نیست") }
                        else -> scope.launch {
                            savingPassword = true
                            try {
                                container.web.changePassword(PasswordChange(current, next))
                                current = ""; next = ""; repeat = ""
                                Toasts.success("رمز عبور تغییر کرد")
                            } catch (e: Exception) {
                                Toasts.error(persianError(e, "تغییر رمز عبور انجام نشد", container.json))
                            } finally {
                                savingPassword = false
                            }
                        }
                    }
                }
            }

            AppCard(Modifier.clickable(onClick = onOpenSupport)) {
                SectionTitle("پشتیبانی")
                Muted("سوال یا مشکلی دارید؟ تیکت بفرستید.")
            }
            app.nobatet.ui.components.AccountLinks(container, "customer")
            AppTextButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) { Text("خروج از حساب", color = c.danger) }
        }
    }
}
