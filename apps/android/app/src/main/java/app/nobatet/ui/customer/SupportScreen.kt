package app.nobatet.ui.customer

import coil.compose.AsyncImage
import app.nobatet.ui.components.RemoteImage
import app.nobatet.data.uploadPhoto
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Color
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.Close
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.border
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.compose.rememberLauncherForActivityResult
import android.net.Uri
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
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
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (val id = open) {
                null -> TicketList(container, reload, onNew = { open = "" }, onOpen = { open = it })
                "" -> NewTicketForm(container) { newId -> reload++; open = newId }
                else -> TicketThread(container, id)
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
private fun NewTicketForm(container: AppContainer, onCreated: (String) -> Unit) {
    var subject by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var images by remember { mutableStateOf<List<Uri>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        AppTextField(subject, { if (it.length <= 200) subject = it }, label = { Text("موضوع") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        AppTextField(message, { if (it.length <= 3000) message = it }, label = { Text("متن پیام") }, minLines = 6, modifier = Modifier.fillMaxWidth())
        ImagePicker(images) { images = it }
        PrimaryButton(if (sending) "در حال ارسال..." else "ارسال تیکت", enabled = !sending) {
            when {
                subject.trim().length < 5 -> scope.launch { Toasts.error("موضوع باید حداقل ۵ کاراکتر باشد") }
                message.trim().length < 20 -> scope.launch { Toasts.error("متن پیام باید حداقل ۲۰ کاراکتر باشد") }
                else -> scope.launch {
                    sending = true
                    try {
                        val urls = uploadAll(container, context, images) ?: return@launch
                        onCreated(container.web.createTicket(NewTicket(subject.trim(), message.trim(), urls)).id)
                    } catch (e: Exception) {
                        Toasts.error(persianError(e, "ارسال تیکت انجام نشد", container.json))
                    } finally {
                        sending = false
                    }
                }
            }
        }
    }
}

@Composable
private fun TicketThread(container: AppContainer, id: String) {
    val c = LocalAppColors.current
    var ticket by remember { mutableStateOf<TicketDetail?>(null) }
    var reply by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var images by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var reload by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    LaunchedEffect(id, reload) { ticket = runCatching { container.web.ticket(id) }.getOrNull() }
    val t = ticket ?: return Loading()
    Column(Modifier.fillMaxSize().imePadding()) {
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text(t.subject, style = MaterialTheme.typography.titleMedium, color = c.ink)
                Muted(ticketStatusLabel(t.status))
            }
            item { Bubble(t.message, dateOf(t.createdAt), mine = true, images = t.images) }
            items(t.replies) { r -> Bubble(r.message, dateOf(r.createdAt), mine = r.sender == "user", images = r.images) }
        }
        if (t.status != "closed") {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AppTextField(reply, { if (it.length <= 3000) reply = it }, placeholder = { Text("پاسخ شما") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                ImagePicker(images) { images = it }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("ارسال پاسخ", Modifier.weight(1f), enabled = !busy) {
                        if (reply.trim().length < 5) scope.launch { Toasts.error("پاسخ باید حداقل ۵ کاراکتر باشد") }
                        else scope.launch {
                            busy = true
                            val urls = uploadAll(container, context, images)
                            if (urls == null) { busy = false; return@launch }
                            runCatching { container.web.replyTicket(id, TicketMessage(reply.trim(), urls)) }
                                .onSuccess { reply = ""; images = emptyList(); reload++ }
                                .onFailure { Toasts.error(persianError(it, "ارسال پاسخ انجام نشد", container.json)) }
                            busy = false
                        }
                    }
                    AppTextButton(onClick = {
                        scope.launch { runCatching { container.web.closeTicket(id) }.onSuccess { reload++ } }
                    }) { Text("بستن تیکت", color = c.muted) }
                }
            }
        }
    }
}

@Composable
private fun Bubble(text: String, date: String, mine: Boolean, images: List<String> = emptyList()) {
    val c = LocalAppColors.current
    Box(Modifier.fillMaxWidth(), contentAlignment = if (mine) Alignment.CenterStart else Alignment.CenterEnd) {
        Column(
            Modifier.fillMaxWidth(0.85f).clip(RoundedCornerShape(18.dp)).background(if (mine) c.accentSoft else c.card).padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (!mine) Text("پشتیبانی", color = c.accent, style = MaterialTheme.typography.labelMedium)
            Text(text, color = c.ink)
            if (images.isNotEmpty()) TicketImages(images)
            Muted(date)
        }
    }
}

private const val MAX_IMAGES = 5

/** Up to five photos for a ticket or reply (the web's limit), as thumbnails with a remove button. */
@Composable
private fun ImagePicker(images: List<Uri>, onChange: (List<Uri>) -> Unit) {
    val c = LocalAppColors.current
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(MAX_IMAGES)) { picked ->
        if (picked.isNotEmpty()) {
            val all = (images + picked).distinct()
            if (all.size > MAX_IMAGES) Toasts.error("حداکثر ۵ تصویر مجاز است")
            onChange(all.take(MAX_IMAGES))
        }
    }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        images.forEach { uri ->
            Box(Modifier.size(72.dp).clip(RoundedCornerShape(16.dp))) {
                AsyncImage(model = uri, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                Box(
                    Modifier.align(Alignment.TopEnd).padding(4.dp).size(22.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.6f))
                        .clickable { onChange(images - uri) },
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Outlined.Close, contentDescription = "حذف تصویر", tint = Color.White, modifier = Modifier.size(14.dp)) }
            }
        }
        if (images.size < MAX_IMAGES) Column(
            Modifier.size(72.dp).clip(RoundedCornerShape(16.dp)).border(1.dp, c.line, RoundedCornerShape(16.dp)).background(c.card)
                .clickable { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center,
        ) {
            Icon(Icons.Outlined.AddPhotoAlternate, contentDescription = null, tint = c.muted, modifier = Modifier.size(22.dp))
            Text("تصویر", color = c.muted, fontSize = 11.sp)
        }
    }
}

/** Uploads the picked photos to /api/upload?folder=tickets; null (after a toast) if one fails. */
private suspend fun uploadAll(container: AppContainer, context: android.content.Context, images: List<Uri>): List<String>? = try {
    images.map { uploadPhoto(container, context, it, "tickets") }
} catch (e: Exception) {
    Toasts.error(persianError(e, "خطا در آپلود", container.json))
    null
}

/** A message's photos; a tap shows one full-screen. */
@Composable
private fun TicketImages(images: List<String>) {
    var open by remember { mutableStateOf<String?>(null) }
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        images.forEach { url -> RemoteImage(url, Modifier.size(64.dp).clip(RoundedCornerShape(12.dp)).clickable { open = url }) }
    }
    open?.let { url ->
        Dialog(onDismissRequest = { open = null }, properties = DialogProperties(usePlatformDefaultWidth = false)) {
            Box(Modifier.fillMaxSize().background(Color.Black).clickable { open = null }, contentAlignment = Alignment.Center) {
                RemoteImage(url, Modifier.fillMaxWidth(), contentScale = ContentScale.Fit)
            }
        }
    }
}
