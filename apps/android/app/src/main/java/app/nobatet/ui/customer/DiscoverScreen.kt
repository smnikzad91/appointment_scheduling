package app.nobatet.ui.customer

import app.nobatet.ui.panels.tourTarget
import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import app.nobatet.util.currentLocation
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.nobatet.data.AppContainer
import app.nobatet.data.SalonCard
import app.nobatet.data.ClientGender
import app.nobatet.data.SalonKind
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.toPersianDigits
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.ZoomOutMap
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import org.osmdroid.events.MapEventsReceiver
import org.osmdroid.util.BoundingBox
import org.osmdroid.views.overlay.MapEventsOverlay

/** «کشف سالن» — search salons and independent stylists. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(container: AppContainer, onOpenSalon: (String) -> Unit) {
    val vm: DiscoverViewModel = viewModel(factory = viewModelFactory { initializer { DiscoverViewModel(container) } })
    val s by vm.state.collectAsStateWithLifecycle()
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    fun locate() {
        vm.setLocating(true)
        scope.launch {
            val loc = currentLocation(context)
            if (loc == null) {
                vm.setLocating(false)
                Toasts.error("موقعیت شما پیدا نشد؛ مکان‌یاب گوشی را روشن کنید")
            } else {
                vm.setNear(loc.latitude, loc.longitude)
            }
        }
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) locate() else scope.launch { Toasts.error("برای «نزدیک من» اجازه دسترسی به موقعیت لازم است") }
    }

    // «نزدیک من»: ask for the location permission once, then find the phone
    fun findMe() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) locate()
        else permission.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
    }
    // the map is a view of the results, not a page: Back returns to the list
    BackHandler(enabled = s.showMap) { vm.setShowMap(false) }

    Column(Modifier.fillMaxSize()) {
        AppTextField(
            value = s.query, onValueChange = vm::setQuery, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp).tourTarget("salon-search"),
            placeholder = { Text("نام سالن، آرایشگر یا خدمت") },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            shape = RoundedCornerShape(16.dp),
        )
        // for بانوان / آقایان (as the web's SalonSearch)
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "بانوان و آقایان", ClientGender.WOMEN to ClientGender.WOMEN.label, ClientGender.MEN to ClientGender.MEN.label).forEach { (g, label) ->
                AppChip(selected = s.gender == g, onClick = { vm.setGender(g) }, label = { Text(label) })
            }
        }
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            AppChip(
                selected = s.near != null,
                label = { Text(if (s.locating) "در حال یافتن موقعیت..." else "نزدیک من") },
                onClick = { if (s.near != null) vm.clearNear() else findMe() },
                modifier = Modifier.tourTarget("near-me"),
            )
            listOf(null to "همه", SalonKind.SALON to "سالن‌ها", SalonKind.INDEPENDENT to "آرایشگران مستقل").forEach { (kind, label) ->
                AppChip(selected = s.kind == kind, onClick = { vm.setKind(kind) }, label = { Text(label) })
            }
        }
        // result count + list/map switch, always on screen (as the web's SalonSearch)
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            Muted(if (s.loading && s.items.isEmpty()) "در حال جستجو..." else "${s.total} سالن".toPersianDigits(), Modifier.weight(1f))
            ViewSwitch(s.showMap, vm::setShowMap)
        }
        when {
            s.error != null -> LoadError(s.error!!, vm::retry)
            s.showMap -> SalonsMap(
                items = s.items, total = s.total, near = s.near, loading = s.loading, loadingMore = s.loadingMore, locating = s.locating,
                onOpenSalon = onOpenSalon, onFindMe = ::findMe, onLoadMore = vm::loadMore, onShowList = { vm.setShowMap(false) },
            )
            s.loading -> Loading()
            s.items.isEmpty() -> Empty("سالنی پیدا نشد", "عبارت دیگری را جستجو کنید.", Modifier.padding(horizontal = 16.dp))
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(s.items, key = { it.id }) { SalonCardRow(it) { onOpenSalon(it.slug) } }
                if (s.items.size < s.total) item {
                    AppTextButton(onClick = vm::loadMore, enabled = !s.loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (s.loadingMore) "در حال بارگذاری..." else "نمایش بیشتر")
                    }
                }
            }
        }
    }
}

/** «فهرست | نقشه» segmented switch (the web's list/map tabs). */
@Composable
private fun ViewSwitch(showMap: Boolean, onChange: (Boolean) -> Unit) {
    val c = LocalAppColors.current
    Row(
        Modifier.clip(CircleShape).background(c.card).border(1.dp, c.line, CircleShape).padding(2.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        listOf(Triple(false, Icons.AutoMirrored.Outlined.List, "فهرست"), Triple(true, Icons.Outlined.Map, "نقشه")).forEach { (map, icon, label) ->
            val on = showMap == map
            Row(
                Modifier.height(36.dp).clip(CircleShape).background(if (on) c.ink else Color.Transparent)
                    .selectable(selected = on, role = Role.Tab, onClick = { onChange(map) }).padding(horizontal = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(icon, contentDescription = null, tint = if (on) c.bg else c.muted, modifier = Modifier.size(18.dp))
                Text(label, color = if (on) c.bg else c.muted, fontSize = 13.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * The results on OpenStreetMap (as the web's SalonsMap). A pin selects its salon: a card at the bottom
 * opens it; tapping the map clears it. The view fits every pin (and «نزدیک من») whenever the results
 * change, and otherwise stays where the customer moved it. Floating: «موقعیت من», «نمایش همه», and
 * «فهرست» at the bottom.
 */
@Composable
private fun SalonsMap(
    items: List<SalonCard>, total: Int, near: Pair<Double, Double>?, loading: Boolean, loadingMore: Boolean, locating: Boolean,
    onOpenSalon: (String) -> Unit, onFindMe: () -> Unit, onLoadMore: () -> Unit, onShowList: () -> Unit,
) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val density = LocalDensity.current.density
    val pinned = items.filter { it.latitude != null && it.longitude != null }
    var selectedId by remember { mutableStateOf<String?>(null) }
    val selected = pinned.firstOrNull { it.id == selectedId }
    // what the view was last fitted to; a new search (or «نمایش همه») fits again
    val fitKey = remember(pinned.map { it.id }, near) { Any() }
    var fitRequest by remember { mutableIntStateOf(0) }
    val fitted = remember { arrayOfNulls<Any>(1) }
    BackHandler(enabled = selected != null) { selectedId = null }

    val pin = remember(c.accent) { pinDrawable(context, c.accent.toArgb()) }
    val pinSelected = remember(c.ink) { pinDrawable(context, c.ink.toArgb()) }
    val meDot = remember { meDrawable(density) }
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val map = remember {
        Configuration.getInstance().userAgentValue = context.packageName
        MapView(context).apply {
            setTileSource(TileSourceFactory.MAPNIK)
            setMultiTouchControls(true)
            zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
            isTilesScaledToDpi = true
            minZoomLevel = 5.0
            controller.setZoom(12.0)
            controller.setCenter(GeoPoint(35.6892, 51.389)) // Tehran until the results arrive
        }
    }
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, e ->
            if (e == Lifecycle.Event.ON_RESUME) map.onResume() else if (e == Lifecycle.Event.ON_PAUSE) map.onPause()
        }
        lifecycle.addObserver(observer)
        map.onResume()
        onDispose { lifecycle.removeObserver(observer); map.onPause(); map.onDetach() }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { map },
            update = { m ->
                m.overlays.clear()
                // a tap on the map (not on a pin) closes the salon card
                m.overlays.add(MapEventsOverlay(object : MapEventsReceiver {
                    override fun singleTapConfirmedHelper(p: GeoPoint?): Boolean { selectedId = null; return true }
                    override fun longPressHelper(p: GeoPoint?) = false
                }))
                near?.let { (lat, lng) ->
                    m.overlays.add(Marker(m).apply {
                        position = GeoPoint(lat, lng); icon = meDot; title = "موقعیت شما"
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                        setOnMarkerClickListener { _, _ -> true }
                    })
                }
                pinned.forEach { salon ->
                    m.overlays.add(Marker(m).apply {
                        position = GeoPoint(salon.latitude!!, salon.longitude!!)
                        icon = if (salon.id == selectedId) pinSelected else pin
                        setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                        setOnMarkerClickListener { _, _ -> selectedId = salon.id; true }
                    })
                }
                val key = fitKey to fitRequest
                if (fitted[0] != key) {
                    fitted[0] = key
                    val points = pinned.map { GeoPoint(it.latitude!!, it.longitude!!) } + listOfNotNull(near?.let { GeoPoint(it.first, it.second) })
                    fit(m, points, density)
                }
                m.invalidate()
            },
        )

        // top: what isn't on the map
        val unpinned = items.size - pinned.size
        val note = when {
            loading -> "در حال جستجو..."
            items.isEmpty() -> "سالنی پیدا نشد؛ عبارت دیگری را جستجو کنید."
            items.size < total -> "${pinned.size} از $total نتیجه روی نقشه"
            unpinned > 0 -> "$unpinned سالن موقعیتش را ثبت نکرده و روی نقشه نیست"
            else -> null
        }
        if (note != null) Row(
            Modifier.align(Alignment.TopCenter).padding(top = 12.dp, start = 72.dp, end = 72.dp)
                .shadow(4.dp, CircleShape).clip(CircleShape).background(c.card).padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (loading) CircularProgressIndicator(Modifier.size(14.dp), color = c.accent, strokeWidth = 2.dp)
            Text(note.toPersianDigits(), color = c.ink, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (!loading && items.size < total) Text(
                if (loadingMore) "..." else "بیشتر",
                color = c.accent, fontSize = 13.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.clickable(enabled = !loadingMore, onClick = onLoadMore),
            )
        }

        // side buttons: find me, fit everything
        Column(Modifier.align(Alignment.TopEnd).padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            MapButton(Icons.Outlined.MyLocation, if (locating) "در حال یافتن موقعیت" else "موقعیت من", busy = locating) {
                if (near != null) fitTo(map, GeoPoint(near.first, near.second)) else onFindMe()
            }
            MapButton(Icons.Outlined.ZoomOutMap, "نمایش همه") { fitRequest++ }
        }

        // bottom: the selected salon, and the way back to the list
        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                Modifier.shadow(6.dp, CircleShape).clip(CircleShape).background(c.ink).clickable(onClick = onShowList)
                    .padding(horizontal = 18.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.AutoMirrored.Outlined.List, contentDescription = null, tint = c.bg, modifier = Modifier.size(18.dp))
                Text("نمایش فهرست", color = c.bg, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            selected?.let { salon ->
                Box(Modifier.shadow(8.dp, RoundedCornerShape(24.dp))) {
                    SalonCardRow(salon) { onOpenSalon(salon.slug) }
                    Icon(
                        Icons.Outlined.Close, contentDescription = "بستن", tint = c.muted,
                        modifier = Modifier.align(Alignment.TopStart).padding(8.dp).size(32.dp).clip(CircleShape)
                            .clickable { selectedId = null }.padding(6.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun MapButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, busy: Boolean = false, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Box(
        Modifier.size(44.dp).shadow(4.dp, CircleShape).clip(CircleShape).background(c.card).clickable(onClickLabel = label, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (busy) CircularProgressIndicator(Modifier.size(18.dp), color = c.accent, strokeWidth = 2.dp)
        else Icon(icon, contentDescription = label, tint = c.ink, modifier = Modifier.size(22.dp))
    }
}

/** Show every point: one is centred at street level, several fill the view (never closer than zoom 16). */
private fun fit(map: MapView, points: List<GeoPoint>, density: Float) {
    if (points.isEmpty()) return
    if (points.size == 1) return fitTo(map, points[0])
    val box = BoundingBox.fromGeoPointsSafe(points)
    val run = { map.zoomToBoundingBox(box, false, (56 * density).toInt(), 16.0, null); Unit }
    if (map.width > 0 && map.height > 0) run() else map.addOnFirstLayoutListener { _, _, _, _, _ -> run() }
}

private fun fitTo(map: MapView, point: GeoPoint) {
    map.controller.setZoom(15.0)
    map.controller.animateTo(point)
}

/** A round pin with a white ring and a short tail, in [color]. */
private fun pinDrawable(context: android.content.Context, color: Int): android.graphics.drawable.Drawable {
    val d = context.resources.displayMetrics.density
    val w = (30 * d).toInt(); val h = (40 * d).toInt()
    val bmp = android.graphics.Bitmap.createBitmap(w, h, android.graphics.Bitmap.Config.ARGB_8888)
    val canvas = android.graphics.Canvas(bmp)
    val paint = android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG)
    val r = w / 2f
    val tail = android.graphics.Path().apply { moveTo(r - 7 * d, r + 8 * d); lineTo(r, h.toFloat()); lineTo(r + 7 * d, r + 8 * d); close() }
    paint.color = color; canvas.drawPath(tail, paint); canvas.drawCircle(r, r, r, paint)
    paint.color = android.graphics.Color.WHITE; canvas.drawCircle(r, r, r * 0.42f, paint)
    return android.graphics.drawable.BitmapDrawable(context.resources, bmp)
}

/** «موقعیت شما»: a blue dot with a white ring. */
private fun meDrawable(density: Float) = android.graphics.drawable.GradientDrawable().apply {
    shape = android.graphics.drawable.GradientDrawable.OVAL
    setColor(0xFF2563EB.toInt())
    setStroke((3 * density).toInt(), android.graphics.Color.WHITE)
    setSize((18 * density).toInt(), (18 * density).toInt())
}

@Composable
private fun SalonCardRow(salon: SalonCard, onClick: () -> Unit) {
    val c = LocalAppColors.current
    AppCard(Modifier.clickable(onClick = onClick)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RemoteImage(salon.logoUrl ?: salon.coverImageUrl, Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(salon.name, style = MaterialTheme.typography.titleMedium, color = c.ink, maxLines = 1, overflow = TextOverflow.Ellipsis)
                val where = buildList {
                    if (salon.kind == SalonKind.INDEPENDENT) add("آرایشگر مستقل")
                    salon.clientGender?.let { add(it.badge) }
                    salon.hostSalonName?.takeIf { it.isNotBlank() }?.let { add("در $it") }
                    add(salon.city)
                }.joinToString("، ")
                Muted(where)
            }
            if (salon.rating != null) Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Star, contentDescription = null, tint = c.pending, modifier = Modifier.size(16.dp))
                Text("%.1f".format(salon.rating).toPersianDigits(), color = c.ink, style = MaterialTheme.typography.labelLarge)
            }
        }
        if (salon.services.isNotEmpty()) Muted(salon.services.take(3).joinToString("، "))
        salon.minPriceToman?.let { Text("از ${formatToman(it)}", color = c.accent, style = MaterialTheme.typography.labelLarge) }
        salon.distanceKm?.let { km ->
            Muted((if (salon.approximateLocation) "حدود " else "") + "%s کیلومتر".format(if (km < 10) "%.1f".format(km) else "%.0f".format(km)).toPersianDigits())
        }
        Spacer(Modifier.height(2.dp))
    }
}
