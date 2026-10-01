package app.nobatet.ui.stylist

import app.nobatet.ui.components.Toasts
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.GalleryItem
import app.nobatet.data.NewGalleryImage
import app.nobatet.data.SelfStylist
import app.nobatet.data.StylistProfilePatch
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch

private const val GALLERY_LIMIT = 30

/** «پروفایل»: photo + cover, bio, the portfolio gallery, and the other pages. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun StylistProfileScreen(container: AppContainer, stylist: SelfStylist, onChanged: () -> Unit, onOpenPage: (StylistPage) -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var bio by remember(stylist) { mutableStateOf(stylist.bio.orEmpty()) }
    var busy by remember { mutableStateOf<String?>(null) }
    var gallery by remember { mutableStateOf<List<GalleryItem>>(emptyList()) }
    LaunchedEffect(Unit) { gallery = runCatching { container.api.myGallery() }.getOrDefault(emptyList()) }

    fun uploadThen(what: String, uri: Uri, then: suspend (String) -> Unit) {
        scope.launch {
            busy = what
            try {
                then(uploadPhoto(container, context, uri, "stylists"))
            } catch (e: Exception) {
                Toasts.error(persianError(e, "آپلود عکس انجام نشد", container.json))
            } finally {
                busy = null
            }
        }
    }
    val pickAvatar = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { uploadThen("avatar", it) { url -> container.api.updateMyStylist(StylistProfilePatch(avatarUrl = url)); onChanged() } }
    }
    val pickCover = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { uploadThen("cover", it) { url -> container.api.updateMyStylist(StylistProfilePatch(coverImageUrl = url)); onChanged() } }
    }
    val pickGallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { uploadThen("gallery", it) { url -> gallery = listOf(container.api.addGalleryImage(NewGalleryImage(url))) + gallery } }
    }
    val image = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box {
                RemoteImage(stylist.coverImageUrl, Modifier.fillMaxWidth().height(160.dp).clickable { pickCover.launch(image) })
                RemoteImage(stylist.avatarUrl, Modifier.padding(start = 20.dp).offset(y = 116.dp).size(88.dp).clip(CircleShape).clickable { pickAvatar.launch(image) })
            }
            Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 44.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stylist.displayName, style = MaterialTheme.typography.titleLarge, color = c.ink)
                Muted(stylist.salon.name)
                Row {
                    TextButton(onClick = { pickAvatar.launch(image) }, enabled = busy == null) { Text(if (busy == "avatar") "در حال آپلود..." else "تغییر عکس") }
                    TextButton(onClick = { pickCover.launch(image) }, enabled = busy == null) { Text(if (busy == "cover") "در حال آپلود..." else "تغییر کاور") }
                }
                AppCard {
                    SectionTitle("معرفی خودتان")
                    OutlinedTextField(bio, { bio = it.take(500) }, minLines = 3, modifier = Modifier.fillMaxWidth(), placeholder = { Text("سابقه، تخصص و سبک کارتان را بنویسید") })
                    PrimaryButton("ذخیره معرفی") {
                        scope.launch {
                            runCatching { container.api.updateMyStylist(StylistProfilePatch(bio = bio.trim())) }
                                .onSuccess { Toasts.success("ذخیره شد"); onChanged() }
                                .onFailure { Toasts.error(persianError(it, "ذخیره تغییرات انجام نشد", container.json)) }
                        }
                    }
                }
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        SectionTitle("نمونه کارها", Modifier.weight(1f))
                        Muted("${gallery.size.toString().toPersianDigits()} از ${GALLERY_LIMIT.toString().toPersianDigits()}")
                    }
                    TextButton(onClick = { pickGallery.launch(image) }, enabled = busy == null && gallery.size < GALLERY_LIMIT) {
                        Text(if (busy == "gallery") "در حال آپلود..." else "افزودن نمونه کار")
                    }
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        gallery.forEach { g ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                RemoteImage(g.url, Modifier.size(100.dp).clip(RoundedCornerShape(14.dp)))
                                TextButton(onClick = {
                                    scope.launch {
                                        runCatching { container.api.deleteGalleryImage(g.id) }.onSuccess { gallery = gallery - g }
                                            .onFailure { Toasts.error(persianError(it, "حذف عکس انجام نشد", container.json)) }
                                    }
                                }) { Text("حذف", color = c.danger) }
                            }
                        }
                    }
                }
                StylistPage.entries.forEach { page ->
                    AppCard(Modifier.clickable { onOpenPage(page) }) {
                        Row(verticalAlignment = Alignment.CenterVertically) { Text(page.title, color = c.ink, modifier = Modifier.weight(1f)); Text("›", color = c.muted) }
                    }
                }
                app.nobatet.ui.components.PasswordChangeCard(container)
                app.nobatet.ui.components.AccountLinks(container, "stylist")
            }
        }
    }
}
