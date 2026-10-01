package app.nobatet.ui.panels

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ContentCut
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.BuildConfig
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import app.nobatet.data.ApiUser
import app.nobatet.data.AppContainer
import androidx.compose.runtime.remember
import app.nobatet.ui.customer.BookingPrefill
import app.nobatet.ui.customer.HomeScreen
import app.nobatet.ui.customer.NotificationBell
import app.nobatet.ui.customer.NotificationsScreen
import app.nobatet.ui.customer.ProfileScreen
import app.nobatet.ui.customer.SupportScreen
import app.nobatet.ui.customer.BookingsScreen
import app.nobatet.ui.customer.DiscoverScreen
import app.nobatet.ui.customer.SalonScreen
import app.nobatet.ui.theme.LocalAppColors

// The tabs and their labels mirror apps/web components/app/panels.tsx exactly.

private const val TAB_BOOKINGS = 2

private const val TAB_DISCOVER = 1

/** What's shown over the customer panel: a salon page (maybe with a prefilled booking), notifications, support. */
private sealed interface CustomerOverlay {
    data class Salon(val slug: String, val prefill: BookingPrefill? = null) : CustomerOverlay
    data object Notifications : CustomerOverlay
    data object Support : CustomerOverlay
}

@Composable
fun CustomerPanel(container: AppContainer, user: ApiUser, onSignOut: () -> Unit) {
    var tab by rememberSaveable { mutableIntStateOf(0) }
    var overlay by remember { mutableStateOf<CustomerOverlay?>(null) }
    val openSalon: (String) -> Unit = { overlay = CustomerOverlay.Salon(it) }
    when (val o = overlay) {
        is CustomerOverlay.Salon -> {
            SalonScreen(container, o.slug, onBack = { overlay = null }, onSeeBookings = { overlay = null; tab = TAB_BOOKINGS }, prefill = o.prefill)
            return
        }
        CustomerOverlay.Notifications -> {
            NotificationsScreen(container, onBack = { overlay = null }, onOpenSalon = openSalon, onOpenBookings = { overlay = null; tab = TAB_BOOKINGS })
            return
        }
        CustomerOverlay.Support -> {
            SupportScreen(container, onBack = { overlay = null })
            return
        }
        null -> Unit
    }
    PanelScaffold(
        title = "نوبتت",
        onSignOut = onSignOut,
        selectedTab = tab,
        onSelectTab = { tab = it },
        actions = { NotificationBell(container) { overlay = CustomerOverlay.Notifications } },
        tabs = listOf(
            PanelTab("خانه", Icons.Outlined.Home) {
                HomeScreen(container, user.firstName, onDiscover = { tab = TAB_DISCOVER }, onOpenSalon = openSalon, onBookings = { tab = TAB_BOOKINGS })
            },
            PanelTab("کشف سالن", Icons.Outlined.Search) { DiscoverScreen(container, onOpenSalon = openSalon) },
            PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) {
                BookingsScreen(container, onOpenSalon = openSalon, onRebook = { slug, prefill -> overlay = CustomerOverlay.Salon(slug, prefill) })
            },
            PanelTab("کیف پول", Icons.Outlined.AccountBalanceWallet) { ComingSoon("کیف پول") },
            PanelTab("پروفایل", Icons.Outlined.Person) {
                ProfileScreen(container, user, onOpenSupport = { overlay = CustomerOverlay.Support }, onSignOut = onSignOut)
            },
        ),
    )
}

/** The admin panel is web-only. */
@Composable
fun AdminNotice(onSignOut: () -> Unit) {
    val colors = LocalAppColors.current
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text("پنل مدیریت فقط در وب‌سایت", style = MaterialTheme.typography.titleLarge, color = colors.ink)
        Text("برای مدیریت سالن‌ها، کاربران و محتوا از نسخه وب استفاده کنید.", color = colors.muted, textAlign = TextAlign.Center)
        Button(onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(BuildConfig.WEB_BASE_URL + "admin"))) }) { Text("باز کردن وب‌سایت") }
        TextButton(onClick = onSignOut) { Text("خروج") }
    }
}
