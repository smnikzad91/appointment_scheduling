package app.nobatet.ui.customer

import androidx.compose.foundation.clickable
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

    Column(Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = s.query, onValueChange = vm::setQuery, singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("نام سالن، آرایشگر یا خدمت") },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null) },
            shape = RoundedCornerShape(16.dp),
        )
        Row(Modifier.padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(null to "همه", SalonKind.SALON to "سالن‌ها", SalonKind.INDEPENDENT to "آرایشگران مستقل").forEach { (kind, label) ->
                FilterChip(
                    selected = s.kind == kind, onClick = { vm.setKind(kind) }, label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(selectedContainerColor = c.accentSoft, selectedLabelColor = c.accent),
                )
            }
        }
        when {
            s.loading -> Loading()
            s.error != null -> LoadError(s.error!!, vm::retry)
            s.items.isEmpty() -> Empty("سالنی پیدا نشد", "عبارت دیگری را جستجو کنید.")
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
        Spacer(Modifier.height(2.dp))
    }
}
