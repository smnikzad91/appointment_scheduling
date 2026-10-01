package app.nobatet.ui.salon

import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.Toasts
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.StaffAppointment
import app.nobatet.data.StatusUpdate
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Empty
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.staff.AppointmentBucket
import app.nobatet.ui.staff.AppointmentDetailSheet
import app.nobatet.ui.staff.AppointmentMonthView
import app.nobatet.ui.staff.AppointmentsView
import app.nobatet.ui.staff.AppointmentsViewSwitch
import app.nobatet.ui.staff.BucketChips
import app.nobatet.ui.staff.FilterPill
import app.nobatet.ui.staff.bucketOf
import app.nobatet.ui.staff.rememberAppointmentsView
import app.nobatet.ui.stylist.DayGroupedList
import app.nobatet.ui.staff.StaffAppointmentCard
import app.nobatet.ui.staff.StaffBookingSheet
import app.nobatet.ui.stylist.localDate
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.persianLabel
import app.nobatet.util.salonToday
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch
import java.time.Instant

/** The status sheet and booking sheets of the salon panel (the owner picks the stylist; independent: themselves). */
class SalonSheetsState {
    var selected by mutableStateOf<StaffAppointment?>(null)
    var editing by mutableStateOf<StaffAppointment?>(null)
    /** Creating: choosing a stylist (salon) or booking for this stylist id. */
    var choosingStylist by mutableStateOf(false)
    var creatingFor by mutableStateOf<String?>(null)
    var busy by mutableStateOf(false)

    fun startCreate(data: SalonData) {
        val salon = data.salon ?: return
        val only = data.stylists.singleOrNull { it.active }
        if (salon.independent || only != null) creatingFor = (only ?: data.stylists.firstOrNull())?.id else choosingStylist = true
    }
}

@Composable
fun SalonSheets(container: AppContainer, data: SalonData, sheets: SalonSheetsState) {
    val scope = rememberCoroutineScope()
    val salon = data.salon ?: return
    val c = LocalAppColors.current
    sheets.selected?.let { a ->
        AppointmentDetailSheet(
            a, salon.timezone, sheets.busy,
            onDismiss = { sheets.selected = null },
            onEdit = { sheets.selected = null; sheets.editing = a },
            onStatus = { status ->
                scope.launch {
                    sheets.busy = true
                    runCatching { container.api.setStatus(a.id, StatusUpdate(status)) }
                        .onSuccess { sheets.selected = null; data.loadAppointments() }
                        .onFailure { Toasts.error(persianError(it, "تغییر وضعیت نوبت انجام نشد، دوباره تلاش کنید", container.json)) }
                    sheets.busy = false
                }
            },
        )
    }
    if (sheets.choosingStylist) {
        AppDialog(
            onDismissRequest = { sheets.choosingStylist = false },
            title = { Text("نوبت با کدام آرایشگر؟") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    data.stylists.filter { it.active }.forEach { st ->
                        Text(st.displayName, color = c.ink, modifier = Modifier.clickable { sheets.choosingStylist = false; sheets.creatingFor = st.id }.padding(vertical = 10.dp))
                    }
                    if (data.stylists.none { it.active }) Muted("هنوز آرایشگر فعالی ندارید.")
                }
            },
            confirmButton = { AppTextButton(onClick = { sheets.choosingStylist = false }) { Text("انصراف") } },
        )
    }
    val stylistId = sheets.editing?.stylistId ?: sheets.creatingFor
    if (stylistId != null) {
        StaffBookingSheet(
            container, salon.slug, salon.timezone, stylistId, data.bookableFor(stylistId), sheets.editing,
            onDismiss = { sheets.editing = null; sheets.creatingFor = null },
            onSaved = { sheets.editing = null; sheets.creatingFor = null; data.loadAppointments() },
        )
    }
}

