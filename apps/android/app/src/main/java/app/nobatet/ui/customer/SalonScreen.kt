package app.nobatet.ui.customer

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import kotlinx.coroutines.launch
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.nobatet.data.AppContainer
import app.nobatet.data.SalonDetail
import app.nobatet.data.SalonService
import app.nobatet.data.label
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatDuration
import app.nobatet.util.formatToman

/** The public salon page (/s/<slug>) with its booking sheet. */
@Composable
fun SalonScreen(container: AppContainer, slug: String, onBack: () -> Unit, onSeeBookings: () -> Unit, prefill: BookingPrefill? = null) {
    val vm: SalonViewModel = viewModel(key = "salon-$slug", factory = viewModelFactory { initializer { SalonViewModel(container, slug) } })
    val s by vm.state.collectAsStateWithLifecycle()
    val c = LocalAppColors.current
    val snackbar = remember { SnackbarHostState() }
    LaunchedEffect(vm) { vm.errors.collect { snackbar.showSnackbar(it) } }
    BackHandler(onBack = onBack)
    // a prefilled booking opens once the salon has loaded
    var prefillUsed by rememberSaveable { mutableStateOf(false) }
    LaunchedEffect(s.salon != null) {
        if (s.salon != null && prefill != null && !prefillUsed) {
            prefillUsed = true
            vm.openBookingPrefilled(prefill)
        }
    }
    val favoriteIds by container.favorites.ids.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { container.favorites.ensureLoaded() }

    Box(Modifier.fillMaxSize().background(c.bg)) {
        when {
            s.loading -> Loading()
            s.error != null -> LoadError(s.error!!, vm::load)
            s.salon != null -> SalonContent(s.salon!!, onBook = vm::openBooking)
        }
        IconButton(
            onClick = onBack,
            modifier = Modifier.statusBarsPadding().padding(8.dp).align(Alignment.TopStart),
            colors = IconButtonDefaults.iconButtonColors(containerColor = c.card.copy(alpha = 0.85f), contentColor = c.ink),
        ) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "بازگشت") }
        s.salon?.let { salon ->
            val saved = salon.id in favoriteIds
            IconButton(
                onClick = {
                    scope.launch {
                        runCatching { container.favorites.toggle(salon.id) }.onFailure { snackbar.showSnackbar("ذخیره سالن انجام نشد") }
                    }
                },
                modifier = Modifier.statusBarsPadding().padding(8.dp).align(Alignment.TopEnd),
                colors = IconButtonDefaults.iconButtonColors(containerColor = c.card.copy(alpha = 0.85f), contentColor = if (saved) c.danger else c.ink),
            ) {
                Icon(if (saved) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder, contentDescription = if (saved) "حذف از محبوب‌ها" else "افزودن به محبوب‌ها")
            }
        }
        if (s.salon != null && !s.booking.open) {
            PrimaryButton("رزرو نوبت", Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(16.dp)) { vm.openBooking() }
        }
        if (s.salon != null && s.booking.open) {
            BookingSheet(vm, s.salon!!, s.booking, onSeeBookings = { vm.closeBooking(); onSeeBookings() })
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).statusBarsPadding().padding(12.dp))
    }
}

@Composable
private fun SalonContent(salon: SalonDetail, onBook: (String?) -> Unit) {
    val c = LocalAppColors.current
    val byCategory = salon.activeServices.groupBy { it.categoryId }
    val categories = salon.serviceCategories.sortedBy { it.order }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 96.dp)) {
        item {
            Box {
                RemoteImage(salon.coverImageUrl, Modifier.fillMaxWidth().height(200.dp))
                RemoteImage(
                    salon.logoUrl, Modifier.padding(start = 20.dp).offset(y = 160.dp).size(84.dp)
                        .clip(if (salon.independent) CircleShape else RoundedCornerShape(24.dp)).border(3.dp, c.bg, if (salon.independent) CircleShape else RoundedCornerShape(24.dp)),
                )
            }
            Spacer(Modifier.height(52.dp))
            Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(salon.name, style = MaterialTheme.typography.headlineSmall, color = c.ink)
                if (salon.independent) Text("آرایشگر مستقل", color = c.accent, style = MaterialTheme.typography.labelLarge)
                val where = buildList {
                    if (salon.independent) salon.serviceLocations.forEach { add(it.label(salon.hostSalonName)) }
                    add(listOfNotNull(salon.province, salon.city).joinToString("، "))
                }.joinToString("، ")
                Muted(where)
                salon.address?.let { Muted(it) }
                salon.description?.takeIf { it.isNotBlank() }?.let { Text(it, color = c.ink, modifier = Modifier.padding(top = 8.dp)) }
            }
        }
        item { SectionTitle("خدمات", Modifier.padding(start = 20.dp, top = 24.dp, bottom = 8.dp)) }
        val groups = categories.map { it.name to byCategory[it.id].orEmpty() } + listOf("سایر خدمات" to byCategory[null].orEmpty())
        groups.filter { it.second.isNotEmpty() }.forEach { (name, services) ->
            item { Muted(name, Modifier.padding(start = 20.dp, top = 8.dp, bottom = 4.dp)) }
            items(services, key = { it.id }) { ServiceRow(it) { onBook(it.id) } }
        }
        if (!salon.independent && salon.stylists.isNotEmpty()) {
            item { SectionTitle("متخصصان", Modifier.padding(start = 20.dp, top = 24.dp, bottom = 8.dp)) }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(salon.stylists, key = { it.id }) { st ->
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(88.dp)) {
                            RemoteImage(st.avatarUrl, Modifier.size(72.dp).clip(CircleShape))
                            Text(st.displayName, color = c.ink, style = MaterialTheme.typography.labelLarge, maxLines = 1)
                        }
                    }
                }
            }
        }
        if (salon.galleryImages.isNotEmpty()) {
            item { SectionTitle("نمونه کارها", Modifier.padding(start = 20.dp, top = 24.dp, bottom = 8.dp)) }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(salon.galleryImages, key = { it.id }) { img -> RemoteImage(img.url, Modifier.size(140.dp).clip(RoundedCornerShape(16.dp))) }
                }
            }
        }
    }
}

@Composable
private fun ServiceRow(service: SalonService, onBook: () -> Unit) {
    val c = LocalAppColors.current
    AppCard(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(service.name, style = MaterialTheme.typography.titleSmall, color = c.ink)
                Muted("${formatDuration(service.durationMinutes)}، ${formatToman(service.priceToman)}")
            }
            OutlinedButton(onClick = onBook, shape = RoundedCornerShape(999.dp)) { Text("رزرو") }
        }
    }
}
