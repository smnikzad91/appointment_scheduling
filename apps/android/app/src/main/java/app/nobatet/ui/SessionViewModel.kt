package app.nobatet.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.nobatet.data.ApiUser
import app.nobatet.data.AppContainer
import app.nobatet.data.AuthResponse
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException

sealed interface SessionState {
    data object Loading : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val user: ApiUser) : SessionState
    /** Signed in, but apps/api couldn't be reached to confirm who — offer to try again. */
    data object Offline : SessionState
}

/**
 * Who is using the app. At start the saved token is checked with GET /auth/me (current role
 * included, like the web's /launch); a 401 means the token expired or the account is gone.
 */
class SessionViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = SessionState.Loading
            if (container.tokens.current() == null) {
                _state.value = SessionState.SignedOut
                return@launch
            }
            _state.value = try {
                SessionState.SignedIn(container.api.me())
            } catch (e: HttpException) {
                if (e.code() == 401) {
                    container.tokens.clear()
                    SessionState.SignedOut
                } else {
                    SessionState.Offline
                }
            } catch (e: Exception) {
                SessionState.Offline
            }
        }
    }

    fun signedIn(auth: AuthResponse) {
        viewModelScope.launch {
            container.tokens.save(auth.accessToken)
            _state.value = SessionState.SignedIn(auth.user)
        }
    }

    fun signOut() {
        viewModelScope.launch {
            container.tokens.clear()
            _state.value = SessionState.SignedOut
        }
    }
}
