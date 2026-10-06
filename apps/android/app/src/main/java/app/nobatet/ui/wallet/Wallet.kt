package app.nobatet.ui.wallet

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.data.AppContainer
import app.nobatet.data.NewTopUp
import app.nobatet.data.NewWithdrawal
import app.nobatet.data.TopUp
import app.nobatet.data.WalletInfo
import app.nobatet.data.WalletTx
import app.nobatet.data.Withdrawal
import app.nobatet.data.formatCardNumber
import app.nobatet.data.persianError
import app.nobatet.data.walletTxLabel
import app.nobatet.data.withdrawalStatusLabel
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.AppTextField
import app.nobatet.ui.components.LoadError
import app.nobatet.ui.components.Loading
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SecondaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.components.Toasts
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatAmount
import app.nobatet.util.normalizeDigits
import app.nobatet.util.persianDateTime
import app.nobatet.util.persianLabel
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.time.Instant

// «کیف پول» for every role (apps/web components/app/WalletScreen.tsx): automatic top-up (card to
// card, confirmed by the bank SMS), the balance (or «بدهی»), withdrawal to a Sheba and the history.

private fun fa(n: Long) = formatAmount(n)
private fun fa(n: Int) = formatAmount(n.toLong())

private fun instant(iso: String?): Instant? = iso?.let { runCatching { Instant.parse(it) }.getOrNull() }

/** The whole wallet page: top-up, balance + withdrawal, history. */
@Composable
fun WalletScreen(container: AppContainer) {
    var wallet by remember { mutableStateOf<WalletInfo?>(null) }
    var failed by remember { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    LaunchedEffect(reload) {
        runCatching { container.web.wallet() }.onSuccess { wallet = it; failed = false }.onFailure { if (wallet == null) failed = true }
    }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        WalletTopUp(container, onPaid = { reload++ })
        val w = wallet
        when {
            w != null -> {
                BalanceCard(w.balanceToman)
                WalletWithdraw(container, w.balanceToman) { reload++ }
                SectionTitle("گردش کیف پول")
                if (w.items.isEmpty()) Muted("هنوز تراکنشی ثبت نشده است.")
                w.items.forEach { TxRow(it) }
            }
            failed -> LoadError("کیف پول بارگذاری نشد", onRetry = { reload++ })
            else -> Loading(rows = 3)
        }
    }
}

@Composable
private fun BalanceCard(balance: Int) {
    val c = LocalAppColors.current
    AppCard {
        Muted(if (balance < 0) "بدهی کیف پول" else "موجودی کیف پول")
        Text("${fa(kotlin.math.abs(balance))} تومان", color = if (balance < 0) c.danger else c.ink, fontSize = 26.sp, fontWeight = FontWeight.Bold)
        if (balance < 0) Muted("با شارژ کیف پول یا درآمد بعدی تسویه می‌شود؛ تا آن موقع برداشت و خرید از کیف پول ممکن نیست.")
    }
}

@Composable
private fun TxRow(t: WalletTx) {
    val c = LocalAppColors.current
    AppCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(walletTxLabel(t.kind), color = c.ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                t.detail?.let { Muted(it) }
                t.note?.takeIf { it.isNotBlank() }?.let { Muted(it) }
                t.appointment?.let { a -> instant(a.startAt)?.let { Muted("نوبت ${a.salonName}، ${it.toSalonDateTime(a.timezone).persianDateTime()}") } }
                instant(t.createdAt)?.let { Muted(it.toSalonDateTime(null).persianDateTime()) }
            }
            Column(horizontalAlignment = Alignment.End) {
                // no minus sign next to a Persian amount (it drifts in RTL): colour + واریز/برداشت
                Text("${fa(kotlin.math.abs(t.amountToman))} تومان", color = if (t.amountToman >= 0) c.done else c.danger, fontWeight = FontWeight.Bold)
                Muted(if (t.amountToman >= 0) "واریز" else "برداشت")
            }
        }
    }
}

