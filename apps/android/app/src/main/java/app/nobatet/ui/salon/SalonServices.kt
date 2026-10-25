package app.nobatet.ui.salon

import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppSwitch
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowDownward
import androidx.compose.material.icons.outlined.ArrowUpward
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
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
    var categories by remember { mutableStateOf<List<OwnerCategory>>(emptyList()) }
    var editing by remember { mutableStateOf<OwnerService?>(null) }
    var adding by remember { mutableStateOf(false) }
    var managing by remember { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(Unit) { categories = runCatching { container.api.myCategories() }.getOrDefault(emptyList()) }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PrimaryButton("افزودن خدمت", Modifier.weight(1f)) { adding = true }
                    AppTextButton(onClick = { managing = true }) { Text("دسته‌بندی‌ها") }
                }
            }
            if (data.services.isEmpty()) item { Empty("هنوز خدمتی تعریف نکرده‌اید", "خدمات و قیمت‌ها را اضافه کنید تا مشتری‌ها نوبت بگیرند.") }
            val groups = categories.sortedBy { it.order }.map { it as OwnerCategory? to data.services.filter { s -> s.categoryId == it.id } } +
                listOf(null to data.services.filter { s -> s.categoryId == null || categories.none { it.id == s.categoryId } })
            groups.filter { it.second.isNotEmpty() || it.first != null }.forEach { (cat, services) ->
                item(key = "c" + (cat?.id ?: "none")) {
                        SectionTitle(cat?.name ?: "بدون دسته‌بندی", Modifier.padding(top = 8.dp))
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
    }

    if (adding || editing != null) {
        ServiceDialog(container, categories, editing, onCategoryAdded = { categories = categories + it }, onDismiss = { adding = false; editing = null }) { msg ->
            adding = false; editing = null; data.loadCatalog()
            scope.launch { Toasts.success(msg) }
        }
    }
    if (managing) CategoriesDialog(
        container, categories, data.services,
        onChange = { categories = it },
        // services of a deleted category lose it: reload them
        onDeleted = { data.loadCatalog() },
        onDismiss = { managing = false },
    )
}

/** Next `order` for a new category: after the last one. */
private fun nextOrder(categories: List<OwnerCategory>) = (categories.maxOfOrNull { it.order } ?: -1) + 1

/**
 * «دسته‌بندی‌ها» (the web's categories sheet): add, rename (tap a row), reorder with the arrows, delete.
 * Categories only group services on the booking page; services without one show under «سایر خدمات».
 */
