package app.nobatet.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import app.nobatet.ui.theme.LocalAppColors

/** One app for every role: the signed-in account's role picks the panel (as the web's /launch). */
@Composable
fun AppRoot(container: AppContainer) {
    val session: SessionViewModel = viewModel(factory = viewModelFactory { initializer { SessionViewModel(container) } })
    val state by session.state.collectAsStateWithLifecycle()
    val colors = LocalAppColors.current
    val askNotifications = androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()) { }
    val signedIn = state is SessionState.SignedIn
    val context = androidx.compose.ui.platform.LocalContext.current
    androidx.compose.runtime.LaunchedEffect(signedIn) {
        if (signedIn && android.os.Build.VERSION.SDK_INT >= 33 &&
            androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) askNotifications.launch(android.Manifest.permission.POST_NOTIFICATIONS)
    }

    // website links book a salon: only the customer panel opens them
    val link by container.links.link.collectAsStateWithLifecycle()
    LaunchedEffect(link, state) {
        val s = state
        if (link != null && s is SessionState.SignedIn && s.user.role != Role.CUSTOMER) {
            container.links.link.value = null
            app.nobatet.ui.components.Toasts.info("برای رزرو نوبت از این لینک، با حساب مشتری وارد شوید")
        }
    }
    UpdateCheck(container)
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
                app.nobatet.ui.components.PrimaryButton("تلاش دوباره", onClick = session::refresh)
            }
            is SessionState.SignedIn -> when (s.user.role) {
                Role.CUSTOMER -> CustomerPanel(container, s.user, onSignOut = session::signOut)
                Role.STYLIST -> app.nobatet.ui.stylist.StylistPanel(container, s.user, onSignOut = session::signOut)
                Role.SALON_OWNER -> app.nobatet.ui.salon.SalonPanel(container, s.user, independent = false, onSignOut = session::signOut)
                Role.INDEPENDENT_STYLIST -> app.nobatet.ui.salon.SalonPanel(container, s.user, independent = true, onSignOut = session::signOut)
                // The admin panel stays on the website.
                Role.PLATFORM_ADMIN -> AdminNotice(onSignOut = session::signOut)
            }
        }
    }
}