/** Home screens of the salon and stylist panels: the balance, tap to open the wallet. */
@Composable
fun WalletBalanceCard(container: AppContainer, onOpen: () -> Unit) {
    val c = LocalAppColors.current
    var balance by remember { mutableStateOf<Int?>(null) }
    var failed by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { runCatching { container.api.walletMe().balanceToman }.onSuccess { balance = it }.onFailure { failed = true } }
    // always shown (as on the web), so the wallet is never out of sight: «…» while loading, a plain
    // «کیف پول» link if the balance couldn't be read — tapping opens the wallet either way
    val b = balance
    AppCard(Modifier.clickable(onClick = onOpen)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(Icons.Outlined.AccountBalanceWallet, null, tint = c.accent)
            Column(Modifier.weight(1f)) {
                Muted(if (b != null && b < 0) "بدهی کیف پول" else "موجودی کیف پول")
                Text(
                    when {
                        b != null -> "${fa(kotlin.math.abs(b))} تومان"
                        failed -> "برای دیدن موجودی بزنید"
                        else -> "…"
                    },
                    color = if (b != null && b < 0) c.danger else c.ink, fontWeight = FontWeight.Bold, fontSize = if (b != null) 18.sp else 15.sp,
                )
            }
            Text("کیف پول", color = c.accent, fontWeight = FontWeight.Bold)
        }
    }
}

private val QUICK = listOf(100_000, 200_000, 500_000, 1_000_000)

/**
 * Automatic top-up (apps/web WalletTopUp): an amount → the card and the exact rial amount (both must
 * be copied before «واریز کردم»), polled every 8 s until the bank SMS confirms it. Also embedded in
 * the booking summary and the pay-balance sheet with [suggestedToman].
 */