@Composable
private fun CategoriesDialog(
    container: AppContainer,
    categories: List<OwnerCategory>,
    services: List<OwnerService>,
    onChange: (List<OwnerCategory>) -> Unit,
    onDeleted: () -> Unit,
    onDismiss: () -> Unit,
) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var newName by remember { mutableStateOf("") }
    var editing by remember { mutableStateOf<OwnerCategory?>(null) }
    var deleting by remember { mutableStateOf<OwnerCategory?>(null) }
    var busy by remember { mutableStateOf(false) }
    val sorted = categories.sortedBy { it.order }

    /** Swap with a neighbour; orders are rewritten 0..n so older equal values sort out too. */
    fun move(index: Int, delta: Int) {
        val target = index + delta
        if (busy || target !in sorted.indices) return
        val next = sorted.toMutableList().also { it[index] = sorted[target]; it[target] = sorted[index] }.mapIndexed { i, cat -> cat.copy(order = i) }
        val changed = next.filter { n -> categories.firstOrNull { it.id == n.id }?.order != n.order }
        onChange(next)
        busy = true
        scope.launch {
            runCatching { changed.forEach { container.api.updateCategory(it.id, CategoryInput(order = it.order)) } }
                .onFailure {
                    Toasts.error("تغییر ترتیب انجام نشد")
                    runCatching { container.api.myCategories() }.onSuccess(onChange)
                }
            busy = false
        }
    }

    val e = editing
    AppDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(if (e != null) "ویرایش دسته" else "دسته‌بندی‌ها") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (e != null) {
                    AppTextField(e.name, { editing = e.copy(name = it.take(40)) }, label = { Text("نام دسته") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                    AppTextButton(enabled = !busy, onClick = { deleting = e }) { Text("حذف دسته", color = c.danger) }
                } else {
                    Muted("دسته‌بندی اختیاری است و فقط خدمات را در صفحه رزرو گروه‌بندی می‌کند؛ خدمات بدون دسته زیر «سایر خدمات» نمایش داده می‌شوند.")
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AppTextField(newName, { newName = it.take(40) }, placeholder = { Text("نام دسته جدید، مثلاً ناخن") }, singleLine = true, modifier = Modifier.weight(1f))
                        AppTextButton(enabled = newName.isNotBlank() && !busy, onClick = {
                            busy = true
                            scope.launch {
                                runCatching { container.api.addCategory(CategoryInput(newName.trim(), nextOrder(categories))) }
                                    .onSuccess { onChange(categories + it); newName = "" }
                                    .onFailure { Toasts.error(persianError(it, "افزودن دسته‌بندی انجام نشد", container.json)) }
                                busy = false
                            }
                        }) { Text("افزودن") }
                    }
                    if (sorted.isEmpty()) Muted("هنوز دسته‌بندی ندارید.")
                    sorted.forEachIndexed { i, cat ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f).clickable { editing = cat }.padding(vertical = 8.dp)) {
                                Text(cat.name, color = c.ink, style = MaterialTheme.typography.titleSmall)
                                Muted("${services.count { it.categoryId == cat.id }.toString().toPersianDigits()} خدمت")
                            }
                            IconButton(onClick = { move(i, -1) }, enabled = i > 0 && !busy) {
                                Icon(Icons.Outlined.ArrowUpward, contentDescription = "بردن ${cat.name} به بالا", tint = c.muted)
                            }
                            IconButton(onClick = { move(i, 1) }, enabled = i < sorted.lastIndex && !busy) {
                                Icon(Icons.Outlined.ArrowDownward, contentDescription = "بردن ${cat.name} به پایین", tint = c.muted)
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            if (e != null) AppTextButton(enabled = !busy, onClick = {
                val name = e.name.trim()
                if (name.isEmpty()) return@AppTextButton Toasts.error("نام دسته را بنویسید")
                busy = true
                scope.launch {
                    runCatching { container.api.updateCategory(e.id, CategoryInput(name = name)) }
                        .onSuccess { saved -> onChange(categories.map { if (it.id == saved.id) saved else it }); editing = null }
                        .onFailure { Toasts.error(persianError(it, "ذخیره دسته‌بندی انجام نشد", container.json)) }
                    busy = false
                }
            }) { Text("ذخیره نام") }
            else AppTextButton(onClick = onDismiss, enabled = !busy) { Text("بستن") }
        },
        dismissButton = { if (e != null) AppTextButton(onClick = { editing = null }, enabled = !busy) { Text("همه دسته‌ها") } },
    )

    deleting?.let { cat ->
        AppDialog(
            onDismissRequest = { deleting = null },
            title = { Text("حذف دسته") },
            text = { Text("دسته «${cat.name}» حذف شود؟ خدمات آن بدون دسته می‌مانند و همچنان قابل رزرو هستند.", color = c.ink) },
            confirmButton = {
                AppTextButton(enabled = !busy, onClick = {
                    busy = true
                    scope.launch {
                        runCatching { container.api.deleteCategory(cat.id) }
                            .onSuccess { onChange(categories.filter { it.id != cat.id }); editing = null; deleting = null; onDeleted() }
                            .onFailure { Toasts.error(persianError(it, "حذف دسته‌بندی انجام نشد", container.json)) }
                        busy = false
                    }
                }) { Text("حذف", color = c.danger) }
            },
            dismissButton = { AppTextButton(onClick = { deleting = null }) { Text("انصراف") } },
        )
    }
}

/** Quick picks for a service's length; owners typed hours into the minutes box (3 for «3 hours»). */
private val DURATION_CHIPS = listOf(15, 30, 45, 60, 90, 120, 180, 240)

