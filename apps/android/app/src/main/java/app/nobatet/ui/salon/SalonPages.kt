package app.nobatet.ui.salon

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import app.nobatet.BuildConfig
import app.nobatet.data.AppContainer
import app.nobatet.data.GalleryItem
import app.nobatet.data.HandleRequest
import app.nobatet.data.ModerateRequest
import app.nobatet.data.ModerationReview
import app.nobatet.data.NewGalleryImage
import app.nobatet.data.ReviewStatus
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PageScaffold
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.stylist.qrBitmap
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch

@Composable
fun SalonPageScreen(page: SalonPage, container: AppContainer, data: SalonData, onBack: () -> Unit) {
    val snackbar = remember { SnackbarHostState() }
    PageScaffold(page.title, onBack, snackbar) {
        when (page) {
            SalonPage.ACCOUNTING -> SalonAccountingPage(container, data, snackbar)
            SalonPage.REVIEWS -> SalonReviewsPage(container, data, snackbar)
            SalonPage.GALLERY -> SalonGalleryPage(container, snackbar)
            SalonPage.SHARE -> SalonSharePage(container, data, snackbar)
        }
    }
}

/** Every review of the salon (an independent stylist: about them); approve or reject. */
@Composable
private fun SalonReviewsPage(container: AppContainer, data: SalonData, snackbar: SnackbarHostState) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var reviews by remember { mutableStateOf<List<ModerationReview>?>(null) }
    LaunchedEffect(Unit) { reviews = runCatching { container.api.salonReviews() }.getOrDefault(emptyList()) }
    val list = reviews ?: return Loading()
    if (list.isEmpty()) return Empty("هنوز نظری ثبت نشده")
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(list.sortedByDescending { it.status == ReviewStatus.PENDING }, key = { it.id }) { r ->
            AppCard {
                Row { Text(r.customerName, color = c.ink, modifier = Modifier.weight(1f)); r.rating?.let { Text("★".repeat(it), color = c.pending) } }
                r.comment?.let { Text(it, color = c.ink) }
                Muted(when (r.status) { ReviewStatus.PENDING -> "در انتظار تایید"; ReviewStatus.APPROVED -> "منتشر شده"; ReviewStatus.REJECTED -> "رد شده" })
                Row {
                    fun moderate(status: ReviewStatus) = scope.launch {
                        runCatching { container.api.moderateReview(r.id, ModerateRequest(status)) }
                            .onSuccess { updated -> reviews = list.map { if (it.id == r.id) updated else it } }
                            .onFailure { snackbar.showSnackbar(persianError(it, "انجام نشد، دوباره تلاش کنید", container.json)) }
                    }
                    if (r.status != ReviewStatus.APPROVED) TextButton(onClick = { moderate(ReviewStatus.APPROVED) }) { Text("تایید و انتشار") }
                    if (r.status != ReviewStatus.REJECTED) TextButton(onClick = { moderate(ReviewStatus.REJECTED) }) { Text("رد", color = c.danger) }
                }
            }
        }
    }
}

private const val SALON_GALLERY_LIMIT = 60

/** The salon's portfolio (≤ 60). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SalonGalleryPage(container: AppContainer, snackbar: SnackbarHostState) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var gallery by remember { mutableStateOf<List<GalleryItem>?>(null) }
    var busy by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { gallery = runCatching { container.api.salonGallery() }.getOrDefault(emptyList()) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { container.api.addSalonGalleryImage(NewGalleryImage(uploadPhoto(container, context, uri, "salons"))) }
                .onSuccess { gallery = listOf(it) + gallery.orEmpty() }
                .onFailure { snackbar.showSnackbar(persianError(it, "آپلود عکس انجام نشد", container.json)) }
            busy = false
        }
    }
    val list = gallery ?: return Loading()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Muted("${list.size.toString().toPersianDigits()} از ${SALON_GALLERY_LIMIT.toString().toPersianDigits()}")
        PrimaryButton(if (busy) "در حال آپلود..." else "افزودن نمونه کار", enabled = !busy && list.size < SALON_GALLERY_LIMIT) {
            pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            list.forEach { g ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    RemoteImage(g.url, Modifier.size(104.dp).clip(RoundedCornerShape(14.dp)))
                    TextButton(onClick = {
                        scope.launch { runCatching { container.api.deleteGalleryImage(g.id) }.onSuccess { gallery = list - g }.onFailure { snackbar.showSnackbar(persianError(it, "حذف عکس انجام نشد", container.json)) } }
                    }) { Text("حذف", color = c.danger) }
                }
            }
        }
    }
}

/** «کیت معرفی» of the salon: nobatet.app/book/@<handle or slug>, QR, share, change the handle. */
@Composable
private fun SalonSharePage(container: AppContainer, data: SalonData, snackbar: SnackbarHostState) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val salon = data.salon ?: return
    val h = salon.handle ?: salon.slug
    var draft by remember(h) { mutableStateOf(h) }
    val url = BuildConfig.WEB_BASE_URL.trimEnd('/') + "/book/@" + h
    val qr = remember(url) { qrBitmap(url) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(if (salon.independent) "لینک رزرو شما" else "لینک رزرو سالن", color = c.muted)
        Text("nobatet.app/book/@$h", color = c.ink, style = MaterialTheme.typography.titleMedium)
        Image(qr.asImageBitmap(), contentDescription = "کد QR لینک رزرو", modifier = Modifier.size(240.dp).clip(RoundedCornerShape(16.dp)).background(androidx.compose.ui.graphics.Color.White).padding(8.dp))
        PrimaryButton("ارسال لینک") {
            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "نوبت آنلاین در ${salon.name}: $url"), "ارسال لینک"))
        }
        TextButton(onClick = {
            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("link", url))
            scope.launch { snackbar.showSnackbar("لینک کپی شد") }
        }) { Text("کپی لینک") }
        TextButton(onClick = {
            val subtitle = buildList {
                if (salon.independent) add(if (!salon.hostSalonName.isNullOrBlank()) "آرایشگر مستقل در ${salon.hostSalonName}" else "آرایشگر مستقل")
                add(listOfNotNull(salon.city.takeIf { it.isNotBlank() }, salon.province).joinToString("، "))
            }.filter { it.isNotBlank() }.joinToString("، ")
            val poster = app.nobatet.util.drawStoryPoster(
                context,
                app.nobatet.util.PosterData(
                    name = salon.name, subtitle = subtitle, services = data.services.filter { it.active }.map { it.name },
                    link = "nobatet.app/book/@$h",
                    brandColor = runCatching { android.graphics.Color.parseColor(salon.brandColor) }.getOrDefault(android.graphics.Color.parseColor("#a34a30")),
                    qr = qrBitmap(url, 900),
                ),
            )
            app.nobatet.util.sharePoster(context, poster, "nobatet-$h-story.png")
        }) { Text("پوستر استوری (اینستاگرام)") }
        AppCard {
            SectionTitle("تغییر نام کاربری")
            Muted("با تغییر آن، لینک و کد QR قبلی دیگر کار نمی‌کنند.")
            OutlinedTextField(draft, { draft = it.lowercase().take(30) }, prefix = { Text("@") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            PrimaryButton("ذخیره", enabled = draft.isNotBlank() && draft != h) {
                scope.launch {
                    runCatching { container.api.setSalonHandle(HandleRequest(draft.trim())) }
                        .onSuccess { data.loadSalon(); snackbar.showSnackbar("نام کاربری ذخیره شد") }
                        .onFailure { snackbar.showSnackbar(persianError(it, "ذخیره انجام نشد", container.json)) }
                }
            }
        }
    }
}