/** «نوبت‌ها» of the salon, as the web's: «فهرست / هفته / ماه», a stylist filter (salon), «+». */
@Composable
fun SalonAppointmentsScreen(data: SalonData, sheets: SalonSheetsState) {
    val c = LocalAppColors.current
    val salon = data.salon ?: return
    val tz = salon.timezone
    val today = salonToday(tz)
    val (view, setView) = rememberAppointmentsView()
    var bucket by rememberSaveable { mutableStateOf(AppointmentBucket.UPCOMING) }
    var stylistFilter by rememberSaveable { mutableStateOf<String?>(null) }
    val stylistName: (StaffAppointment) -> String? = { a -> if (salon.independent) null else a.stylist?.displayName }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            AppointmentsViewSwitch(view, setView, Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp))
            if (!salon.independent && data.stylists.size > 1) {
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterPill("همه آرایشگرها", stylistFilter == null) { stylistFilter = null }
                    data.stylists.forEach { st -> FilterPill(st.displayName, stylistFilter == st.id) { stylistFilter = st.id } }
                }
            }
            val list = data.appointments?.filter { stylistFilter == null || it.stylistId == stylistFilter }
            if (view == AppointmentsView.LIST && list != null) BucketChips(list, bucket) { bucket = it }
            when {
                list == null -> Loading()
                view == AppointmentsView.WEEK -> app.nobatet.ui.staff.WeekGrid(list, tz, today, Modifier.weight(1f)) { sheets.selected = it }
                view == AppointmentsView.MONTH -> AppointmentMonthView(list, tz, today, Modifier.weight(1f), stylistName) { sheets.selected = it }
                else -> {
                    val filtered = bucketOf(list, bucket)
                    if (filtered.isEmpty()) Empty(bucket.empty, modifier = Modifier.padding(16.dp))
                    else DayGroupedList(filtered, tz, today, Modifier.weight(1f), stylistName) { sheets.selected = it }
                }
            }
        }
        FloatingActionButton(onClick = { sheets.startCreate(data) }, containerColor = c.accent, contentColor = c.accentInk, modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp)) {
            Icon(Icons.Outlined.Add, contentDescription = "نوبت تازه")
        }
    }
}

enum class SalonPage(val title: String) { ACCOUNTING("حسابداری"), REVIEWS("نظرات مشتری‌ها"), GALLERY("گالری نمونه کارها"), SHARE("کیت معرفی") }

/** The salon home: today, what waits for confirmation, the plan notice, and the other pages. */
@Composable
fun SalonHomeScreen(data: SalonData, sheets: SalonSheetsState, onOpenPage: (SalonPage) -> Unit) {
    val c = LocalAppColors.current
    val salon = data.salon ?: return
    val tz = salon.timezone
    val today = salonToday(tz)
    val list = data.appointments.orEmpty()
    val todays = list.filter { it.localDate(tz) == today && it.status != AppointmentStatus.CANCELLED }.sortedBy { it.startAt }
    val pending = list.filter { it.status == AppointmentStatus.PENDING }.sortedBy { it.startAt }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (salon.status == "PENDING") item {
                AppCard { Text("در انتظار تایید پشتیبانی", color = c.pending, style = MaterialTheme.typography.titleSmall); Muted("پس از تایید، صفحه شما در جستجو نمایش داده می‌شود و نوبت آنلاین می‌گیرید.") }
            }
            data.subscription?.takeIf { it.status == "expired" }?.let { item { AppCard { Text("اشتراک سالن به پایان رسیده است", color = c.danger); Muted("پیامک‌ها ارسال نمی‌شوند؛ برای تمدید با پشتیبانی تماس بگیرید.") } } }
            if (data.appointments == null) item { app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(150.dp)) } else item {
                AppCard {
                    Muted("امروز، ${today.persianLabel()}")
                    Text("${todays.size.toString().toPersianDigits()} نوبت", style = MaterialTheme.typography.headlineSmall, color = c.ink)
                    Muted("درآمد پیش‌بینی امروز")
                    Text(formatToman(todays.filter { it.status != AppointmentStatus.NO_SHOW }.sumOf { it.priceToman }), color = c.accent, style = MaterialTheme.typography.titleLarge)
                }
            }
            if (pending.isNotEmpty()) {
                item { SectionTitle("منتظر تایید (${pending.size.toString().toPersianDigits()})") }
                items(pending, key = { "p" + it.id }) { a -> StaffAppointmentCard(a, tz, if (salon.independent) null else a.stylist?.displayName) { sheets.selected = a } }
            }
            item { SectionTitle("برنامه امروز") }
            if (data.appointments == null) items(2) { app.nobatet.ui.components.SkeletonBlock(Modifier.fillMaxWidth().height(80.dp)) }
            else if (todays.isEmpty()) item { Muted("امروز نوبتی ندارید.") }
            items(todays, key = { "t" + it.id }) { a -> StaffAppointmentCard(a, tz, if (salon.independent) null else a.stylist?.displayName) { sheets.selected = a } }
            item { SectionTitle("بیشتر", Modifier.padding(top = 8.dp)) }
            items(SalonPage.entries) { page ->
                AppCard(Modifier.clickable { onOpenPage(page) }) {
                    Row(verticalAlignment = Alignment.CenterVertically) { Text(page.title, color = c.ink, modifier = Modifier.weight(1f)); Text("›", color = c.muted) }
                }
            }
        }
    }
}
