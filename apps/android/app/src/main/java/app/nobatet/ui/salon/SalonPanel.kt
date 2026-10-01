package app.nobatet.ui.salon

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
    fun loadSelf() = scope.launch { runCatching { container.api.myStylist() }.onSuccess { self = it } }
    LaunchedEffect(Unit) { data.loadAll(); if (independent) loadSelf() }

    val salon = data.salon
    if (salon == null) {
        data.error?.let { LoadError(it, { data.error = null; data.loadSalon() }) } ?: Loading()
        return
    }
    page?.let { p ->
        SalonPageScreen(p, container, data, onBack = { page = null })
        return
    }
    PanelScaffold(
        title = salon.name,
        onSignOut = onSignOut,
        selectedTab = tab,
        onSelectTab = { tab = it; if (it <= 1) data.loadAppointments() },
        tabs = listOf(
            PanelTab("خانه", Icons.Outlined.Home) { SalonHomeScreen(data, sheets) { page = it } },
            PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) { SalonAppointmentsScreen(data, sheets) },
            PanelTab("خدمات", Icons.Outlined.ContentCut) { SalonServicesScreen(container, data) },
            if (independent) PanelTab("ساعات کاری", Icons.Outlined.Schedule) {
                self?.let { StylistScheduleScreen(container, it) { loadSelf() } } ?: Loading()
            } else PanelTab("آرایشگرها", Icons.Outlined.Groups) { SalonStylistsScreen(container, data) },
            PanelTab("تنظیمات", Icons.Outlined.Settings) { SalonSettingsScreen(container, data) },
        ),
    )
    SalonSheets(container, data, sheets)
}
