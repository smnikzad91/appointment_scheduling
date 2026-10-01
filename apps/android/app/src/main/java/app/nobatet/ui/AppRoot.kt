package app.nobatet.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.nobatet.data.AppContainer
import app.nobatet.data.Role
import app.nobatet.ui.auth.LoginScreen
import app.nobatet.ui.panels.AdminNotice
import app.nobatet.ui.panels.CustomerPanel
import app.nobatet.ui.panels.SalonPanel
import app.nobatet.ui.panels.StylistPanel
import app.nobatet.ui.theme.LocalAppColors

/** One app for every role: the signed-in account's role picks the panel (as the web's /launch). */
@Composable
fun AppRoot(container: AppContainer) {
    val session: SessionViewModel = viewModel(factory = viewModelFactory { initializer { SessionViewModel(container) } })
    val state by session.state.collectAsStateWithLifecycle()
    val colors = LocalAppColors.current

    Box(Modifier.fillMaxSize().background(colors.bg)) {
        when (val s = state) {
            SessionState.Loading -> CircularProgressIndicator(Modifier.align(Alignment.Center), color = colors.accent)
            SessionState.SignedOut -> LoginScreen(container, onSignedIn = session::signedIn)
            SessionState.Offline -> Column(
                Modifier.align(Alignment.Center).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text("اتصال به نوبتت برقرار نشد", color = colors.ink, textAlign = TextAlign.Center)
                Button(onClick = session::refresh) { Text("تلاش دوباره") }
            }
            is SessionState.SignedIn -> when (s.user.role) {
                Role.CUSTOMER -> CustomerPanel(container, s.user, onSignOut = session::signOut)
                Role.STYLIST -> StylistPanel(s.user, onSignOut = session::signOut)
                Role.SALON_OWNER -> SalonPanel(s.user, independent = false, onSignOut = session::signOut)
                Role.INDEPENDENT_STYLIST -> SalonPanel(s.user, independent = true, onSignOut = session::signOut)
                // The admin panel stays on the website.
                Role.PLATFORM_ADMIN -> AdminNotice(onSignOut = session::signOut)
            }
        }
    }
}
