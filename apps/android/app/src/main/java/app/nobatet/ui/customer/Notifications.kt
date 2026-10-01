package app.nobatet.ui.customer

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import app.nobatet.data.AppContainer
import app.nobatet.data.AppNotification
import app.nobatet.notify.NotificationScope
import app.nobatet.notify.NotificationText
import app.nobatet.notify.describe
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonPrimitive
import java.time.Instant
import java.time.LocalDate

/** The app-bar bell: unread count, refreshed every minute while shown (like the web's NotificationBell). */
@Composable
fun NotificationBell(container: AppContainer, onOpen: () -> Unit) {
    var unread by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            runCatching { container.api.notifications() }.onSuccess { unread = it.unreadCount }
            delay(60_000)
        }
    }
    IconButton(onClick = onOpen) {
        BadgedBox(badge = { if (unread > 0) Badge { Text(unread.coerceAtMost(99).toString().toPersianDigits()) } }) {
            Icon(Icons.Outlined.Notifications, contentDescription = "اعلان‌ها")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationsScreen(container: AppContainer, scope: NotificationScope, onBack: () -> Unit, onOpen: (NotificationText) -> Unit) {
    val c = LocalAppColors.current
    var items by remember { mutableStateOf<List<AppNotification>?>(null) }
    val coroutines = rememberCoroutineScope()
    BackHandler(onBack = onBack)
    LaunchedEffect(Unit) {
        items = runCatching { container.api.notifications().items }.getOrDefault(emptyList())
        // opening the list reads them all, as on the web
        coroutines.launch { runCatching { container.api.readAllNotifications() } }
    }
    Scaffold(
        containerColor = c.bg,
        topBar = {
            TopAppBar(
                title = { Text("اعلان‌ها", style = MaterialTheme.typography.titleMedium) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "بازگشت") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = c.bg, titleContentColor = c.ink, navigationIconContentColor = c.ink),
            )
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            val list = items
            when {
                list == null -> Loading()
                list.isEmpty() -> Empty("اعلانی ندارید", modifier = Modifier.padding(16.dp))
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(list, key = { it.id }) { n ->
                        val t = describe(n, scope)
                        AppCard(
                            Modifier.clickable { onOpen(t) }
                                .then(if (n.readAt == null) Modifier.background(c.accentSoft.copy(alpha = 0.35f)) else Modifier),
                        ) {
                            Text(t.title, color = c.ink, style = MaterialTheme.typography.titleSmall)
                            t.detail?.let { Muted(it) }
                            Muted(runCatching { Instant.parse(n.createdAt).toSalonDateTime(null).persianDateTime() }.getOrDefault(""))
                        }
                    }
                }
            }
        }
    }
}
