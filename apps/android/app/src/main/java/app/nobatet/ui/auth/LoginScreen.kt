package app.nobatet.ui.auth

import androidx.compose.foundation.background
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
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
    val colors = LocalAppColors.current
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(vm) { vm.errors.collect { snackbar.showSnackbar(it) } }

    Box(Modifier.fillMaxSize().background(colors.bg).safeDrawingPadding()) {
        Column(
            Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (state.signUp) {
                Text("ساخت حساب", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium, color = colors.ink)
                Text("برای رزرو آنلاین و پیگیری نوبت‌ها حساب بسازید.", color = colors.muted)
                SignUpForm(state, vm)
                TextButton(onClick = { vm.setSignUp(false) }) { Text("حساب دارید؟ وارد شوید") }
            } else {
                Text("ورود به نوبتت", style = androidx.compose.material3.MaterialTheme.typography.headlineMedium, color = colors.ink)
                Text("با شماره موبایل و رمز عبور، یا با کد پیامکی وارد شوید.", color = colors.muted)

                TabRow(selectedTabIndex = state.tab.ordinal, containerColor = colors.card, contentColor = colors.accent) {
                    Tab(selected = state.tab == LoginTab.PASSWORD, onClick = { vm.setTab(LoginTab.PASSWORD) }, text = { Text("ورود با رمز عبور") })
                    Tab(selected = state.tab == LoginTab.OTP, onClick = { vm.setTab(LoginTab.OTP) }, text = { Text("ورود با کد پیامکی") })
                }

                when (state.tab) {
                    LoginTab.PASSWORD -> PasswordForm(state, vm)
                    LoginTab.OTP -> OtpForm(state, vm)
                }
                TextButton(onClick = { vm.setSignUp(true) }) { Text("حساب ندارید؟ ساخت حساب") }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }
}

@Composable
private fun PasswordForm(state: LoginUiState, vm: LoginViewModel) {
    var visible by rememberSaveable { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = state.identifier, onValueChange = vm::setIdentifier, singleLine = true, modifier = Modifier.fillMaxWidth(),
            label = { Text("شماره موبایل یا ایمیل") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
        )
        OutlinedTextField(
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
    }
}

@Composable
private fun OtpForm(state: LoginUiState, vm: LoginViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (!state.codeSent) {
            OutlinedTextField(
                value = state.phone, onValueChange = vm::setPhone, singleLine = true, modifier = Modifier.fillMaxWidth(),
                label = { Text("شماره موبایل") }, placeholder = { Text("۰۹۱۲۳۴۵۶۷۸۹") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            )
            PrimaryButton(if (state.busy) "در حال ارسال کد..." else "ارسال کد تایید", enabled = !state.busy, onClick = vm::sendCode)
        } else {
            Text("کد ${OTP_LENGTH.toString().toPersianDigits()} رقمی ارسال‌شده به ${state.phone.toPersianDigits()} را وارد کنید", color = LocalAppColors.current.muted)
            OutlinedTextField(
                value = state.code, onValueChange = vm::setCode, singleLine = true, modifier = Modifier.fillMaxWidth(),
                label = { Text("کد تایید") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            )
            PrimaryButton(if (state.busy) "در حال بررسی..." else "تایید", enabled = !state.busy && state.code.length == OTP_LENGTH, onClick = vm::verifyCode)
            TextButton(onClick = vm::sendCode, enabled = state.resendIn == 0 && !state.busy) {
                Text(if (state.resendIn > 0) "ارسال دوباره کد تا ${state.resendIn.toString().toPersianDigits()} ثانیه دیگر" else "ارسال دوباره کد")
            }
            TextButton(onClick = vm::changePhone) { Text("تغییر شماره موبایل") }
        }
    }
}

@Composable
private fun SignUpForm(state: LoginUiState, vm: LoginViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            OutlinedTextField(state.firstName, vm::setFirstName, label = { Text("نام") }, singleLine = true, modifier = Modifier.weight(1f))
            OutlinedTextField(state.lastName, vm::setLastName, label = { Text("نام خانوادگی") }, singleLine = true, modifier = Modifier.weight(1f))
        }
        OutlinedTextField(
            state.phone, vm::setPhone, label = { Text("شماره موبایل") }, placeholder = { Text("۰۹۱۲۳۴۵۶۷۸۹") }, singleLine = true,
            modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
        )
        OutlinedTextField(
            state.password, vm::setPassword, label = { Text("رمز عبور (حداقل ۸ کاراکتر)") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        )
        PrimaryButton(if (state.busy) "در حال ساخت حساب..." else "ساخت حساب", enabled = !state.busy, onClick = vm::register)
    }
}

@Composable
private fun PrimaryButton(text: String, enabled: Boolean, onClick: () -> Unit) {
    val colors = LocalAppColors.current
    Spacer(Modifier.height(4.dp))
    Button(
        onClick = onClick, enabled = enabled, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(999.dp),
        colors = ButtonDefaults.buttonColors(containerColor = colors.accent, contentColor = colors.accentInk),
    ) { Text(text) }
}
