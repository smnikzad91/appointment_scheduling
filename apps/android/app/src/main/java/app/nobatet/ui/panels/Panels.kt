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
import app.nobatet.data.ApiUser
import app.nobatet.ui.theme.LocalAppColors

// The tabs and their labels mirror apps/web components/app/panels.tsx exactly.

@Composable
fun CustomerPanel(user: ApiUser, onSignOut: () -> Unit) = PanelScaffold(
    title = "نوبتت",
    onSignOut = onSignOut,
    tabs = listOf(
        PanelTab("خانه", Icons.Outlined.Home) { Welcome(user.firstName, "نوبت‌های پیش‌رو و سالن‌های محبوب شما اینجا نمایش داده می‌شوند.") },
        PanelTab("کشف سالن", Icons.Outlined.Search) { ComingSoon("کشف سالن") },
        PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) { ComingSoon("نوبت‌ها") },
        PanelTab("کیف پول", Icons.Outlined.AccountBalanceWallet) { ComingSoon("کیف پول") },
        PanelTab("پروفایل", Icons.Outlined.Person) { ComingSoon("پروفایل") },
    ),
)

@Composable
fun StylistPanel(user: ApiUser, onSignOut: () -> Unit) = PanelScaffold(
    title = "${user.firstName} ${user.lastName}".trim(),
    onSignOut = onSignOut,
    tabs = listOf(
        PanelTab("امروز", Icons.Outlined.Home) { Welcome(user.firstName, "نوبت‌های امروز و درآمد پیش‌بینی امروز اینجا نمایش داده می‌شوند.") },
        PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) { ComingSoon("نوبت‌ها") },
        PanelTab("ساعات کاری", Icons.Outlined.Schedule) { ComingSoon("ساعات کاری") },
        PanelTab("خدمات", Icons.Outlined.ContentCut) { ComingSoon("خدمات") },
        PanelTab("پروفایل", Icons.Outlined.Person) { ComingSoon("پروفایل") },
    ),
)

/** Salon owners, and independent stylists (their own one-person business): «ساعات کاری» instead of «آرایشگرها». */
@Composable
fun SalonPanel(user: ApiUser, independent: Boolean, onSignOut: () -> Unit) = PanelScaffold(
    title = if (independent) "${user.firstName} ${user.lastName}".trim() else "پنل سالن",
    onSignOut = onSignOut,
    tabs = listOf(
        PanelTab("خانه", Icons.Outlined.Home) { Welcome(user.firstName, "نوبت‌های امروز و خلاصه کار اینجا نمایش داده می‌شوند.") },
        PanelTab("نوبت‌ها", Icons.Outlined.CalendarMonth) { ComingSoon("نوبت‌ها") },
        PanelTab("خدمات", Icons.Outlined.ContentCut) { ComingSoon("خدمات") },
        if (independent) PanelTab("ساعات کاری", Icons.Outlined.Schedule) { ComingSoon("ساعات کاری") }
        else PanelTab("آرایشگرها", Icons.Outlined.Groups) { ComingSoon("آرایشگرها") },
        PanelTab("تنظیمات", Icons.Outlined.Settings) { ComingSoon("تنظیمات") },
    ),
)

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
