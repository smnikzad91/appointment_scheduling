package app.nobatet.ui.salon

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.CategoryInput
import app.nobatet.data.OwnerCategory
import app.nobatet.data.OwnerService
import app.nobatet.data.jsonBody
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatDuration
import app.nobatet.util.formatToman
import app.nobatet.util.normalizeDigits
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch

/** «خدمات»: categories and services (price, duration, «وقت نوبت بعدی» SMS, on/off). */
@Composable
fun SalonServicesScreen(container: AppContainer, data: SalonData) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var categories by remember { mutableStateOf<List<OwnerCategory>>(emptyList()) }
    var editing by remember { mutableStateOf<OwnerService?>(null) }
    var adding by remember { mutableStateOf(false) }
    var newCategory by remember { mutableStateOf<String?>(null) }
    androidx.compose.runtime.LaunchedEffect(Unit) { categories = runCatching { container.api.myCategories() }.getOrDefault(emptyList()) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("افزودن خدمت", Modifier.weight(1f)) { adding = true }
                    TextButton(onClick = { newCategory = "" }) { Text("دسته‌بندی تازه") }
                }
            }
            if (data.services.isEmpty()) item { Empty("هنوز خدمتی تعریف نکرده‌اید", "خدمات و قیمت‌ها را اضافه کنید تا مشتری‌ها نوبت بگیرند.") }
            val groups = categories.sortedBy { it.order }.map { it as OwnerCategory? to data.services.filter { s -> s.categoryId == it.id } } +
                listOf(null to data.services.filter { s -> s.categoryId == null || categories.none { it.id == s.categoryId } })
            groups.filter { it.second.isNotEmpty() || it.first != null }.forEach { (cat, services) ->
                item(key = "c" + (cat?.id ?: "none")) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                        SectionTitle(cat?.name ?: "بدون دسته‌بندی", Modifier.weight(1f))
                        if (cat != null && services.isEmpty()) TextButton(onClick = {
                            scope.launch { runCatching { container.api.deleteCategory(cat.id) }.onSuccess { categories = categories - cat }.onFailure { snackbar.showSnackbar(persianError(it, "حذف دسته‌بندی انجام نشد", container.json)) } }
                        }) { Text("حذف", color = c.danger) }
                    }
                }
                items(services, key = { it.id }) { s ->
                    AppCard(Modifier.clickable { editing = s }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(s.name, color = if (s.active) c.ink else c.muted, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                            if (!s.active) Muted("غیرفعال")
                        }
                        Muted("${formatDuration(s.durationMinutes)}، ${formatToman(s.priceToman)}")
                    }
                }
            }
        }
        SnackbarHost(snackbar, Modifier.align(Alignment.TopCenter).padding(12.dp))
    }

    if (adding || editing != null) {
        ServiceDialog(container, categories, editing, onDismiss = { adding = false; editing = null }) { msg ->
            adding = false; editing = null; data.loadCatalog()
            scope.launch { snackbar.showSnackbar(msg) }
        }
    }
    newCategory?.let { name ->
        AlertDialog(
            onDismissRequest = { newCategory = null },
            title = { Text("دسته‌بندی تازه") },
            text = { OutlinedTextField(name, { newCategory = it.take(60) }, label = { Text("نام دسته") }, singleLine = true) },
            confirmButton = {
                TextButton(enabled = name.isNotBlank(), onClick = {
                    scope.launch {
                        runCatching { container.api.addCategory(CategoryInput(name.trim(), categories.size)) }
                            .onSuccess { categories = categories + it; newCategory = null }
                            .onFailure { snackbar.showSnackbar(persianError(it, "ساخت دسته‌بندی انجام نشد", container.json)) }
                    }
                }) { Text("ذخیره") }
            },
            dismissButton = { TextButton(onClick = { newCategory = null }) { Text("انصراف") } },
        )
    }
}

