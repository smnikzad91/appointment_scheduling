package app.nobatet.ui.salon

import app.nobatet.ui.components.Toasts
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import app.nobatet.data.AppContainer
import app.nobatet.data.OwnerSalon
import app.nobatet.data.Province
import app.nobatet.data.SalonPatch
import app.nobatet.data.ServiceLocation
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PickerField
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.currentLocation
import app.nobatet.util.persianLabel
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import kotlinx.serialization.builtins.ListSerializer
import org.osmdroid.config.Configuration
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.MapEventsOverlay
import org.osmdroid.views.overlay.Marker
import java.time.Instant

private val BRAND_SWATCHES = listOf("#a34a30", "#c2185b", "#8e44ad", "#1f6f78", "#2e7d32", "#b8860b", "#37474f")

/** How sign-up/settings describe a place (apps/web SERVICE_LOCATION_LABEL). */
private val PLACE_LABEL = linkedMapOf(
    ServiceLocation.IN_SALON to "در یک سالن، با نام خودم", ServiceLocation.STUDIO to "استودیو شخصی",
    ServiceLocation.HOME to "در منزل آرایشگر", ServiceLocation.CLIENT_HOME to "خدمات در منزل مشتری",
)

private fun color(hex: String) = runCatching { Color(android.graphics.Color.parseColor(hex)) }.getOrDefault(Color.Gray)

/** Iran's provinces and counties (packages/iran-locations, bundled as assets/iran_provinces.json). */
@Composable
internal fun rememberProvinces(container: AppContainer): List<Province> {
    val context = LocalContext.current
    return remember {
        runCatching {
            container.json.decodeFromString(ListSerializer(Province.serializer()), context.assets.open("iran_provinces.json").bufferedReader().readText())
        }.getOrDefault(emptyList())
    }
}

