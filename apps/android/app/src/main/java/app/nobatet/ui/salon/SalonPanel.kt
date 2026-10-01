package app.nobatet.ui.salon

import app.nobatet.util.toPersianDigits
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ContentCut
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Settings
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
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.panels.PanelScaffold
import app.nobatet.ui.panels.PanelTab
import app.nobatet.ui.stylist.StylistScheduleScreen
import kotlinx.coroutines.launch

/**
 * The salon panel (/salon) — salon owners, and independent stylists (their own one-person business),
 * whose tabs swap «آرایشگرها» for «ساعات کاری» (their own stylist profile's hours), as apps/web panels.tsx.
 */
@Composable
fun SalonPanel(container: AppContainer, user: ApiUser, independent: Boolean, onSignOut: () -> Unit) {
    val scope = rememberCoroutineScope()
    val data = remember { SalonData(container, scope) }
    val sheets = remember { SalonSheetsState() }
    var page by remember { mutableStateOf<SalonPage?>(null) }
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var self by remember { mutableStateOf<SelfStylist?>(null) }
    var showNotifications by remember { mutableStateOf(false) }
    fun loadSelf() = scope.launch { runCatching { container.api.myStylist() }.onSuccess { self = it } }
    LaunchedEffect(Unit) { data.loadAll(); if (independent) loadSelf() }

    val salon = data.salon
    if (salon == null) {
        data.error?.let { LoadError(it, { data.error = null; data.loadSalon() }) } ?: Loading()
        return
    }
    if (showNotifications) {
        app.nobatet.ui.customer.NotificationsScreen(container, app.nobatet.notify.NotificationScope.SALON, onBack = { showNotifications = false }) { t ->
            showNotifications = false
            if (t.target == app.nobatet.notify.NotificationTarget.REVIEWS) page = SalonPage.REVIEWS else { tab = 1; data.loadAppointments() }
        }
        return
    }
    page?.let { p ->
        SalonPageScreen(p, container, data, onBack = { page = null })
        return
    }
    val context = androidx.compose.ui.platform.LocalContext.current
    PanelScaffold(
        panelName = if (independent) "پنل آرایشگر مستقل" else "پنل سالن",
        identity = app.nobatet.ui.panels.ShellIdentity(salon.name, salon.logoUrl, square = true),
        accountName = "${user.firstName} ${user.lastName}".trim(),
        accountLinks = listOf(app.nobatet.ui.panels.tutorialsLink(context, if (independent) "independent" else "owner")),
        onSignOut = onSignOut,
        selectedTab = tab,
        onSelectTab = { tab = it; if (it <= 1) data.loadAppointments() },
        actions = { app.nobatet.ui.customer.NotificationBell(container) { showNotifications = true } },
        tabs = listOf(
            PanelTab("خانه", Icons.Outlined.Home) { SalonHomeScreen(container, data, sheets, onGoToTab = { tab = it }) { page = it } },
            PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth, title = "نوبت‌ها") { SalonAppointmentsScreen(data, sheets) },
            PanelTab("خدمات", Icons.Outlined.ContentCut, title = "خدمات", subtitle = "${data.services.count { it.active }.toString().toPersianDigits()} خدمت فعال") { SalonServicesScreen(container, data) },
            if (independent) PanelTab("ساعات کاری", Icons.Outlined.Schedule, title = "ساعات کاری", subtitle = "مشتری‌ها فقط در همین ساعت‌ها می‌توانند با شما نوبت بگیرند.") {
                self?.let { StylistScheduleScreen(container, it) { loadSelf() } } ?: Loading()
            } else PanelTab("آرایشگرها", Icons.Outlined.Groups, title = "آرایشگرها", subtitle = stylistsSubtitle(data)) { SalonStylistsScreen(container, data) },
            PanelTab(
                "تنظیمات", Icons.Outlined.Settings, title = if (independent) "تنظیمات کسب‌وکار" else "تنظیمات سالن",
                subtitle = if (independent) "این اطلاعات در صفحه رزرو شما به مشتری‌ها نشان داده می‌شود." else "این اطلاعات در صفحه رزرو سالن به مشتری‌ها نشان داده می‌شود.",
            ) { SalonSettingsScreen(container, data) },
        ),
    )
    SalonSheets(container, data, sheets)
}

/** «۲ از ۵ آرایشگر فعال پلن» when the plan caps stylists, else the active count (the web's subtitle). */
private fun stylistsSubtitle(data: SalonData): String {
    val active = data.stylists.count { it.active }.toString().toPersianDigits()
    val limit = data.subscription?.stylists?.limit
    return if (limit != null) "$active از ${limit.toString().toPersianDigits()} آرایشگر فعال پلن" else "$active آرایشگر فعال"
}
