package app.nobatet.ui.auth

import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import app.nobatet.R
import app.nobatet.ui.theme.NobatetTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.nobatet.data.AppContainer
import app.nobatet.data.AuthResponse
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.toPersianDigits

@Composable
fun LoginScreen(container: AppContainer, onSignedIn: (AuthResponse) -> Unit) {
    val vm: LoginViewModel = viewModel(factory = viewModelFactory { initializer { LoginViewModel(container, onSignedIn) } })
    val state by vm.state.collectAsStateWithLifecycle()
    LaunchedEffect(vm) { vm.errors.collect { Toasts.error(it) } }

    // the web's sign-in pages: always dark, coral accent, soft glows behind a frosted card
    NobatetTheme(guest = true) {
        val c = LocalAppColors.current
        Box(Modifier.fillMaxSize().background(c.bg).drawBehind { glows() }.safeDrawingPadding()) {
            Column(
                Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(painterResource(R.drawable.logo_symbol), contentDescription = null, modifier = Modifier.size(40.dp))
                    Text("نوبتت", color = c.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 10.dp))
                }
                when {
                    state.signUpSalon -> {
                        AuthCard("ثبت‌نام سالن یا آرایشگر مستقل", "ثبت رایگان؛ پس از تایید پشتیبانی، صفحه رزرو شما آماده است.") {
                            SignUpSalonForm(container, onSignedIn = vm::signedIn, onError = vm::showError)
                        }
                        FooterLink("حساب دارید؟", "وارد شوید") { vm.setSignUpSalon(false) }
                    }
                    state.signUp -> {
                        AuthCard("ساخت حساب", "برای رزرو آنلاین و پیگیری نوبت‌ها حساب بسازید.") { SignUpForm(container, state, vm) }
                        FooterLink("حساب دارید؟", "وارد شوید") { vm.setSignUp(false) }
                    }
                    else -> {
                        AuthCard("ورود به نوبتت", "با شماره موبایل و رمز عبور، یا با کد پیامکی وارد شوید.") {
                            Segmented(
                                listOf("ورود با رمز عبور", "ورود با کد پیامکی"), state.tab.ordinal,
                            ) { vm.setTab(if (it == 0) LoginTab.PASSWORD else LoginTab.OTP) }
                            Spacer(Modifier.height(20.dp))
                            when (state.tab) {
                                LoginTab.PASSWORD -> PasswordForm(state, vm)
                                LoginTab.OTP -> OtpForm(state, vm)
                            }
                        }
                        FooterLink("حساب ندارید؟", "ساخت حساب") { vm.setSignUp(true) }
                        FooterLink("صاحب سالن یا آرایشگر مستقل هستید؟", "ثبت‌نام کنید") { vm.setSignUpSalon(true) }
                    }
                }
            }
        }
    }
}

/** The web's GuestBackdrop orbs: coral top-right, rose on the left, violet at the bottom. */
private fun DrawScope.glows() {
    fun orb(color: Color, center: Offset, radius: Float) =
        drawCircle(Brush.radialGradient(listOf(color, Color.Transparent), center, radius), radius, center)
    orb(Color(0x4DF2876A), Offset(size.width * 1.0f, size.height * 0.02f), size.width * 0.9f)
    orb(Color(0x38E0507A), Offset(0f, size.height * 0.45f), size.width * 0.75f)
    orb(Color(0x387E58D2), Offset(size.width * 0.7f, size.height * 1.02f), size.width * 0.7f)
}

/** The web's AuthCard: a frosted panel with a large title and a subtitle. */
@Composable
private fun AuthCard(title: String, subtitle: String, content: @Composable () -> Unit) {
    val c = LocalAppColors.current
    val shape = RoundedCornerShape(28.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(c.card.copy(alpha = 0.85f)).border(1.dp, c.line, shape).padding(24.dp)) {
        Text(title, color = c.ink, fontSize = 26.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold)
        Text(subtitle, color = c.muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 8.dp, bottom = 24.dp))
        content()
    }
}

