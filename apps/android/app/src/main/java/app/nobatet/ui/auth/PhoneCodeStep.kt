package app.nobatet.ui.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.normalizeDigits
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * A new account's phone confirmed by SMS (apps/web components/guest/PhoneCodeStep.tsx): shown in
 * place of the sign-up form once `auth/otp/request {purpose: "register"}` sent the code; [onSubmit]
 * creates the account with it. While the API hands the code back ([devCode]), it fills itself in.
 */
@Composable
fun PhoneCodeStep(
    container: AppContainer,
    phone: String,
    devCode: String?,
    submitLabel: String,
    onSubmit: suspend (code: String) -> Unit,
    /** asks for a new code; returns its devCode, if any */
    onResend: suspend () -> String?,
    onBack: () -> Unit,
    onError: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var resendIn by remember { mutableIntStateOf(60) }
    var sentAt by remember { mutableIntStateOf(0) }
    LaunchedEffect(sentAt) {
        for (left in 60 downTo 0) { resendIn = left; if (left > 0) delay(1_000) }
    }

    fun submit() {
        if (busy || code.length != OTP_LENGTH) return
        busy = true
        scope.launch {
            runCatching { onSubmit(code) }.onFailure { onError(persianError(it, "ثبت‌نام انجام نشد؛ دوباره تلاش کنید", container.json)) }
            busy = false
        }
    }
    fun setCode(v: String) {
        code = v.normalizeDigits().filter(Char::isDigit).take(OTP_LENGTH)
        if (code.length == OTP_LENGTH) submit()
    }
    LaunchedEffect(devCode) { devCode?.let(::setCode) }
    // the code from the SMS, with the user's OK (SMS User Consent)
    app.nobatet.util.SmsCodeListener(active = true, length = OTP_LENGTH) { setCode(it) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("کد ${OTP_LENGTH.toString().toPersianDigits()} رقمی ارسال‌شده به ${phone.toPersianDigits()} را وارد کنید", color = LocalAppColors.current.muted)
        AppTextField(
            value = code, onValueChange = ::setCode, singleLine = true, modifier = Modifier.fillMaxWidth(),
            label = { Text("کد تایید") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
        )
        PrimaryButton(if (busy) "در حال ثبت‌نام..." else submitLabel, Modifier.fillMaxWidth(), enabled = !busy && code.length == OTP_LENGTH) { submit() }
        AppTextButton(onClick = {
            scope.launch {
                runCatching { onResend() }
                    .onSuccess { d -> code = ""; sentAt++; d?.let(::setCode) }
                    .onFailure { onError(persianError(it, "ارسال کد تایید ممکن نشد، دوباره تلاش کنید", container.json)) }
            }
        }, enabled = resendIn == 0 && !busy) {
            Text(if (resendIn > 0) "ارسال دوباره کد تا ${resendIn.toString().toPersianDigits()} ثانیه دیگر" else "ارسال دوباره کد")
        }
        AppTextButton(onClick = onBack, enabled = !busy) { Text("تغییر اطلاعات") }
    }
}
