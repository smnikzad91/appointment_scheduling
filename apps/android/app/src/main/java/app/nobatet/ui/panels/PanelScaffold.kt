package app.nobatet.ui.panels

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.LightMode
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.R
import app.nobatet.ui.components.Avatar
import app.nobatet.ui.components.PageHeader
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.ui.theme.LocalThemeControl

/** One bottom tab, as in apps/web components/app/panels.tsx. */
data class PanelTab(
    val label: String,
    val icon: ImageVector,
    /** The web's PageHeader over the tab (none on a home tab, which has its own greeting). */
    val title: String? = null,
    val subtitle: String? = null,
    val content: @Composable () -> Unit,
)

/** Who the app bar represents (the web's ShellIdentity): the user, the stylist, or the salon (square logo). */
data class ShellIdentity(val name: String, val image: String?, val square: Boolean = false)

/** A row of the account sheet before «حالت تیره» and «خروج از حساب». */
data class AccountLink(val label: String, val icon: ImageVector, val onClick: () -> Unit)

/**
 * The panel shell, like the web's AppShell: an app bar with the logo, «نوبتت» and the panel name,
 * the bell and the avatar; the avatar opens «حساب کاربری» (links, light/dark, sign out); content;
 * the bottom tab bar.
 */
@Composable
fun PanelScaffold(
    panelName: String,
    identity: ShellIdentity,
    tabs: List<PanelTab>,
    onSignOut: () -> Unit,
    /** The account's own name when the bar shows someone else (the salon), as on the web. */
    accountName: String? = null,
    accountLinks: List<AccountLink> = emptyList(),
    selectedTab: Int? = null,
    onSelectTab: ((Int) -> Unit)? = null,
    /** App-bar buttons before the avatar (e.g. the notifications bell). */
    actions: @Composable RowScope.() -> Unit = {},
) {
    val colors = LocalAppColors.current
    var ownSelected by rememberSaveable { mutableIntStateOf(0) }
    var accountOpen by rememberSaveable { mutableStateOf(false) }
    // the panel may drive the tab itself (e.g. «مشاهده نوبت‌های من» after booking)
    val selected = selectedTab ?: ownSelected
    val select: (Int) -> Unit = onSelectTab ?: { ownSelected = it }
    Scaffold(
        containerColor = colors.bg,
        topBar = {
            Row(
                Modifier.fillMaxWidth().background(colors.bg).statusBarsPadding().height(56.dp).padding(horizontal = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Image(painterResource(R.drawable.logo_symbol), contentDescription = null, modifier = Modifier.size(36.dp))
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text("نوبتت", color = colors.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold, lineHeight = 20.sp)
                    Text(panelName, color = colors.muted, fontSize = 11.sp, lineHeight = 14.sp)
                }
                actions()
                Spacer(Modifier.width(6.dp))
                Avatar(
                    identity.name, identity.image, size = 38.dp, square = identity.square,
                    modifier = Modifier.border(2.dp, colors.card, if (identity.square) RoundedCornerShape(10.dp) else CircleShape)
                        .clip(if (identity.square) RoundedCornerShape(10.dp) else CircleShape)
                        .clickable(onClickLabel = "حساب کاربری") { accountOpen = true },
                )
            }
        },
        bottomBar = { TabBar(tabs, selected, select) },
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).background(colors.bg)) {
            val tab = tabs[selected]
            tab.title?.let { PageHeader(it, tab.subtitle) }
            Box(Modifier.weight(1f)) { tab.content() }
        }
    }
    if (accountOpen) AccountSheet(panelName, identity, accountName, accountLinks, onSignOut) { accountOpen = false }
}

/** The web's tab bar: the active icon on an accent pill, its label bold in ink. */
@Composable
private fun TabBar(tabs: List<PanelTab>, selected: Int, select: (Int) -> Unit) {
    val c = LocalAppColors.current
    Column(Modifier.fillMaxWidth().background(c.card).navigationBarsPadding()) {
        HorizontalDivider(color = c.line, thickness = 1.dp)
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp)) {
            tabs.forEachIndexed { i, tab ->
                val active = i == selected
                val pill by animateColorAsState(if (active) c.accentSoft else Color.Transparent, tween(300), label = "tab")
                Column(
                    Modifier.weight(1f).height(62.dp)
                        .selectable(selected = active, interactionSource = remember { MutableInteractionSource() }, indication = null, role = Role.Tab) { select(i) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically),
                ) {
                    Box(Modifier.size(width = 56.dp, height = 32.dp).clip(CircleShape).background(pill), contentAlignment = Alignment.Center) {
                        Icon(tab.icon, contentDescription = null, tint = if (active) c.accent else c.muted, modifier = Modifier.size(22.dp))
                    }
                    Text(
                        tab.label, fontSize = 11.sp, lineHeight = 12.sp, maxLines = 1,
                        color = if (active) c.ink else c.muted, fontWeight = if (active) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}

/** «حساب کاربری»: who's signed in, the panel's links, light/dark mode and sign out. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AccountSheet(
    panelName: String,
    identity: ShellIdentity,
    accountName: String?,
    links: List<AccountLink>,
    onSignOut: () -> Unit,
    onDismiss: () -> Unit,
) {
    val c = LocalAppColors.current
    val theme = LocalThemeControl.current
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = c.bg) {
        Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 24.dp)) {
            Text("حساب کاربری", style = MaterialTheme.typography.titleMedium, color = c.ink, modifier = Modifier.padding(bottom = 16.dp))
            Row(Modifier.padding(bottom = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                Avatar(identity.name, identity.image, size = 56.dp, square = identity.square)
                Column(Modifier.padding(start = 12.dp)) {
                    Text(identity.name, color = c.ink, fontWeight = FontWeight.Bold, fontSize = 16.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(if (accountName != null) "$panelName — $accountName" else panelName, color = c.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp))) {
                links.forEach { link ->
                    AccountRow(link.label, link.icon) { onDismiss(); link.onClick() }
                    HorizontalDivider(color = c.line)
                }
                AccountRow(if (theme.dark) "حالت روشن" else "حالت تیره", if (theme.dark) Icons.Outlined.LightMode else Icons.Outlined.DarkMode, onClick = theme.toggle)
                HorizontalDivider(color = c.line)
                AccountRow("خروج از حساب", Icons.AutoMirrored.Outlined.Logout, tint = c.danger) { onDismiss(); onSignOut() }
            }
        }
    }
}

@Composable
private fun AccountRow(label: String, icon: ImageVector, tint: Color? = null, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth().height(56.dp).clickable(onClick = onClick).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = tint ?: c.muted, modifier = Modifier.size(20.dp))
        Text(label, color = tint ?: c.ink, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 12.dp))
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
