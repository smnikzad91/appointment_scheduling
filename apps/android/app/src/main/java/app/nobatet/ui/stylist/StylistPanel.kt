package app.nobatet.ui.stylist

import androidx.compose.material.icons.Icons
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
    page?.let { p ->
        StylistPageScreen(p, container, s, onBack = { page = null })
        return
    }
    PanelScaffold(
        title = s.displayName,
        onSignOut = onSignOut,
        selectedTab = tab,
        onSelectTab = { tab = it; if (it <= 1) loadAppointments() },
        tabs = listOf(
            PanelTab("امروز", Icons.Outlined.Home) { StylistHomeScreen(s, appointments, actions) { page = it } },
            PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) { StylistAppointmentsScreen(s, appointments, actions) },
            PanelTab("ساعات کاری", Icons.Outlined.Schedule) { StylistScheduleScreen(container, s) { loadStylist() } },
            PanelTab("خدمات", Icons.Outlined.ContentCut) { StylistServicesScreen(container, s) { loadStylist() } },
            PanelTab("پروفایل", Icons.Outlined.Person) { StylistProfileScreen(container, s, onChanged = { loadStylist() }, onOpenPage = { page = it }) },
        ),
    )
    StaffSheets(actions, s)
}
