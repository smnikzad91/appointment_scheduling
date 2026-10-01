package app.nobatet.ui.customer

import app.nobatet.ui.components.Toasts
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.BankCard
import app.nobatet.data.Deposit
import app.nobatet.data.NewBankCard
import app.nobatet.data.NewDeposit
import app.nobatet.data.depositStatusLabel
import app.nobatet.data.formatCardNumber
import app.nobatet.data.persianError
import app.nobatet.data.uploadPhoto
import app.nobatet.ui.components.AppCard
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.SectionTitle
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.normalizeDigits
import app.nobatet.util.persianDateTime
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import kotlinx.coroutines.launch
import java.time.Instant

/** «کیف پول»: balance, the platform's cards to transfer to, your cards, deposits with a receipt photo. */
@Composable
fun WalletScreen(container: AppContainer) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var balance by remember { mutableIntStateOf(0) }
    var cards by remember { mutableStateOf<List<BankCard>>(emptyList()) }
    var platform by remember { mutableStateOf<List<BankCard>>(emptyList()) }
    var deposits by remember { mutableStateOf<List<Deposit>>(emptyList()) }
    var reload by remember { mutableIntStateOf(0) }
    var addingCard by remember { mutableStateOf(false) }
    var depositing by remember { mutableStateOf(false) }
    LaunchedEffect(reload) {
        launch { runCatching { container.web.walletProfile() }.onSuccess { balance = it.walletBalance } }
        launch { cards = runCatching { container.web.bankCards() }.getOrDefault(emptyList()) }
        launch { platform = runCatching { container.web.platformCards() }.getOrDefault(emptyList()) }
        launch { deposits = runCatching { container.web.deposits() }.getOrDefault(emptyList()) }
    }
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AppCard {
                Muted("موجودی کیف پول")
                Text(formatToman(balance), style = MaterialTheme.typography.headlineSmall, color = c.ink)
                PrimaryButton("افزایش موجودی") { if (cards.isEmpty()) addingCard = true else depositing = true }
                if (cards.isEmpty()) Muted("برای واریز، ابتدا کارت بانکی خود را ثبت کنید.")
            }
            if (platform.isNotEmpty()) AppCard {
                SectionTitle("واریز به این کارت‌ها")
                platform.forEach { pc ->
                    Column(Modifier.fillMaxWidth().clickable {
                        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager).setPrimaryClip(ClipData.newPlainText("card", pc.cardNumber))
                        scope.launch { Toasts.success("شماره کارت کپی شد") }
                    }.padding(vertical = 6.dp)) {
                        Text(formatCardNumber(pc.cardNumber).toPersianDigits(), color = c.ink, style = MaterialTheme.typography.titleMedium)
                        Muted("${pc.bankName}، ${pc.ownerName} — برای کپی بزنید")
                    }
                }
            }
            AppCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    SectionTitle("کارت‌های من", Modifier.weight(1f))
                    TextButton(onClick = { addingCard = true }) { Text("افزودن کارت") }
                }
                if (cards.isEmpty()) Muted("کارتی ثبت نشده")
                cards.forEach { card ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(formatCardNumber(card.cardNumber).toPersianDigits(), color = c.ink)
                            Muted("${card.bankName}، ${card.ownerName}")
                        }
                        TextButton(onClick = {
                            scope.launch { runCatching { container.web.deleteBankCard(card.id) }.onSuccess { reload++ }.onFailure { Toasts.error(persianError(it, "حذف کارت انجام نشد", container.json)) } }
                        }) { Text("حذف", color = c.danger) }
                    }
                }
            }
            if (deposits.isNotEmpty()) SectionTitle("واریزها")
            deposits.forEach { d ->
                AppCard {
                    Row { Text(formatToman(d.amount), color = c.ink, modifier = Modifier.weight(1f)); Text(depositStatusLabel(d.status), color = when (d.status) { "approved" -> c.done; "rejected" -> c.danger; else -> c.pending }) }
                    if (d.createdAt.isNotEmpty()) Muted(runCatching { Instant.parse(d.createdAt).toSalonDateTime(null).persianDateTime() }.getOrDefault(""))
                    d.interceptionCode?.let { Muted("کد پیگیری: $it") }
                    d.adminNote?.takeIf { it.isNotBlank() }?.let { Muted("پاسخ پشتیبانی: $it") }
                    if (d.status != "approved") TextButton(onClick = {
                        scope.launch { runCatching { container.web.deleteDeposit(d.id) }.onSuccess { reload++ }.onFailure { Toasts.error(persianError(it, "حذف واریز انجام نشد", container.json)) } }
                    }) { Text("حذف", color = c.danger) }
                }
            }
        }
    }
    if (addingCard) AddCardDialog(container, onDismiss = { addingCard = false }) { addingCard = false; reload++; scope.launch { Toasts.success("کارت ثبت شد") } }
    if (depositing) DepositDialog(container, cards, onDismiss = { depositing = false }) {
        depositing = false; reload++
        scope.launch { Toasts.success("واریز ثبت شد و پس از بررسی به موجودی اضافه می‌شود") }
    }
}

