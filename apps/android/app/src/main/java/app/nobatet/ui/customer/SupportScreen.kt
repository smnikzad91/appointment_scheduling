package app.nobatet.ui.customer

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.NewTicket
import app.nobatet.data.TicketDetail
import app.nobatet.data.TicketMessage
import app.nobatet.data.TicketSummary
import app.nobatet.data.persianError
import app.nobatet.data.ticketStatusLabel
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.persianDateTime
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant

private fun dateOf(iso: String) = runCatching { Instant.parse(iso).toSalonDateTime(null).persianDateTime() }.getOrDefault("")

/** «پشتیبانی»: the customer's tickets (apps/web /api/user/tickets, same token). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SupportScreen(container: AppContainer, onBack: () -> Unit) {
    val c = LocalAppColors.current
    // null = list, "" = new ticket, else a ticket id
    var open by remember { mutableStateOf<String?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    val snackbar = remember { SnackbarHostState() }
    BackHandler { if (open != null) open = null else onBack() }

    Scaffold(
        containerColor = c.bg,
        topBar = {
            TopAppBar(
                title = { Text(when (open) { null -> "پشتیبانی"; "" -> "تیکت جدید"; else -> "تیکت" }, style = MaterialTheme.typography.titleMedium) },
                navigationIcon = { IconButton(onClick = { if (open != null) open = null else onBack() }) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "بازگشت") } },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = c.bg, titleContentColor = c.ink, navigationIconContentColor = c.ink),
            )
        },
        snackbarHost = { SnackbarHost(snackbar) },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val id = open) {
                null -> TicketList(container, reload, onNew = { open = "" }, onOpen = { open = it })
                "" -> NewTicketForm(container, snackbar) { newId -> reload++; open = newId }
                else -> TicketThread(container, id, snackbar)
            }
        }
    }
}

@Composable
private fun TicketList(container: AppContainer, reload: Int, onNew: () -> Unit, onOpen: (String) -> Unit) {
    val c = LocalAppColors.current
    var tickets by remember { mutableStateOf<List<TicketSummary>?>(null) }
    LaunchedEffect(reload) { tickets = runCatching { container.web.tickets() }.getOrDefault(emptyList()) }
    Column(Modifier.fillMaxSize()) {
        PrimaryButton("تیکت جدید", Modifier.padding(16.dp), onClick = onNew)
        val list = tickets
        when {
            list == null -> Loading()
            list.isEmpty() -> Empty("تیکتی ندارید", "اگر سوال یا مشکلی دارید، تیکت جدید بفرستید.", Modifier.padding(horizontal = 16.dp))
            else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(list, key = { it.id }) { t ->
                    AppCard(Modifier.clickable { onOpen(t.id) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(t.subject, color = c.ink, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            Muted(ticketStatusLabel(t.status))
                        }
                        Muted(dateOf(t.updatedAt))
                    }
                }
            }
        }
    }
}

@Composable
private fun NewTicketForm(container: AppContainer, snackbar: SnackbarHostState, onCreated: (String) -> Unit) {
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    Column(Modifier.fillMaxSize().imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(subject, { if (it.length <= 200) subject = it }, label = { Text("موضوع") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(message, { if (it.length <= 3000) message = it }, label = { Text("متن پیام") }, minLines = 6, modifier = Modifier.fillMaxWidth())
        PrimaryButton(if (sending) "در حال ارسال..." else "ارسال تیکت", enabled = !sending) {
            when {
                subject.trim().length < 5 -> scope.launch { snackbar.showSnackbar("موضوع باید حداقل ۵ کاراکتر باشد") }
                message.trim().length < 20 -> scope.launch { snackbar.showSnackbar("متن پیام باید حداقل ۲۰ کاراکتر باشد") }
                else -> scope.launch {
                    sending = true
                    try {
                        onCreated(container.web.createTicket(NewTicket(subject.trim(), message.trim())).id)
                    } catch (e: Exception) {
                        snackbar.showSnackbar(persianError(e, "ارسال تیکت انجام نشد", container.json))
                    } finally {
                        sending = false
                    }
                }
            }
        }
    }
}

@Composable
private fun TicketThread(container: AppContainer, id: String, snackbar: SnackbarHostState) {
    val c = LocalAppColors.current
    var ticket by remember { mutableStateOf<TicketDetail?>(null) }
    var reply by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(id, reload) { ticket = runCatching { container.web.ticket(id) }.getOrNull() }
    val t = ticket ?: return Loading()
    Column(Modifier.fillMaxSize().imePadding()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text(t.subject, style = MaterialTheme.typography.titleMedium, color = c.ink)
                Muted(ticketStatusLabel(t.status))
            }
            item { Bubble(t.message, dateOf(t.createdAt), mine = true) }
            items(t.replies) { r -> Bubble(r.message, dateOf(r.createdAt), mine = r.sender == "user") }
        }
        if (t.status != "closed") {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(reply, { if (it.length <= 3000) reply = it }, placeholder = { Text("پاسخ شما") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("ارسال پاسخ", Modifier.weight(1f), enabled = !busy) {
                        if (reply.trim().length < 5) scope.launch { snackbar.showSnackbar("پاسخ باید حداقل ۵ کاراکتر باشد") }
                        else scope.launch {
                            busy = true
                            runCatching { container.web.replyTicket(id, TicketMessage(reply.trim())) }
                                .onSuccess { reply = ""; reload++ }
                                .onFailure { snackbar.showSnackbar(persianError(it, "ارسال پاسخ انجام نشد", container.json)) }
                            busy = false
                        }
                    }
                    TextButton(onClick = {
                        scope.launch { runCatching { container.web.closeTicket(id) }.onSuccess { reload++ } }
                    }) { Text("بستن تیکت", color = c.muted) }
                }
            }
        }
    }
}

@Composable
private fun Bubble(text: String, date: String, mine: Boolean) {
    val c = LocalAppColors.current
    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterStart else Alignment.CenterEnd) {
        Column(
            Modifier.fillMaxWidth(0.85f).clip(RoundedCornerShape(18.dp)).background(if (mine) c.accentSoft else c.card).padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (!mine) Text("پشتیبانی", color = c.accent, style = MaterialTheme.typography.labelMedium)
            Text(text, color = c.ink)
            Muted(date)
        }
    }
}
