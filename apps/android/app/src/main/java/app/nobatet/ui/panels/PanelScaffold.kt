package app.nobatet.ui.panels

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.ui.theme.LocalAppColors

/** One bottom tab, as in apps/web components/app/panels.tsx. */
data class PanelTab(val label: String, val icon: ImageVector, val content: @Composable () -> Unit)

/** The panel shell, like the web's AppShell: app bar with the identity, content, bottom tab bar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PanelScaffold(title: String, tabs: List<PanelTab>, onSignOut: () -> Unit) {
    val colors = LocalAppColors.current
    var selected by rememberSaveable { mutableIntStateOf(0) }
    Scaffold(
        containerColor = colors.bg,
        topBar = {
            TopAppBar(
                title = { Text(title, style = MaterialTheme.typography.titleMedium) },
                actions = { IconButton(onClick = onSignOut) { Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = "خروج") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = colors.bg, titleContentColor = colors.ink, actionIconContentColor = colors.muted),
            )
        },
        bottomBar = {
            NavigationBar(containerColor = colors.card) {
                tabs.forEachIndexed { i, tab ->
                    NavigationBarItem(
                        selected = i == selected,
                        onClick = { selected = i },
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = colors.accent, selectedTextColor = colors.accent, indicatorColor = colors.accentSoft,
                            unselectedIconColor = colors.muted, unselectedTextColor = colors.muted,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding).background(colors.bg)) { tabs[selected].content() }
    }
}

/** A tab whose screen isn't built yet. */
@Composable
fun ComingSoon(label: String) {
    val colors = LocalAppColors.current
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(label, style = MaterialTheme.typography.titleLarge, color = colors.ink)
        Text("این بخش به‌زودی در اپ اضافه می‌شود.", color = colors.muted, textAlign = TextAlign.Center)
    }
}

@Composable
fun Welcome(firstName: String, line: String) {
    val colors = LocalAppColors.current
    Column(Modifier.fillMaxSize().padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("سلام $firstName", style = MaterialTheme.typography.headlineSmall, color = colors.ink)
        Text(line, color = colors.muted)
    }
}
