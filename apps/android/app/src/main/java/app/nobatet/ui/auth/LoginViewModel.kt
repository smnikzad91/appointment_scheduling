package app.nobatet.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.nobatet.data.AppContainer
import app.nobatet.data.AuthResponse
import app.nobatet.data.LoginRequest
import app.nobatet.data.OtpRequest
import app.nobatet.data.OtpVerifyRequest
import app.nobatet.data.persianError
import app.nobatet.util.isValidIranianMobile
import app.nobatet.util.normalizeDigits
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class LoginTab { PASSWORD, OTP }

data class LoginUiState(
    val tab: LoginTab = LoginTab.PASSWORD,
    val identifier: String = "",
    val password: String = "",
    val phone: String = "",
    val code: String = "",
    val codeSent: Boolean = false,
    /** Seconds until another code may be requested (apps/api: one per phone per minute). */
    val resendIn: Int = 0,
    val busy: Boolean = false,
    /** «ساخت حساب»: a new customer account (POST /auth/register). */
    val signUp: Boolean = false,
    /** «ثبت‌نام سالن / آرایشگر مستقل». */
    val signUpSalon: Boolean = false,
    val firstName: String = "",
    val lastName: String = "",
)

const val OTP_LENGTH = 5

/** Sign-in, as on the web's /signin: password (default tab) or SMS code. Sign-in never creates accounts. */
class LoginViewModel(private val container: AppContainer, private val onSignedIn: (AuthResponse) -> Unit) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state

    /** One-off error messages, shown as error toasts (the web's toastError). */
    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors: SharedFlow<String> = _errors

    private var countdown: Job? = null

    fun setTab(tab: LoginTab) = _state.update { it.copy(tab = tab) }
    fun setIdentifier(v: String) = _state.update { it.copy(identifier = v) }
    fun setPassword(v: String) = _state.update { it.copy(password = v) }
    fun setPhone(v: String) = _state.update { it.copy(phone = v.normalizeDigits().filter(Char::isDigit).take(11)) }
    fun setCode(v: String) {
        val code = v.normalizeDigits().filter(Char::isDigit).take(OTP_LENGTH)
        _state.update { it.copy(code = code) }
        if (code.length == OTP_LENGTH) verifyCode()
    }

    fun signInWithPassword() {
        val s = _state.value
        val identifier = s.identifier.trim().normalizeDigits()
        if (identifier.isEmpty() || s.password.isEmpty()) return fail("شماره موبایل یا ایمیل و رمز عبور را وارد کنید")
        run("ورود انجام نشد؛ دوباره تلاش کنید") { onSignedIn(container.api.login(LoginRequest(identifier, s.password))) }
    }

    fun sendCode() {
        val phone = _state.value.phone
        if (!isValidIranianMobile(phone)) return fail("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد")
        var devCode: String? = null
        // While the API hands the code back (no real SMS delivery), verify by itself — as the web does.
        run("ارسال کد تایید ممکن نشد، دوباره تلاش کنید", onSuccess = { devCode?.let(::setCode) }) {
            devCode = container.api.requestOtp(OtpRequest(phone)).devCode
            _state.update { it.copy(codeSent = true, code = "") }
            startCountdown()
        }
    }

    fun verifyCode() {
        val s = _state.value
        if (s.code.length != OTP_LENGTH || s.busy) return
        run("کد وارد شده صحیح نیست یا منقضی شده است") { onSignedIn(container.api.verifyOtp(OtpVerifyRequest(s.phone, s.code))) }
    }

    fun changePhone() = _state.update { it.copy(codeSent = false, code = "") }

    fun setSignUp(on: Boolean) = _state.update { it.copy(signUp = on, signUpSalon = false) }
    fun setSignUpSalon(on: Boolean) = _state.update { it.copy(signUpSalon = on, signUp = false) }
    fun showError(message: String) { _errors.tryEmit(message) }
    fun signedIn(auth: AuthResponse) = onSignedIn(auth)
    fun setFirstName(v: String) = _state.update { it.copy(firstName = v) }
    fun setLastName(v: String) = _state.update { it.copy(lastName = v) }

    /** A customer account, as the web's /signup (name, mobile, password ≥ 8); signed in straight away. */
    fun register() {
        val s = _state.value
        when {
            s.firstName.isBlank() || s.lastName.isBlank() -> return fail("نام و نام خانوادگی را وارد کنید")
            !isValidIranianMobile(s.phone) -> return fail("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد")
            s.password.length < 8 -> return fail("رمز عبور باید حداقل ۸ کاراکتر باشد")
        }
        run("ساخت حساب انجام نشد؛ دوباره تلاش کنید") {
            onSignedIn(container.api.register(app.nobatet.data.RegisterRequest(s.firstName.trim(), s.lastName.trim(), s.phone, s.password)))
        }
    }

    private fun startCountdown() {
        countdown?.cancel()
        countdown = viewModelScope.launch {
            for (left in 60 downTo 0) {
                _state.update { it.copy(resendIn = left) }
                if (left > 0) delay(1_000)
            }
        }
    }

    private fun fail(message: String) {
        _errors.tryEmit(message)
    }

    /** Runs one request at a time; `onSuccess` runs after it, once the form is no longer busy. */
    private fun run(fallback: String, onSuccess: () -> Unit = {}, block: suspend () -> Unit) {
        if (_state.value.busy) return
        viewModelScope.launch {
            _state.update { it.copy(busy = true) }
            val ok = try {
                block()
                true
            } catch (e: Exception) {
                fail(persianError(e, fallback, container.json))
                false
            } finally {
                _state.update { it.copy(busy = false) }
            }
            if (ok) onSuccess()
        }
    }
}