/** «تنظیمات»: photos, details, location (province/city/address/pin), brand colour, places (independent), plan. */
@Composable
fun SalonSettingsScreen(container: AppContainer, data: SalonData) {
    val salon = data.salon ?: return
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val provinces = rememberProvinces(container)
    val indie = salon.independent
    var name by remember(salon) { mutableStateOf(salon.name) }
    var description by remember(salon) { mutableStateOf(salon.description.orEmpty()) }
    var phone by remember(salon) { mutableStateOf(salon.phone) }
    var instagram by remember(salon) { mutableStateOf(salon.instagram.orEmpty()) }
    var province by remember(salon) { mutableStateOf(salon.province.orEmpty()) }
    var city by remember(salon) { mutableStateOf(salon.city) }
    var address by remember(salon) { mutableStateOf(salon.address) }
    var pin by remember(salon) { mutableStateOf(if (salon.latitude != null && salon.longitude != null) salon.latitude to salon.longitude else null) }
    var brand by remember(salon) { mutableStateOf(salon.brandColor) }
    var places by remember(salon) { mutableStateOf(salon.serviceLocations.toSet()) }
    var host by remember(salon) { mutableStateOf(salon.hostSalonName.orEmpty()) }
    var area by remember(salon) { mutableStateOf(salon.serviceArea.orEmpty()) }
    var picking by remember { mutableStateOf<String?>(null) } // "province" | "city"
    var busy by remember { mutableStateOf<String?>(null) }

    fun upload(field: String, uri: android.net.Uri) = scope.launch {
        busy = field
        try {
            val url = uploadPhoto(container, context, uri, "salons")
            data.salon = container.api.updateMySalon(if (field == "logo") SalonPatch(logoUrl = url) else SalonPatch(coverImageUrl = url))
        } catch (e: Exception) {
            Toasts.error(persianError(e, "آپلود عکس انجام نشد", container.json))
        } finally {
            busy = null
        }
    }
    val pickLogo = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let { u -> upload("logo", u) } }
    val pickCover = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { it?.let { u -> upload("cover", u) } }
    val image = PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) scope.launch { currentLocation(context)?.let { pin = it.latitude to it.longitude } ?: Toasts.error("موقعیت شما پیدا نشد") }
    }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Box {
                RemoteImage(salon.coverImageUrl, Modifier.fillMaxWidth().height(150.dp).clickable { pickCover.launch(image) })
                RemoteImage(salon.logoUrl, Modifier.padding(start = 20.dp).offset(y = 106.dp).size(84.dp).clip(if (indie) CircleShape else RoundedCornerShape(22.dp)).clickable { pickLogo.launch(image) })
            }
            Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 44.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row {
                    TextButton(onClick = { pickLogo.launch(image) }, enabled = busy == null) { Text(if (busy == "logo") "در حال آپلود..." else if (indie) "تغییر عکس شما" else "تغییر لوگو") }
                    TextButton(onClick = { pickCover.launch(image) }, enabled = busy == null) { Text(if (busy == "cover") "در حال آپلود..." else "تغییر کاور") }
                }
                data.subscription?.let { sub ->
                    AppCard {
                        SectionTitle("اشتراک")
                        Text(sub.plan?.name ?: "بدون پلن", color = c.ink)
                        sub.expiresAt?.let { Muted("تا ${Instant.parse(it).toSalonDateTime(salon.timezone).toLocalDate().persianLabel()}" + if (sub.status == "expired") "، به پایان رسیده" else "") }
                        if (!indie) Muted("آرایشگر فعال: ${sub.stylists.active.toString().toPersianDigits()}" + (sub.stylists.limit?.let { " از ${it.toString().toPersianDigits()}" } ?: ""))
                        Muted("پیامک این ماه: ${sub.sms.sent.toString().toPersianDigits()}" + (sub.sms.limit?.let { " از ${it.toString().toPersianDigits()}" } ?: ""))
                    }
                }
                AppCard {
                    SectionTitle(if (indie) "اطلاعات شما" else "اطلاعات سالن")
                    OutlinedTextField(name, { name = it.take(100) }, label = { Text(if (indie) "نام کاری" else "نام سالن") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(description, { description = it.take(1000) }, label = { Text("درباره") }, minLines = 3, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(phone, { phone = it.take(20) }, label = { Text("تلفن تماس") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(instagram, { instagram = it.take(60) }, label = { Text("اینستاگرام") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
                if (indie) AppCard {
                    SectionTitle("محل ارائه خدمات")
                    PLACE_LABEL.forEach { (loc, label) ->
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { places = if (loc in places) places - loc else places + loc }) {
                            Checkbox(checked = loc in places, onCheckedChange = { places = if (it) places + loc else places - loc })
                            Text(label, color = c.ink)
                        }
                    }
                    if (ServiceLocation.IN_SALON in places) OutlinedTextField(host, { host = it.take(100) }, label = { Text("نام سالن محل کار") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    if (ServiceLocation.CLIENT_HOME in places) OutlinedTextField(area, { area = it.take(200) }, label = { Text("محدوده خدمات در منزل") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                }
                AppCard {
                    SectionTitle("موقعیت")
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PickerField("استان", province.ifEmpty { "انتخاب کنید" }, Modifier.weight(1f)) { picking = "province" }
                        PickerField("شهر / شهرستان", city.ifEmpty { "ابتدا استان" }, Modifier.weight(1f)) { if (province.isNotEmpty()) picking = "city" }
                    }
                    OutlinedTextField(address, { address = it.take(300) }, label = { Text("آدرس دقیق") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                    Muted("روی نقشه بزنید تا محل مشخص شود.")
                    PinMap(pin, provinces.firstOrNull { it.name == province }?.center) { pin = it }
                    TextButton(onClick = {
                        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                            scope.launch { currentLocation(context)?.let { pin = it.latitude to it.longitude } ?: Toasts.error("موقعیت شما پیدا نشد") }
                        } else permission.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                    }) { Text("موقعیت من") }
                }
                AppCard {
                    SectionTitle("رنگ برند")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        BRAND_SWATCHES.forEach { hex ->
                            Box(
                                Modifier.size(36.dp).clip(CircleShape).background(color(hex))
                                    .border(if (hex.equals(brand, true)) 3.dp else 0.dp, c.ink, CircleShape).clickable { brand = hex },
                            )
                        }
                    }
                }
                PrimaryButton(if (busy == "save") "در حال ذخیره..." else "ذخیره تغییرات", enabled = busy == null) {
                    when {
                        name.isBlank() -> scope.launch { Toasts.error("نام را وارد کنید") }
                        indie && places.isEmpty() -> scope.launch { Toasts.error("محل ارائه خدمات را انتخاب کنید") }
                        else -> scope.launch {
                            busy = "save"
                            runCatching {
                                container.api.updateMySalon(
                                    SalonPatch(
                                        name = name.trim(), description = description.trim(), phone = phone.trim(), instagram = instagram.trim(),
                                        province = province.ifEmpty { null }, city = city.ifEmpty { null }, address = address.trim(),
                                        latitude = pin?.first, longitude = pin?.second, brandColor = brand,
                                        serviceLocations = if (indie) places.toList() else null,
                                        hostSalonName = if (indie) host.trim() else null, serviceArea = if (indie) area.trim() else null,
                                    ),
                                )
                            }.onSuccess { data.salon = it; Toasts.success("تغییرات ذخیره شد") }
                                .onFailure { Toasts.error(persianError(it, "ذخیره تغییرات انجام نشد", container.json)) }
                            busy = null
                        }
                    }
                }
                app.nobatet.ui.components.PasswordChangeCard(container)
                app.nobatet.ui.components.AccountLinks(container, if (indie) "independent" else "owner")
            }
        }
    }

    picking?.let { what ->
        val options = if (what == "province") provinces.map { it.name } else provinces.firstOrNull { it.name == province }?.cities.orEmpty()
        var query by remember(what) { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { picking = null },
            title = { Text(if (what == "province") "استان" else "شهر / شهرستان") },
            text = {
                Column {
                    OutlinedTextField(query, { query = it }, placeholder = { Text("جستجو") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    LazyColumn(Modifier.heightIn(max = 360.dp)) {
                        items(options.filter { query.isBlank() || it.contains(query.trim()) }) { o ->
                            Text(o, color = c.ink, modifier = Modifier.fillMaxWidth().clickable {
                                if (what == "province") { if (o != province) city = ""; province = o; picking = "city" } else { city = o; picking = null }
                            }.padding(vertical = 12.dp))
                        }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { picking = null }) { Text("بستن") } },
        )
    }
}

/** A map to drop the salon's pin (OpenStreetMap, like the web's LocationPicker). */
@Composable
internal fun PinMap(pin: Pair<Double, Double>?, provinceCenter: List<Double>?, onPin: (Pair<Double, Double>) -> Unit) {
    val center = pin?.let { GeoPoint(it.first, it.second) }
        ?: provinceCenter?.takeIf { it.size == 2 }?.let { GeoPoint(it[0], it[1]) }
        ?: GeoPoint(35.6892, 51.389)
    AndroidView(
        modifier = Modifier.fillMaxWidth().height(220.dp).clip(RoundedCornerShape(16.dp)),
        factory = { ctx ->
            Configuration.getInstance().userAgentValue = ctx.packageName
            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                controller.setZoom(if (pin != null) 16.0 else 11.0)
                controller.setCenter(center)
            }
        },
        update = { map ->
            map.overlays.clear()
            map.overlays.add(MapEventsOverlay(object : MapEventsReceiver {
                override fun singleTapConfirmedHelper(p: GeoPoint): Boolean { onPin(p.latitude to p.longitude); return true }
                override fun longPressHelper(p: GeoPoint): Boolean = false
            }))
            pin?.let { (lat, lng) ->
                map.overlays.add(Marker(map).apply { position = GeoPoint(lat, lng); setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM) })
                map.controller.animateTo(GeoPoint(lat, lng))
            }
            map.invalidate()
        },
        onRelease = { it.onDetach() },
    )
}