@Composable
private fun AddCardDialog(container: AppContainer, onDismiss: () -> Unit, onDone: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var number by remember { mutableStateOf("") }
    var owner by remember { mutableStateOf("") }
    var bank by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("افزودن کارت بانکی") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(number.toPersianDigits(), { number = it.normalizeDigits().filter(Char::isDigit).take(16) }, label = { Text("شماره کارت ۱۶ رقمی") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                OutlinedTextField(owner, { owner = it.take(60) }, label = { Text("نام صاحب کارت") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(bank, { bank = it.take(40) }, label = { Text("نام بانک") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                when {
                    number.length != 16 -> error = "شماره کارت باید ۱۶ رقم باشد"
                    owner.isBlank() || bank.isBlank() -> error = "نام صاحب کارت و بانک را وارد کنید"
                    else -> scope.launch {
                        runCatching { container.web.addBankCard(NewBankCard(number, owner.trim(), bank.trim())) }.onSuccess { onDone() }
                            .onFailure { error = persianError(it, "ثبت کارت انجام نشد", container.json) }
                    }
                }
            }) { Text("ثبت کارت") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}

@Composable
private fun DepositDialog(container: AppContainer, cards: List<BankCard>, onDismiss: () -> Unit, onDone: () -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var cardId by remember { mutableStateOf(cards.firstOrNull()?.id) }
    var amount by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var receipt by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri: Uri? ->
        if (uri != null) scope.launch {
            busy = true
            runCatching { uploadPhoto(container, context, uri, "deposits") }.onSuccess { receipt = it }.onFailure { error = persianError(it, "آپلود رسید انجام نشد", container.json) }
            busy = false
        }
    }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("ثبت واریز") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Muted("از کدام کارت واریز کردید؟")
                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    cards.forEach { card -> FilterChip(selected = cardId == card.id, onClick = { cardId = card.id }, label = { Text("…" + card.cardNumber.takeLast(4).toPersianDigits() + " " + card.bankName) }) }
                }
                OutlinedTextField(amount.toPersianDigits(), { amount = it.normalizeDigits().filter(Char::isDigit).take(10) }, label = { Text("مبلغ واریزی (تومان)") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth())
                OutlinedTextField(note, { note = it.take(200) }, label = { Text("توضیح (اختیاری)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                TextButton(onClick = { pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, enabled = !busy) {
                    Text(if (busy) "در حال آپلود..." else if (receipt != null) "رسید پیوست شد؛ تغییر" else "پیوست عکس رسید")
                }
                error?.let { Text(it, color = c.danger) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = {
                val amt = amount.toIntOrNull()
                when {
                    cardId == null -> error = "کارت را انتخاب کنید"
                    amt == null || amt < 1000 -> error = "مبلغ باید دست‌کم ۱٬۰۰۰ تومان باشد"
                    receipt == null -> error = "عکس رسید را پیوست کنید"
                    else -> scope.launch {
                        runCatching { container.web.addDeposit(NewDeposit(cardId!!, amt, note.trim(), receipt!!)) }.onSuccess { onDone() }
                            .onFailure { error = persianError(it, "ثبت واریز انجام نشد", container.json) }
                    }
                }
            }) { Text("ثبت واریز") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("انصراف") } },
    )
}
