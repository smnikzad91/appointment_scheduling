package app.nobatet.ui.customer

import app.nobatet.ui.components.SecondaryButton
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.nobatet.data.SalonDetail
import app.nobatet.data.ServiceLocation
import app.nobatet.data.TimeSlot
import app.nobatet.data.label
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.RemoteImage
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatClock
import app.nobatet.util.formatDuration
import app.nobatet.util.formatToman
import app.nobatet.util.isWeekend
import app.nobatet.util.jalaliMonthName
import app.nobatet.util.persianLabel
import app.nobatet.util.persianName
import app.nobatet.util.salonToday
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits

/** The booking sheet, step by step, as on the web (signed in: no contact/OTP steps). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BookingSheet(vm: SalonViewModel, salon: SalonDetail, b: BookingState, onSeeBookings: () -> Unit) {
    val c = LocalAppColors.current
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(onDismissRequest = vm::closeBooking, sheetState = sheet, containerColor = c.bg, dragHandle = null) {
        Column(Modifier.fillMaxHeight(0.92f).navigationBarsPadding()) {
            // header: back, step title, close
            Row(Modifier.fillMaxWidth().padding(8.dp), verticalAlignment = Alignment.CenterVertically) {
                if (b.step != BookingStep.SUCCESS) IconButton(onClick = vm::back) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = "مرحله قبل") }
                else Spacer(Modifier.width(48.dp))
                Text(b.step.title, style = MaterialTheme.typography.titleMedium, color = c.ink, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
                IconButton(onClick = vm::closeBooking) { Icon(Icons.Outlined.Close, contentDescription = "بستن") }
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                when (b.step) {
                    BookingStep.SERVICES -> ServicesStep(vm, salon, b)
                    BookingStep.STYLIST -> StylistStep(vm, b)
                    BookingStep.DATETIME -> DateTimeStep(vm, salon, b)
                    BookingStep.PLACE -> PlaceStep(vm, salon, b)
                    BookingStep.SUMMARY -> SummaryStep(vm, salon, b)
                    BookingStep.SUCCESS -> SuccessStep(salon, b)
                }
                Spacer(Modifier.height(8.dp))
            }
            Box(Modifier.padding(16.dp)) {
                when (b.step) {
                    BookingStep.SUMMARY -> {
                        val checking = b.wallet == null && !b.walletFailed
                        val short = vm.walletShort()
                        val prepay = vm.prepayment()
                        PrimaryButton(
                            when {
                                b.submitting -> "در حال ثبت نوبت..."
                                checking -> "در حال بررسی کیف پول..."
                                short > 0 -> "اول کیف پول را شارژ کنید"
                                prepay > 0 -> "پرداخت ${formatToman(prepay)} از کیف پول و ثبت رزرو"
                                else -> "ثبت نوبت"
                            },
                            enabled = !b.submitting && !checking && short == 0, onClick = vm::submit,
                        )
                    }
                    BookingStep.SUCCESS -> PrimaryButton("مشاهده نوبت‌های من", onClick = onSeeBookings)
                    else -> PrimaryButton("ادامه", onClick = vm::next)
                }
            }
        }
    }
}

@Composable
private fun Choice(selected: Boolean, onClick: () -> Unit, content: @Composable () -> Unit) {
    val c = LocalAppColors.current
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(20.dp)).background(if (selected) c.accentSoft else c.card)
            .border(if (selected) 2.dp else 1.dp, if (selected) c.accent else c.line, RoundedCornerShape(20.dp)).clickable(onClick = onClick).padding(14.dp),
    ) { content() }
}

@Composable
private fun ServicesStep(vm: SalonViewModel, salon: SalonDetail, b: BookingState) {
    val c = LocalAppColors.current
    // opened from a stylist's card: only what they do (the web's «همه خدمات سالن» clears it)
    val stylist = salon.stylists.firstOrNull { it.id == b.stylistId }
    if (stylist != null && !salon.independent) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Muted("خدمات ${stylist.displayName}", Modifier.weight(1f))
            AppTextButton(onClick = { vm.chooseStylist(null) }) { Text("همه خدمات سالن") }
        }
    }
    salon.activeServices.filter { s -> stylist == null || salon.independent || stylist.services.any { it.serviceId == s.id } }.forEach { s ->
        Choice(s.id in b.serviceIds, onClick = { vm.toggleService(s.id) }) {
            Column {
                Text(s.name, color = c.ink, style = MaterialTheme.typography.titleSmall)
                Muted("${formatDuration(s.durationMinutes)}، ${formatToman(s.priceToman)}")
            }
        }
    }
}

@Composable
private fun StylistStep(vm: SalonViewModel, b: BookingState) {
    val c = LocalAppColors.current
    Choice(b.stylistId == null, onClick = { vm.chooseStylist(null) }) { Text("فرقی نمی‌کند", color = c.ink, style = MaterialTheme.typography.titleSmall) }
    vm.eligibleStylists().forEach { st ->
        Choice(b.stylistId == st.id, onClick = { vm.chooseStylist(st.id) }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                RemoteImage(st.avatarUrl, Modifier.size(44.dp).clip(CircleShape))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text(st.displayName, color = c.ink, style = MaterialTheme.typography.titleSmall)
                    Muted("${formatDuration(vm.totalDuration(st.id))}، ${formatToman(vm.totalPrice(st.id))}")
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DateTimeStep(vm: SalonViewModel, salon: SalonDetail, b: BookingState) {
    val c = LocalAppColors.current
    val today = salonToday(salon.timezone)
    val days = (0L until 14L).map { today.plusDays(it) }
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), contentPadding = PaddingValues(vertical = 4.dp)) {
        items(days, key = { it.toString() }) { d ->
            val selected = d == b.date
            val j = d.toJalali()
            Column(
                Modifier.width(64.dp).clip(RoundedCornerShape(18.dp)).background(if (selected) c.accent else c.card)
                    .border(1.dp, if (selected) c.accent else c.line, RoundedCornerShape(18.dp)).clickable { vm.chooseDate(d) }.padding(vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val fg = if (selected) c.accentInk else if (d.isWeekend) c.danger else c.ink
                Text(if (d == today) "امروز" else d.dayOfWeek.persianName(), color = fg, style = MaterialTheme.typography.labelMedium)
                Text(j.day.toString().toPersianDigits(), color = fg, style = MaterialTheme.typography.titleMedium)
                Text(jalaliMonthName(j.month), color = fg, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
    when {
        // the web's slot skeleton: two rows of time-shaped placeholders
        b.slotsLoading -> FlowRow(Modifier.padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(8) { app.nobatet.ui.components.SkeletonBlock(Modifier.width(76.dp).height(40.dp), RoundedCornerShape(14.dp)) }
        }
        b.slots.none { it.available } -> Column(Modifier.padding(vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Muted("در این روز ساعت خالی وجود ندارد؛ روز دیگری را انتخاب کنید.")
            // the web's WaitlistButton
            SecondaryButton(onClick = vm::joinWaitlist) { Text("اگر وقتی خالی شد خبرم کن") }
        }
        else -> listOf("صبح" to (0 until 12 * 60), "ظهر" to (12 * 60 until 16 * 60), "عصر" to (16 * 60 until 24 * 60)).forEach { (label, range) ->
            val slots = b.slots.filter { it.startMinute in range }
            if (slots.isNotEmpty()) {
                Muted(label)
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    slots.forEach { slot -> SlotChip(slot, selected = b.startMinute == slot.startMinute) { vm.chooseTime(slot.startMinute) } }
                }
            }
        }
    }
}

@Composable
private fun SlotChip(slot: TimeSlot, selected: Boolean, onClick: () -> Unit) {
    val c = LocalAppColors.current
    val bg = when { selected -> c.accent; slot.available -> c.card; else -> Color.Transparent }
    val fg = when { selected -> c.accentInk; slot.available -> c.ink; else -> c.muted.copy(alpha = 0.5f) }
    Text(
        formatClock(slot.startMinute), color = fg, style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.Center,
        modifier = Modifier.width(76.dp).clip(RoundedCornerShape(14.dp)).background(bg).border(1.dp, if (selected) c.accent else c.line, RoundedCornerShape(14.dp))
            .then(if (slot.available) Modifier.clickable(onClick = onClick) else Modifier).padding(vertical = 10.dp),
    )
}

@Composable
private fun PlaceStep(vm: SalonViewModel, salon: SalonDetail, b: BookingState) {
    val c = LocalAppColors.current
    salon.serviceLocations.forEach { loc ->
        Choice(b.place == loc, onClick = { vm.choosePlace(loc) }) { Text(loc.label(salon.hostSalonName), color = c.ink, style = MaterialTheme.typography.titleSmall) }
    }
    if (b.place == ServiceLocation.CLIENT_HOME) {
        AppTextField(
            value = b.visitAddress, onValueChange = vm::setVisitAddress, modifier = Modifier.fillMaxWidth(), minLines = 2,
            label = { Text("نشانی شما") }, placeholder = { Text("شهر، خیابان، کوچه، پلاک، طبقه") },
        )
    }
}

@Composable
private fun SummaryStep(vm: SalonViewModel, salon: SalonDetail, b: BookingState) {
    val c = LocalAppColors.current
    val stylist = salon.stylists.firstOrNull { it.id == b.stylistId }
    SectionTitle(salon.name)
    SummaryLine("خدمات", salon.services.filter { it.id in b.serviceIds }.joinToString("، ") { it.name })
    if (!salon.independent) SummaryLine("متخصص", stylist?.displayName ?: "فرقی نمی‌کند")
    b.date?.let { d -> SummaryLine("زمان", "${d.persianLabel()}، ساعت ${formatClock(b.startMinute ?: 0)}") }
    if (salon.independent) b.place?.let { SummaryLine("محل", it.label(salon.hostSalonName) + if (it == ServiceLocation.CLIENT_HOME) ": ${b.visitAddress.trim()}" else "") }
    SummaryLine("مدت", formatDuration(vm.totalDuration()))
    SummaryLine("مبلغ", (if (b.stylistId == null && !salon.independent) "از " else "") + formatToman(vm.totalPrice()))
    // Online bookings pre-pay part of the price from the wallet (the only way to pay); short of
    // balance, a top-up of the difference right here, then the summary reads the wallet again.
    LaunchedEffect(Unit) { vm.loadWallet() }
    val wallet = b.wallet
    val prepay = vm.prepayment()
    if (wallet != null && prepay > 0) {
        SummaryLine("پیش‌پرداخت", "${formatToman(prepay)} از کیف پول (${wallet.prepaymentPercent.toString().toPersianDigits()}٪)")
        SummaryLine("در محل", formatToman(vm.totalPrice() - prepay))
        SummaryLine("کیف پول", formatToman(wallet.balanceToman))
        Muted(
            (if (b.stylistId == null && !salon.independent) "مبلغ نهایی با آرایشگری که تعیین می‌شود قطعی می‌شود. " else "") +
                "اگر نوبت لغو شود، پیش‌پرداخت کامل به کیف پول شما برمی‌گردد.",
        )
    }
    val short = vm.walletShort()
    if (short > 0) {
        Text("موجودی کیف پول برای پیش‌پرداخت کافی نیست؛ حداقل ${formatToman(short)} شارژ کنید.", color = c.ink, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
        app.nobatet.ui.wallet.WalletTopUp(vm.container, suggestedToman = maxOf(10_000, (short + 999) / 1000 * 1000), onPaid = vm::loadWallet)
    }
    AppTextField(b.notes, vm::setNotes, label = { Text("یادداشت برای سالن (اختیاری)") }, minLines = 2, modifier = Modifier.fillMaxWidth())
    Muted("نوبت پس از تایید آرایشگر قطعی می‌شود و پیامک تایید برایتان ارسال می‌شود.")
}

@Composable
private fun SummaryLine(label: String, value: String) {
    val c = LocalAppColors.current
    Row(Modifier.fillMaxWidth()) {
        Text(label, color = c.muted, modifier = Modifier.width(72.dp))
        Text(value, color = c.ink, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun SuccessStep(salon: SalonDetail, b: BookingState) {
    val c = LocalAppColors.current
    Column(Modifier.fillMaxWidth().padding(vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = c.confirmed, modifier = Modifier.size(64.dp))
        Text("نوبت شما ثبت شد!", style = MaterialTheme.typography.titleLarge, color = c.ink)
        b.date?.let { Muted("${it.persianLabel()}، ساعت ${formatClock(b.startMinute ?: 0)}، ${salon.name}") }
        Muted("پس از تایید آرایشگر پیامک تایید برایتان ارسال می‌شود.")
    }
}