/** Below these the save asks first — seen in real data as hours typed as minutes and prices in thousands. */
private const val SHORT_DURATION_MINUTES = 10
private const val LOW_PRICE_TOMAN = 10_000

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ServiceDialog(
    container: AppContainer,
    categories: List<OwnerCategory>,
    editing: OwnerService?,
    onCategoryAdded: (OwnerCategory) -> Unit,
    onDismiss: () -> Unit,
    onDone: (String) -> Unit,
) {
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
    // «+ دسته جدید»: typed here, created and picked for this service
    var inlineCategory by remember { mutableStateOf<String?>(null) }
    // a suspicious duration or price waiting for «با همین ذخیره شود؟» (the web's confirm): its question,
    // and what to mark answered on «ذخیره شود»
    var asking by remember { mutableStateOf<Pair<String, () -> Unit>?>(null) }
    var confirmedShort by remember { mutableStateOf(false) }
    var confirmedLow by remember { mutableStateOf(false) }

    fun save() {
        val d = duration.toIntOrNull()
        val p = price.toIntOrNull()
        val days = rebookDays.toIntOrNull()
        when {
            name.isBlank() -> error = "نام خدمت را وارد کنید"
            d == null || d <= 0 -> error = "مدت خدمت را وارد کنید"
            p == null -> error = "قیمت را وارد کنید"
            d < SHORT_DURATION_MINUTES && !confirmedShort -> {
                val n = d.toString().toPersianDigits()
                asking = "مدت این خدمت $n دقیقه است. اگر منظورتان $n ساعت است، ${(d * 60).toString().toPersianDigits()} دقیقه وارد کنید.\n\nبا همین $n دقیقه ذخیره شود؟" to { confirmedShort = true }
            }
            p < LOW_PRICE_TOMAN && !confirmedLow ->
                asking = "قیمت این خدمت ${formatToman(p)} است. اگر منظورتان ${formatToman(p * 1000)} است، قیمت را کامل به تومان وارد کنید.\n\nبا همین قیمت ذخیره شود؟" to { confirmedLow = true }
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
    }

    AppDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (editing == null) "افزودن خدمت" else "ویرایش خدمت") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                AppTextField(name, { name = it.take(100) }, label = { Text("نام خدمت") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    AppChip(selected = categoryId == null, onClick = { categoryId = null }, label = { Text("بدون دسته") })
                    categories.sortedBy { it.order }.forEach { cat -> AppChip(selected = categoryId == cat.id, onClick = { categoryId = cat.id }, label = { Text(cat.name) }) }
                    AppChip(selected = false, onClick = { inlineCategory = "" }, label = { Text("+ دسته جدید") })
                }
                inlineCategory?.let { typed ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AppTextField(typed, { inlineCategory = it.take(40) }, placeholder = { Text("نام دسته جدید") }, singleLine = true, modifier = Modifier.weight(1f))
                        AppTextButton(enabled = typed.isNotBlank() && !busy, onClick = {
                            busy = true
                            scope.launch {
                                runCatching { container.api.addCategory(CategoryInput(typed.trim(), nextOrder(categories))) }
                                    .onSuccess { onCategoryAdded(it); categoryId = it.id; inlineCategory = null }
                                    .onFailure { Toasts.error(persianError(it, "افزودن دسته‌بندی انجام نشد", container.json)) }
                                busy = false
                            }
                        }) { Text("افزودن") }
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val minutes = duration.toIntOrNull() ?: 0
                    AppTextField(duration.toPersianDigits(), { duration = it.normalizeDigits().filter(Char::isDigit).take(3); confirmedShort = false }, label = { Text("مدت (دقیقه)") }, singleLine = true,
                        supportingText = if (minutes >= 60) ({ Text(formatDuration(minutes)) }) else null,
                        modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    AppTextField(price.toPersianDigits(), { price = it.normalizeDigits().filter(Char::isDigit).take(9); confirmedLow = false }, label = { Text("قیمت (تومان)") }, singleLine = true,
                        modifier = Modifier.weight(1f), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    DURATION_CHIPS.forEach { m ->
                        AppChip(selected = duration.toIntOrNull() == m, onClick = { duration = m.toString(); confirmedShort = false }, label = { Text(formatDuration(m)) })
                    }
                }
                AppTextField(description, { description = it.take(500) }, label = { Text("توضیح (اختیاری)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("پیامک «وقت نوبت بعدی»", color = c.ink, modifier = Modifier.weight(1f))
                    AppSwitch(checked = rebookOn, onCheckedChange = { rebookOn = it })
                }
                if (rebookOn) AppTextField(rebookDays.toPersianDigits(), { rebookDays = it.normalizeDigits().filter(Char::isDigit).take(3) }, label = { Text("چند روز بعد از نوبت") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                if (editing != null) Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("فعال (قابل رزرو)", color = c.ink, modifier = Modifier.weight(1f))
                    AppSwitch(checked = active, onCheckedChange = { active = it })
                }
                error?.let { Text(it, color = c.danger) }
                if (editing != null) AppTextButton(onClick = {
                    scope.launch {
                        runCatching { container.api.deleteService(editing.id) }.onSuccess { onDone("خدمت حذف شد") }
                            .onFailure { error = persianError(it, "حذف خدمت انجام نشد", container.json) }
                    }
                }) { Text("حذف خدمت", color = c.danger) }
            }
        },
        confirmButton = {
            AppTextButton(enabled = !busy, onClick = { save() }) { Text("ذخیره") }
        },
        dismissButton = { AppTextButton(onClick = onDismiss) { Text("انصراف") } },
    )

    asking?.let { (question, answered) ->
        AppDialog(
            onDismissRequest = { asking = null },
            title = { Text("مطمئن هستید؟") },
            text = { Text(question, color = c.ink) },
            confirmButton = {
                AppTextButton(onClick = {
                    // that check is answered; save() moves on to the next one
                    answered()
                    asking = null
                    save()
                }) { Text("ذخیره شود") }
            },
            dismissButton = { AppTextButton(onClick = { asking = null }) { Text("اصلاح") } },
        )
    }
}
