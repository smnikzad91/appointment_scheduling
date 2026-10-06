package app.nobatet.ui.salon

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.nobatet.data.AppContainer
import app.nobatet.data.OwnerSubscription
import app.nobatet.data.PurchasablePlans
import app.nobatet.data.PurchasePlanRequest
import app.nobatet.data.persianError
import app.nobatet.ui.components.AppChip
import app.nobatet.ui.components.AppDialog
import app.nobatet.ui.components.AppTextButton
import app.nobatet.ui.components.Muted
import app.nobatet.ui.components.PrimaryButton
import app.nobatet.ui.components.Toasts
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatToman
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.launch

private val MONTHS = listOf(1, 3, 6, 12)

/**
 * Buy or renew the plan from the owner's wallet (apps/web PlanPurchaseSheet, apps/api POST
 * salons/mine/subscription/purchase): renewing the current plan adds to its end; another plan starts
 * today and the unused part of the running bought plan comes back to the wallet first (pro rata).
 */
@Composable
fun PlanPurchaseSheet(container: AppContainer, sub: OwnerSubscription?, onDismiss: () -> Unit, onBought: () -> Unit) {
    val c = LocalAppColors.current
    val scope = rememberCoroutineScope()
    var offer by remember { mutableStateOf<PurchasablePlans?>(null) }
    var balance by remember { mutableStateOf<Int?>(null) }
    var planId by remember { mutableStateOf<String?>(null) }
    var months by remember { mutableIntStateOf(1) }
    var busy by remember { mutableStateOf(false) }
    var reload by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        val o = runCatching { container.api.purchasablePlans() }.getOrDefault(PurchasablePlans())
        offer = o
        planId = (o.plans.firstOrNull { it.id == sub?.plan?.id } ?: o.plans.firstOrNull { it.recommended } ?: o.plans.firstOrNull())?.id
    }
    LaunchedEffect(reload) { balance = runCatching { container.api.walletMe().balanceToman }.getOrNull() }

    val plan = offer?.plans?.firstOrNull { it.id == planId }
    val total = (plan?.monthlyPriceToman ?: 0) * months
    // another plan: the running one's unused part is credited first, so it counts toward the price
    val credit = if (plan != null && offer?.currentPlanId != null && plan.id != offer?.currentPlanId) offer?.switchCreditToman ?: 0 else 0
    val short = if (plan != null) balance?.let { (total - credit - it).coerceAtLeast(0) } ?: 0 else 0
    val renewing = plan != null && sub?.plan?.id == plan.id && sub?.status == "active"

    AppDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("خرید یا تمدید پلن") },
        text = {
            Column(Modifier.heightIn(max = 560.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                val o = offer
                when {
                    o == null -> Muted("در حال بارگذاری…")
                    o.plans.isEmpty() -> Muted("فعلاً پلنی برای خرید آنلاین نیست؛ با پشتیبانی تماس بگیرید.")
                    else -> {
                        o.plans.forEach { p ->
                            val on = p.id == planId
                            Row(
                                Modifier.fillMaxWidth().background(if (on) c.accentSoft else c.card, RoundedCornerShape(16.dp))
                                    .border(1.dp, if (on) c.accent else c.line, RoundedCornerShape(16.dp))
                                    .clickable { planId = p.id }.padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(p.name + if (sub?.plan?.id == p.id) " (پلن فعلی)" else "", color = c.ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                Muted(if (p.monthlyPriceToman == 0) "رایگان" else "${formatToman(p.monthlyPriceToman)} در ماه")
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MONTHS.forEach { m -> AppChip(months == m, { months = m }, { Text("${m.toString().toPersianDigits()} ماه") }, Modifier.weight(1f)) }
                        }
                        if (plan != null) Column(
                            Modifier.fillMaxWidth().background(c.card2, RoundedCornerShape(16.dp)).padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Row { Text("مبلغ", color = c.ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f)); Text(formatToman(total), color = c.ink, fontWeight = FontWeight.Bold) }
                            if (credit > 0) Row { Text("اعتبار باقی‌مانده پلن فعلی", color = c.done, modifier = Modifier.weight(1f)); Text(formatToman(credit), color = c.done) }
                            val b = balance
                            // a debt (SMS costs, an undone completion…) is paid off with this purchase
                            if (b != null && b < 0) Row { Text("بدهی کیف پول (هزینه پیامک‌ها و …)", color = c.danger, modifier = Modifier.weight(1f)); Text(formatToman(-b), color = c.danger) }
                            else Row { Muted("موجودی کیف پول", Modifier.weight(1f)); Muted(b?.let { formatToman(it) } ?: "…") }
                            Muted(
                                when {
                                    renewing -> "به انتهای اشتراک فعلی اضافه می‌شود."
                                    credit > 0 -> "از امروز شروع می‌شود؛ بخش استفاده‌نشده پلن فعلی به کیف پول برمی‌گردد."
                                    else -> "از امروز شروع می‌شود."
                                } + " هر ماه ۳۰ روز است.",
                            )
                        }
                        if (short > 0) {
                            Text("موجودی کافی نیست؛ حداقل ${formatToman(short)} شارژ کنید.", color = c.ink, fontWeight = FontWeight.Bold)
                            app.nobatet.ui.wallet.WalletTopUp(container, suggestedToman = maxOf(10_000, (short + 999) / 1000 * 1000), onPaid = { reload++ })
                        }
                    }
                }
            }
        },
        confirmButton = {
            PrimaryButton(if (plan != null) "پرداخت ${formatToman(total)} از کیف پول" else "یک پلن انتخاب کنید", enabled = plan != null && balance != null && short == 0 && !busy) {
                val p = plan ?: return@PrimaryButton
                busy = true
                scope.launch {
                    runCatching { container.api.purchasePlan(PurchasePlanRequest(p.id, months)) }
                        .onSuccess { r ->
                            Toasts.success(
                                "پلن ${r.planName} برای ${r.months.toString().toPersianDigits()} ماه خریده شد" +
                                    if (r.creditToman > 0) "؛ ${formatToman(r.creditToman)} از پلن قبلی به کیف پول برگشت" else "",
                            )
                            onBought()
                        }
                        .onFailure { Toasts.error(persianError(it, "خرید پلن انجام نشد", container.json)); reload++ }
                    busy = false
                }
            }
        },
        dismissButton = { AppTextButton(onClick = onDismiss, enabled = !busy) { Text("انصراف") } },
    )
}