@Composable
fun WalletTopUp(container: AppContainer, suggestedToman: Int? = null, onPaid: () -> Unit = {}) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val paid by rememberUpdatedState(onPaid)
    var available by remember { mutableStateOf<Boolean?>(null) }
    var topUp by remember { mutableStateOf<TopUp?>(null) }
    var amount by remember { mutableStateOf(suggestedToman?.toString() ?: "") }
    var busy by remember { mutableStateOf(false) }
    var copiedCard by remember { mutableStateOf(false) }
    var copiedAmount by remember { mutableStateOf(false) }
    var paidClicked by remember { mutableStateOf(false) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        runCatching { container.web.topUps() }
            .onSuccess { l -> available = l.available; l.items.firstOrNull { it.status == "pending" }?.let { topUp = it } }
            .onFailure { available = false }
    }
    // while one is pending: tick the countdown, check it every 8 s
    val pendingId = topUp?.takeIf { it.status == "pending" }?.id
    LaunchedEffect(pendingId) {
        if (pendingId == null) return@LaunchedEffect
        var n = 0
        while (true) {
            delay(1000); now = System.currentTimeMillis()
            if (++n % 8 != 0) continue
            val t = runCatching { container.web.topUp(pendingId) }.getOrNull() ?: continue
            topUp = t
            if (t.status == "paid") {
                Toasts.success("${fa(t.creditedToman ?: 0)} تومان به کیف پول شما اضافه شد")
                paid()
            }
            if (t.status != "pending") break
        }
    }

    fun copy(text: String) {
        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("nobatet", text))
    }

    when (available) {
        null -> return
        false -> {
            AppCard { Muted("شارژ کیف پول فعلاً در دسترس نیست؛ کمی بعد دوباره سر بزنید.") }
            return
        }
        true -> Unit
    }
    val t = topUp
    val card = t?.card
    if (t != null && t.status == "pending" && card != null) {
        val left = ((instant(t.expiresAt)?.toEpochMilli() ?: now) - now).coerceAtLeast(0) / 1000
        AppCard {
            SectionTitle("واریز کارت به کارت")
            Muted("دقیقاً همین مبلغ را به همین کارت واریز کنید. چند ریال آخر مبلغ، پرداخت شما را شناسایی می‌کند؛ با مبلغ دیگری، موجودی خودکار اضافه نمی‌شود.")
            CopyRow("شماره کارت — ${card.bankName}، ${card.ownerName}", formatCardNumber(card.cardNumber).toPersianDigits(), null, copiedCard) {
                copy(card.cardNumber); copiedCard = true
            }
            CopyRow("مبلغ دقیق (ریال)", fa(t.payableRial.toLongOrNull() ?: 0), "حدود ${fa((t.payableRial.toLongOrNull() ?: 0) / 10)} تومان", copiedAmount) {
                copy(t.payableRial); copiedAmount = true
            }
            if (!paidClicked) {
                PrimaryButton(if (copiedCard && copiedAmount) "واریز کردم" else "اول شماره کارت و مبلغ را کپی کنید", Modifier.fillMaxWidth(), enabled = copiedCard && copiedAmount) { paidClicked = true }
            } else {
                Text(
                    "در انتظار پیامک بانک… معمولاً کمتر از یک دقیقه طول می‌کشد؛ بعد از تایید، موجودی خودکار اضافه می‌شود.",
                    color = c.ink, fontSize = 14.sp,
                    modifier = Modifier.fillMaxWidth().background(c.accentSoft, RoundedCornerShape(16.dp)).padding(horizontal = 16.dp, vertical = 12.dp),
                )
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Muted("مهلت واریز: " + "%02d:%02d".format(left / 60, left % 60).toPersianDigits(), Modifier.weight(1f))
                AppTextButton(onClick = {
                    scope.launch { runCatching { container.web.cancelTopUp(t.id) }; topUp = null }
                }) { Text("لغو", color = c.danger) }
            }
        }
        return
    }
    AppCard {
        SectionTitle("افزایش خودکار موجودی")
        if (t?.status == "paid") Text("${fa(t.creditedToman ?: 0)} تومان به کیف پول شما اضافه شد.", color = c.done, fontSize = 14.sp)
        if (t?.status == "expired") Text("مهلت آن درخواست تمام شد. اگر واریز کرده‌اید، با پشتیبانی تماس بگیرید.", color = c.danger, fontSize = 14.sp)
        AppTextField(
            if (amount.isEmpty()) "" else fa(amount.toLong()),
            { amount = it.normalizeDigits().filter(Char::isDigit).take(9).trimStart('0') },
            label = { Text("مبلغ (تومان)") }, placeholder = { Text("۲۰۰٬۰۰۰") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            QUICK.forEach { q -> AppChip(amount == q.toString(), { amount = q.toString() }, { Text(fa(q)) }) }
        }
        PrimaryButton("ادامه", Modifier.fillMaxWidth(), enabled = amount.isNotEmpty() && !busy) {
            busy = true
            scope.launch {
                runCatching { container.web.createTopUp(NewTopUp(amount.toInt())) }
                    .onSuccess { topUp = it; copiedCard = false; copiedAmount = false; paidClicked = false; now = System.currentTimeMillis() }
                    .onFailure { Toasts.error(persianError(it, "ساخت درخواست انجام نشد", container.json)) }
                busy = false
            }
        }
    }
}

@Composable
private fun CopyRow(label: String, value: String, hint: String?, done: Boolean, onCopy: () -> Unit) {
    val c = LocalAppColors.current
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Muted(label)
        Row(
            Modifier.fillMaxWidth().background(c.card2, RoundedCornerShape(16.dp)).clickable(onClick = onCopy).padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(value, color = c.ink, fontSize = 17.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f), style = androidx.compose.ui.text.TextStyle(textDirection = TextDirection.Ltr))
            Icon(if (done) Icons.Outlined.Check else Icons.Outlined.ContentCopy, null, tint = if (done) c.done else c.accent)
            Text(if (done) " کپی شد" else " کپی", color = if (done) c.done else c.accent, fontWeight = FontWeight.Bold)
        }
        hint?.let { Muted(it) }
    }
}

