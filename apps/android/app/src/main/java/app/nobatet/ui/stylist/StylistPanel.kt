package app.nobatet.ui.stylist

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ContentCut
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import app.nobatet.data.ApiUser
import app.nobatet.data.AppContainer
import app.nobatet.data.SelfStylist
import app.nobatet.data.StaffAppointment
import app.nobatet.data.persianError
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.panels.PanelScaffold
import app.nobatet.ui.panels.PanelTab
import kotlinx.coroutines.launch

/** The stylist panel (/stylist): امروز، نوبت‌ها، ساعات کاری، خدمات، پروفایل — as apps/web panels.tsx. */
@Composable
fun StylistPanel(container: AppContainer, user: ApiUser, onSignOut: () -> Unit) {
    val scope = rememberCoroutineScope()
    var stylist by remember { mutableStateOf<SelfStylist?>(null) }
    var appointments by remember { mutableStateOf<List<StaffAppointment>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var page by remember { mutableStateOf<StylistPage?>(null) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var showNotifications by remember { mutableStateOf(false) }

    fun loadStylist() = scope.launch {
        runCatching { container.api.myStylist() }.onSuccess { stylist = it; error = null }
            .onFailure { if (stylist == null) error = persianError(it, "خطا در دریافت اطلاعات", container.json) }
    }
    fun loadAppointments() = scope.launch {
        runCatching { container.api.myStylistAppointments() }.onSuccess { appointments = it }
    }
    LaunchedEffect(Unit) { loadStylist(); loadAppointments() }
    val actions = rememberStaffActions(container) { loadAppointments() }

    val s = stylist
    if (s == null) {
        error?.let { LoadError(it, { error = null; loadStylist() }) } ?: Loading()
        return
    }
    if (showNotifications) {
        app.nobatet.ui.customer.NotificationsScreen(container, app.nobatet.notify.NotificationScope.STYLIST, onBack = { showNotifications = false }) { t ->
            showNotifications = false
            when (t.target) {
                app.nobatet.notify.NotificationTarget.REVIEWS -> page = StylistPage.REVIEWS
                app.nobatet.notify.NotificationTarget.EARNINGS -> page = StylistPage.EARNINGS
                app.nobatet.notify.NotificationTarget.WALLET -> page = StylistPage.WALLET
                else -> { tab = 1; loadAppointments() }
            }
        }
        return
    }
    page?.let { p ->
        StylistPageScreen(p, container, s, onBack = { page = null })
        return
    }
    val context = androidx.compose.ui.platform.LocalContext.current
    PanelScaffold(
        panelName = "پنل آرایشگر",
        identity = app.nobatet.ui.panels.ShellIdentity(s.displayName, s.avatarUrl),
        accountName = "${user.firstName} ${user.lastName}".trim(),
        accountLinks = listOf(
            app.nobatet.ui.panels.AccountLink("کیف پول", Icons.Outlined.AccountBalanceWallet) { page = StylistPage.WALLET },
            app.nobatet.ui.panels.tutorialsLink(context, "stylist"),
        ),
        onSignOut = onSignOut,
        selectedTab = tab,
        onSelectTab = { tab = it; if (it <= 1) loadAppointments() },
        actions = { app.nobatet.ui.customer.NotificationBell(container) { showNotifications = true } },
        tabs = listOf(
            PanelTab("امروز", Icons.Outlined.Home) { StylistHomeScreen(s, appointments, actions, onGoToTab = { tab = it }) { page = it } },
            PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth, title = "نوبت‌های من") { StylistAppointmentsScreen(s, appointments, actions) },
            PanelTab("ساعات کاری", Icons.Outlined.Schedule, title = "ساعات کاری", subtitle = "مشتری‌ها فقط در همین ساعت‌ها می‌توانند با شما نوبت بگیرند.") { StylistScheduleScreen(container, s) { loadStylist() } },
            PanelTab("خدمات", Icons.Outlined.ContentCut, title = "خدمات من", subtitle = "قیمت، زمان و پیامک یادآوری نوبت بعدیِ هر خدمت را برای خودتان تنظیم کنید؛ خالی یعنی پیش‌فرض سالن.") { StylistServicesScreen(container, s) { loadStylist() } },
            PanelTab("پروفایل", Icons.Outlined.Person, title = "پروفایل") { StylistProfileScreen(container, s, onChanged = { loadStylist() }, onOpenPage = { page = it }) },
        ),
    )
    StaffSheets(actions, s)
}