@Composable
private fun ServiceDialog(container: AppContainer, categories: List<OwnerCategory>, editing: OwnerService?, onDismiss: () -> Unit, onDone: (String) -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf(editing?.name.orEmpty()) }
    var description by remember { mutableStateOf(editing?.description.orEmpty()) }
    var categoryId by remember { mutableStateOf(editing?.categoryId) }
    var duration by remember { mutableStateOf(editing?.durationMinutes?.toString() ?: "30") }
    var price by remember { mutableStateOf(editing?.priceToman?.toString().orEmpty()) }
    var active by remember { mutableStateOf(editing?.active ?: true) }
    // on for new services, as the web (column default and form)
    var rebookOn by remember { mutableStateOf(editing?.rebookReminderEnabled ?: true) }
    var rebookDays by remember { mutableStateOf((editing?.rebookReminderDays ?: 30).toString()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "افزودن خدمت" else "ویرایش خدمت") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it.take(100) }, label = { Text("نام خدمت") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                if (categories.isNotEmpty()) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(selected = categoryId == null, onClick = { categoryId = null }, label = { Text("بدون دسته") })
                    categories.forEach { cat -> FilterChip(selected = categoryId == cat.id, onClick = { categoryId = cat.id }, label = { Text(cat.name) }) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(duration.toPersianDigits(), { duration = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("مدت (دقیقه)") }, singleLine = true,
                        modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    OutlinedTextField(price.toPersianDigits(), { price = it.normalizeDigits().filter(Char::isDigit).take(9) }, label = { Text("قیمت (تومان)") }, singleLine = true,
                        modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }
                OutlinedTextField(description, { description = it.take(500) }, label = { Text("توضیح (اختیاری)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("پیامک «وقت نوبت بعدی»", color = c.ink, modifier = Modifier.weight(1f))
                    Switch(checked = rebookOn, onCheckedChange = { rebookOn = it }, colors = SwitchDefaults.colors(checkedTrackColor = c.accent))
                }
                if (rebookOn) OutlinedTextField(rebookDays.toPersianDigits(), { rebookDays = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("چند روز بعد از نوبت") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                if (editing != null) Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("فعال (قابل رزرو)", color = c.ink, modifier = Modifier.weight(1f))
                    Switch(checked = active, onCheckedChange = { active = it }, colors = SwitchDefaults.colors(checkedTrackColor = c.accent))
                }
                error?.let { Text(it, color = c.danger) }
                if (editing != null) TextButton(onClick = {
                    scope.launch {
                        runCatching { container.api.deleteService(editing.id) }.onSuccess { onDone("خدمت حذف شد") }
                            .onFailure { error = persianError(it, "حذف خدمت انجام نشد", container.json) }
                    }
                }) { Text("حذف خدمت", color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val d = duration.toIntOrNull()
                val p = price.toIntOrNull()
                val days = rebookDays.toIntOrNull()
                when {
                    name.isBlank() -> error = "نام خدمت را وارد کنید"
                    d == null || d <= 0 -> error = "مدت خدمت را وارد کنید"
                    p == null -> error = "قیمت را وارد کنید"
                    rebookOn && (days == null || days !in 1..365) -> error = "فاصله یادآوری باید بین ۱ تا ۳۶۵ روز باشد"
                    else -> scope.launch {
                        busy = true
                        val body = jsonBody(
                            "name" to name.trim(), "description" to description.trim().ifEmpty { null }, "categoryId" to categoryId,
                            "durationMinutes" to d, "priceToman" to p, "rebookReminderEnabled" to rebookOn, "rebookReminderDays" to (days ?: 30),
                        )
                        runCatching {
                            if (editing == null) container.api.addService(kotlinx.serialization.json.JsonObject(body.filterValues { it !is kotlinx.serialization.json.JsonNull }))
                            else container.api.updateService(editing.id, kotlinx.serialization.json.JsonObject(body + ("active" to kotlinx.serialization.json.JsonPrimitive(active))))
                        }.onSuccess { onDone(if (editing == null) "خدمت اضافه شد" else "خدمت ذخیره شد") }
                            .onFailure { error = persianError(it, "ذخیره خدمت انجام نشد", container.json) }
                        busy = false
                    }
                }
            }) { Text("ذخیره") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
