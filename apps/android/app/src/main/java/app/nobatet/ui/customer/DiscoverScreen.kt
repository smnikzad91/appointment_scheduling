package app.nobatet.ui.customer

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
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
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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

/** «کشف سالن» — search salons and independent stylists. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DiscoverScreen(container: AppContainer, onOpenSalon: (String) -> Unit) {
    val vm: DiscoverViewModel = viewModel(factory = viewModelFactory { initializer { DiscoverViewModel(container) } })
    val s by vm.state.collectAsStateWithLifecycle()
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    fun locate() {
        vm.setLocating(true)
        scope.launch {
            val loc = currentLocation(context)
            if (loc == null) {
                vm.setLocating(false)
                snackbar.showSnackbar("موقعیت شما پیدا نشد؛ مکان‌یاب گوشی را روشن کنید")
            } else {
                vm.setNear(loc.latitude, loc.longitude)
            }
        }
    }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { granted ->
        if (granted.values.any { it }) locate() else scope.launch { snackbar.showSnackbar("برای «نزدیک من» اجازه دسترسی به موقعیت لازم است") }
    }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = s.query, onValueChange = vm::setQuery, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("نام سالن، آرایشگر یا خدمت") },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            shape = RoundedCornerShape(16.dp),
        )
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            val chipColors = FilterChipDefaults.filterChipColors(selectedContainerColor = c.accentSoft, selectedLabelColor = c.accent)
            FilterChip(
                selected = s.near != null, colors = chipColors,
                label = { Text(if (s.locating) "در حال یافتن موقعیت..." else "نزدیک من") },
                onClick = {
                    when {
                        s.near != null -> vm.clearNear()
                        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED -> locate()
                        else -> permission.launch(arrayOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION))
                    }
                },
            )
            listOf(null to "همه", SalonKind.SALON to "سالن‌ها", SalonKind.INDEPENDENT to "آرایشگران مستقل").forEach { (kind, label) ->
                FilterChip(selected = s.kind == kind, onClick = { vm.setKind(kind) }, label = { Text(label) }, colors = chipColors)
            }
            FilterChip(selected = s.showMap, onClick = { vm.setShowMap(!s.showMap) }, label = { Text(if (s.showMap) "فهرست" else "نقشه") }, colors = chipColors)
        }
        when {
            s.loading -> Loading()
            s.error != null -> LoadError(s.error!!, vm::retry)
            s.items.isEmpty() -> Empty("سالنی پیدا نشد", "عبارت دیگری را جستجو کنید.")
            s.showMap -> SalonsMap(s.items, s.near, onOpenSalon)
            else -> LazyColumn(
                Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(s.items, key = { it.id }) { SalonCardRow(it) { onOpenSalon(it.slug) } }
                if (s.items.size < s.total) item {
                    TextButton(onClick = vm::loadMore, enabled = !s.loadingMore, modifier = Modifier.fillMaxWidth()) {
                        Text(if (s.loadingMore) "در حال بارگذاری..." else "نمایش بیشتر")
                    }
                }
            }
        }
    }
    SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }
}

/** The results on OpenStreetMap (as the web's SalonsMap); a pin opens the salon. */
@Composable
private fun SalonsMap(items: List<SalonCard>, near: Pair<Double, Double>?, onOpenSalon: (String) -> Unit) {
    val context = LocalContext.current
    val pinned = items.filter { it.latitude != null && it.longitude != null }
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { ctx ->
            Configuration.getInstance().userAgentValue = ctx.packageName
            MapView(ctx).apply {
                setTileSource(TileSourceFactory.MAPNIK)
                setMultiTouchControls(true)
                zoomController.setVisibility(org.osmdroid.views.CustomZoomButtonsController.Visibility.NEVER)
                controller.setZoom(12.0)
            }
        },
        update = { map ->
            map.overlays.clear()
            pinned.forEach { salon ->
                map.overlays.add(Marker(map).apply {
                    position = GeoPoint(salon.latitude!!, salon.longitude!!)
                    title = salon.name
                    setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_BOTTOM)
                    setOnMarkerClickListener { _, _ -> onOpenSalon(salon.slug); true }
                })
            }
            val center = near?.let { GeoPoint(it.first, it.second) }
                ?: pinned.firstOrNull()?.let { GeoPoint(it.latitude!!, it.longitude!!) }
                ?: GeoPoint(35.6892, 51.389) // Tehran
            map.controller.setCenter(center)
            map.invalidate()
        },
        onRelease = { it.onDetach() },
    )
    if (pinned.isEmpty()) Muted("هیچ‌کدام از نتایج روی نقشه مشخص نشده‌اند.", Modifier.padding(16.dp))
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