/** «برداشت از کیف پول» (apps/web WalletWithdraw): one pending at a time; leaves the balance at once. */
@Composable
private fun WalletWithdraw(container: AppContainer, balance: Int, onChange: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var items by remember { mutableStateOf<List<Withdrawal>?>(null) }
    var min by remember { mutableIntStateOf(50_000) }
    var reload by remember { mutableIntStateOf(0) }
    var open by remember { mutableStateOf(false) }
    LaunchedEffect(reload) {
        runCatching { container.web.withdrawals() }.onSuccess { items = it.items; min = it.minToman }.onFailure { items = emptyList() }
    }
    val list = items ?: return
    val pending = list.firstOrNull { it.status == "pending" }
    val last = list.firstOrNull { it.status != "pending" }
    if (pending != null) {
        AppCard {
            Text("برداشت ${fa(pending.amountToman)} تومان: ${withdrawalStatusLabel("pending")}", color = c.ink, fontWeight = FontWeight.Bold)
            Muted(pending.sheba)
            Muted("معمولاً تا یک روز کاری به حساب شما واریز می‌شود.")
            AppTextButton(onClick = {
                scope.launch {
                    runCatching { container.web.cancelWithdrawal(pending.id) }.onFailure { Toasts.error(persianError(it, "لغو انجام نشد", container.json)) }
                    reload++; onChange()
                }
            }) { Text("لغو درخواست", color = c.danger) }
        }
    } else {
        SecondaryButton(onClick = { open = true }, Modifier.fillMaxWidth(), enabled = balance >= min) {
            Text(if (balance < min) "برداشت از ${fa(min)} تومان به بالا" else "برداشت از کیف پول")
        }
    }
    if (last != null) {
        val date = instant(last.createdAt)?.toSalonDateTime(null)?.toLocalDate()?.persianLabel() ?: ""
        Muted(buildString {
            append("آخرین برداشت: ${fa(last.amountToman)} تومان، $date — ${withdrawalStatusLabel(last.status)}")
            last.trackingCode?.let { append("، کد پیگیری $it") }
            if (last.adminNote.isNotBlank()) append("، ${last.adminNote}")
        })
    }
    if (open) WithdrawSheet(container, balance, list.firstOrNull(), onDismiss = { open = false }) {
        open = false; reload++; onChange()
        Toasts.success("درخواست برداشت ثبت شد")
    }
}

@Composable
private fun WithdrawSheet(container: AppContainer, balance: Int, previous: Withdrawal?, onDismiss: () -> Unit, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    // the Sheba and holder of the last request, so a regular withdrawal is just the amount
    var amount by remember { mutableStateOf(balance.coerceAtLeast(0).toString()) }
    var sheba by remember { mutableStateOf(previous?.sheba?.drop(2) ?: "") }
    var holder by remember { mutableStateOf(previous?.accountHolder ?: "") }
    var busy by remember { mutableStateOf(false) }
    AppDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("برداشت از کیف پول") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                AppTextField(
                    if (amount.isEmpty()) "" else fa(amount.toLong()), { amount = it.normalizeDigits().filter(Char::isDigit).take(9).trimStart('0') },
                    label = { Text("مبلغ (تومان)") }, supportingText = { Text("موجودی: ${fa(balance)} تومان") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
                )
                AppTextField(
                    sheba.toPersianDigits(), { sheba = it.normalizeDigits().filter(Char::isDigit).take(24) },
                    label = { Text("شماره شبا") }, prefix = { Text("IR") }, supportingText = { Text("۲۴ رقم بعد از IR") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth(),
                )
                AppTextField(holder, { holder = it.take(80) }, label = { Text("نام صاحب حساب") }, singleLine = true, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = {
            PrimaryButton("ثبت درخواست برداشت", enabled = !busy) {
                busy = true
                scope.launch {
                    runCatching { container.web.createWithdrawal(NewWithdrawal(amount.toIntOrNull() ?: 0, "IR$sheba", holder.trim())) }
                        .onSuccess { onDone() }
                        .onFailure { Toasts.error(persianError(it, "ثبت درخواست انجام نشد", container.json)) }
                    busy = false
                }
            }
        },
        dismissButton = { AppTextButton(onClick = onDismiss, enabled = !busy) { Text("انصراف") } },
    )
}