/** The web's two-way switch on the sign-in card: the active half filled with the accent. */
@Composable
private fun Segmented(options: List<String>, selected: Int, onSelect: (Int) -> Unit) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, c.line, RoundedCornerShape(16.dp)).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEachIndexed { i, label ->
            val active = i == selected
            Box(
                Modifier.weight(1f).clip(RoundedCornerShape(12.dp)).background(if (active) c.accent else Color.Transparent)
                    .clickable { onSelect(i) }.padding(vertical = 10.dp),
                contentAlignment = Alignment.Center,
            ) { Text(label, color = if (active) Color.White else c.muted, fontSize = 14.sp, fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun FooterLink(text: String, link: String, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        Text(text, color = c.muted, style = MaterialTheme.typography.bodyMedium)
        AppTextButton(onClick = onClick) { Text(link, color = c.accent, fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun PasswordForm(state: LoginUiState, vm: LoginViewModel) {
    var visible by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        AppTextField(
            value = state.identifier, onValueChange = vm::setIdentifier, singleLine = true, modifier = Modifier.fillMaxWidth(),
            label = { Text("شماره موبایل یا ایمیل") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        AppTextField(
            value = state.password, onValueChange = vm::setPassword, singleLine = true, modifier = Modifier.fillMaxWidth(),
            label = { Text("رمز عبور") },
            visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            trailingIcon = {
                IconButton(onClick = { visible = !visible }) {
                    Icon(if (visible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, contentDescription = if (visible) "پنهان کردن رمز" else "نمایش رمز")
                }
            },
        )
        PrimaryButton(if (state.busy) "در حال ورود..." else "ورود", enabled = !state.busy, onClick = vm::signInWithPassword)
        // no reset-by-email: an SMS code signs anyone in, then the password can be changed in the app
        AppTextButton(onClick = { vm.setTab(LoginTab.OTP) }) { Text("رمز را فراموش کرده‌اید؟ با کد پیامکی وارد شوید") }
    }
}

@Composable
private fun OtpForm(state: LoginUiState, vm: LoginViewModel) {
    // the code from the SMS, with the user's OK (SMS User Consent)
    app.nobatet.util.SmsCodeListener(active = state.codeSent, length = OTP_LENGTH) { vm.setCode(it) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!state.codeSent) {
            AppTextField(
                value = state.phone, onValueChange = vm::setPhone, singleLine = true, modifier = Modifier.fillMaxWidth(),
                label = { Text("شماره موبایل") }, placeholder = { Text("۰۹۱۲۳۴۵۶۷۸۹") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            )
            PrimaryButton(if (state.busy) "در حال ارسال کد..." else "ارسال کد تایید", enabled = !state.busy, onClick = vm::sendCode)
        } else {
            Text("کد ${OTP_LENGTH.toString().toPersianDigits()} رقمی ارسال‌شده به ${state.phone.toPersianDigits()} را وارد کنید", color = LocalAppColors.current.muted)
            AppTextField(
                value = state.code, onValueChange = vm::setCode, singleLine = true, modifier = Modifier.fillMaxWidth(),
                label = { Text("کد تایید") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            )
            PrimaryButton(if (state.busy) "در حال بررسی..." else "تایید", enabled = !state.busy && state.code.length == OTP_LENGTH, onClick = vm::verifyCode)
            AppTextButton(onClick = vm::sendCode, enabled = state.resendIn == 0 && !state.busy) {
                Text(if (state.resendIn > 0) "ارسال دوباره کد تا ${state.resendIn.toString().toPersianDigits()} ثانیه دیگر" else "ارسال دوباره کد")
            }
            AppTextButton(onClick = vm::changePhone) { Text("تغییر شماره موبایل") }
        }
    }
}

@Composable
private fun SignUpForm(container: AppContainer, state: LoginUiState, vm: LoginViewModel) {
    if (state.signUpCodeSent) return PhoneCodeStep(
        container, state.phone, state.signUpDevCode, "تایید و ساخت حساب",
        onSubmit = vm::createAccount, onResend = vm::resendRegisterCode, onBack = vm::backFromCode, onError = vm::showError,
    )
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            AppTextField(state.firstName, vm::setFirstName, label = { Text("نام") }, singleLine = true, modifier = Modifier.weight(1f))
            AppTextField(state.lastName, vm::setLastName, label = { Text("نام خانوادگی") }, singleLine = true, modifier = Modifier.weight(1f))
        }
        AppTextField(
            state.phone, vm::setPhone, label = { Text("شماره موبایل") }, placeholder = { Text("۰۹۱۲۳۴۵۶۷۸۹") }, singleLine = true,
            modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        )
        AppTextField(
            state.password, vm::setPassword, label = { Text("رمز عبور (حداقل ۸ کاراکتر)") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        )
        PrimaryButton(if (state.busy) "در حال ارسال کد..." else "ساخت حساب", enabled = !state.busy, onClick = vm::register)
    }
}

/** The web's GradientButton: amber → coral → rose, dark text. */
@Composable
private fun PrimaryButton(text: String, enabled: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(15.dp)
    Spacer(Modifier.height(4.dp))
    Box(
        Modifier.fillMaxWidth().height(56.dp).alpha(if (enabled) 1f else 0.55f).clip(shape)
            .background(Brush.linearGradient(listOf(Color(0xFFF6B46B), Color(0xFFF2876A), Color(0xFFE0507A))))
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Text(text, color = Color(0xFF1A0F14), fontSize = 15.sp, fontWeight = FontWeight.Bold) }
}
