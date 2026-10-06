package app.nobatet.ui.salon

import app.nobatet.data.ServiceLocation
import app.nobatet.ui.components.ShareSubject
import app.nobatet.ui.components.ShareKit
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material3.Text
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
    PageScaffold(page.title, onBack) {
        when (page) {
            SalonPage.ACCOUNTING -> SalonAccountingPage(container, data)
            SalonPage.REVIEWS -> SalonReviewsPage(container, data)
            SalonPage.GALLERY -> SalonGalleryPage(container, data)
            SalonPage.SHARE -> SalonSharePage(container, data)
            SalonPage.WALLET -> app.nobatet.ui.wallet.WalletScreen(container)
        }
    }
}

/** Every review of the salon (an independent stylist: about them); approve or reject. */
@Composable
private fun SalonReviewsPage(container: AppContainer, data: SalonData) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var reviews by remember { mutableStateOf<List<ModerationReview>?>(null) }
    LaunchedEffect(Unit) { reviews = runCatching { container.api.salonReviews() }.getOrDefault(emptyList()) }
    val list = reviews ?: return Loading()
    if (list.isEmpty()) return Empty("هنوز نظری ثبت نشده", modifier = Modifier.padding(16.dp))
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
                            .onFailure { Toasts.error(persianError(it, "انجام نشد، دوباره تلاش کنید", container.json)) }
                    }
                    if (r.status != ReviewStatus.APPROVED) AppTextButton(onClick = { moderate(ReviewStatus.APPROVED) }) { Text("تایید و انتشار") }
                    if (r.status != ReviewStatus.REJECTED) AppTextButton(onClick = { moderate(ReviewStatus.REJECTED) }) { Text("رد", color = c.danger) }
                }
            }
        }
    }
}

private const val SALON_GALLERY_LIMIT = 60

/** The salon's portfolio (≤ 60). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SalonGalleryPage(container: AppContainer, data: SalonData) {
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
                .onFailure { Toasts.error(persianError(it, "آپلود عکس انجام نشد", container.json)) }
            busy = false
        }
    }
    var crediting by remember { mutableStateOf<GalleryItem?>(null) }
    val list = gallery ?: return Loading()
    crediting?.let { g ->
        AppDialog(
            onDismissRequest = { crediting = null },
            title = { Text("کار کدام آرایشگر است؟") },
            text = {
                Column {
                    (listOf<Pair<String?, String>>(null to "سالن (بدون آرایشگر)") + data.stylists.map { it.id to it.displayName }).forEach { (id, name) ->
                        Text(name, color = c.ink, modifier = Modifier.fillMaxWidth().clickable {
                            crediting = null
                            scope.launch {
                                runCatching { container.api.updateGalleryImage(g.id, app.nobatet.data.jsonBody("stylistId" to id)) }
                                    .onSuccess { updated -> gallery = list.map { if (it.id == g.id) updated else it } }
                                    .onFailure { Toasts.error(persianError(it, "ذخیره انجام نشد", container.json)) }
                            }
                        }.padding(vertical = 12.dp))
                    }
                }
            },
            confirmButton = { AppTextButton(onClick = { crediting = null }) { Text("انصراف") } },
        )
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Muted("${list.size.toString().toPersianDigits()} از ${SALON_GALLERY_LIMIT.toString().toPersianDigits()}")
        PrimaryButton(if (busy) "در حال آپلود..." else "افزودن نمونه کار", enabled = !busy && list.size < SALON_GALLERY_LIMIT) {
            pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            list.forEach { g ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    RemoteImage(g.url, Modifier.size(104.dp).clip(RoundedCornerShape(14.dp)))
                    // the owner credits a piece to a stylist (shown on their card on the salon page)
                    if (data.salon?.independent != true && data.stylists.isNotEmpty()) {
                        val name = data.stylists.firstOrNull { it.id == g.stylistId }?.displayName ?: "سالن"
                        AppTextButton(onClick = { crediting = g }) { Text(name) }
                    }
                    AppTextButton(onClick = {
                        scope.launch { runCatching { container.api.deleteGalleryImage(g.id) }.onSuccess { gallery = list - g }.onFailure { Toasts.error(persianError(it, "حذف عکس انجام نشد", container.json)) } }
                    }) { Text("حذف", color = c.danger) }
                }
            }
        }
    }
}

/** «کیت معرفی» of the salon (or an independent stylist's business): the web's share kit. */
@Composable
private fun SalonSharePage(container: AppContainer, data: SalonData) {
    val salon = data.salon ?: return Loading()
    val place = listOfNotNull(salon.city.takeIf { it.isNotBlank() }, salon.province?.takeIf { it.isNotBlank() && it != salon.city }).joinToString("، ")
    val title = if (salon.independent) {
        if (ServiceLocation.IN_SALON in salon.serviceLocations && !salon.hostSalonName.isNullOrBlank()) "آرایشگر مستقل در ${salon.hostSalonName}" else "آرایشگر مستقل"
    } else "سالن زیبایی"
    val subject = ShareSubject(
        handle = salon.handle ?: salon.slug, customHandle = salon.handle, name = salon.name, title = title,
        specialties = data.services.filter { it.active }.map { it.name }, place = place,
        coverUrl = salon.coverImageUrl, avatarUrl = salon.logoUrl, squareAvatar = !salon.independent,
        brandColor = runCatching { android.graphics.Color.parseColor(salon.brandColor) }.getOrDefault(android.graphics.Color.parseColor("#a34a30")),
    )
    ShareKit(container, subject, "لینک مستقیم رزرو، کد QR و پوستر آماده برای استوری و چاپ") { h ->
        container.api.setSalonHandle(HandleRequest(h)).handle.also { data.loadSalon() }
    }
}
