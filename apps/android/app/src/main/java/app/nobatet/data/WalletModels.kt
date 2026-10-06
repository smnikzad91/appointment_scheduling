package app.nobatet.data

import kotlinx.serialization.Serializable

// «کیف پول» (apps/web /api/user/finance/**, same token), for every role: automatic top-ups (card to
// card, confirmed by the bank SMS — the only way in), the history, withdrawals to a Sheba. Booking
// pre-payments, the rest of a booking, plan purchases, wallet payouts and SMS costs all move this
// balance (see apps/web CLAUDE.md «Finance Flow»).

/** A platform card to transfer to (only on a pending top-up). */
@Serializable
data class TopUpCard(val cardNumber: String = "", val ownerName: String = "", val bankName: String = "")

@Serializable
data class TopUp(
    val id: String,
    val amountToman: Int,
    /** the exact amount to pay, in rial (amount×10 + 1–1000 rial that identifies the payment) */
    val payableRial: String,
    /** pending | paid | expired | cancelled */
    val status: String,
    val expiresAt: String = "",
    val creditedToman: Int? = null,
    val card: TopUpCard? = null,
)

@Serializable
data class TopUpList(val available: Boolean = false, val items: List<TopUp> = emptyList())

@Serializable
data class NewTopUp(val amountToman: Int)

@Serializable
data class WalletTx(
    val id: String,
    /** top_up, prepayment, prepayment_refund, prepayment_income, …, sms_cost */
    val kind: String,
    val amountToman: Int,
    val balanceAfter: Int,
    val createdAt: String = "",
    val note: String? = null,
    val detail: String? = null,
    val appointment: WalletTxAppointment? = null,
)

@Serializable
data class WalletTxAppointment(val startAt: String, val salonName: String, val timezone: String? = null)

@Serializable
data class WalletInfo(val balanceToman: Int = 0, val items: List<WalletTx> = emptyList())

@Serializable
data class Withdrawal(
    val id: String,
    val amountToman: Int,
    val sheba: String,
    val accountHolder: String,
    /** pending | paid | rejected | cancelled */
    val status: String,
    val adminNote: String = "",
    val trackingCode: String? = null,
    val createdAt: String = "",
)

@Serializable
data class WithdrawalList(val minToman: Int = 50_000, val items: List<Withdrawal> = emptyList())

@Serializable
data class NewWithdrawal(val amountToman: Int, val sheba: String, val accountHolder: String)

/** apps/api GET /wallet/me — the balance and the booking pre-payment rule. */
@Serializable
data class WalletMe(val balanceToman: Int = 0, val prepaymentPercent: Int = 50)

/** apps/web WalletHistory KIND_LABEL */
fun walletTxLabel(kind: String) = when (kind) {
    "top_up" -> "شارژ کیف پول"
    "prepayment" -> "پیش‌پرداخت نوبت"
    "prepayment_refund" -> "بازگشت پیش‌پرداخت (لغو نوبت)"
    "prepayment_income" -> "پیش‌پرداخت دریافتی نوبت"
    "prepayment_income_reversal" -> "برگشت پیش‌پرداخت دریافتی"
    "withdrawal" -> "برداشت به حساب بانکی"
    "withdrawal_reversal" -> "بازگشت برداشت (رد یا لغو)"
    "payout_sent" -> "پرداخت به آرایشگر"
    "payout_received" -> "پرداخت سالن"
    "plan_purchase" -> "خرید پلن"
    "plan_credit" -> "اعتبار پلن قبلی (تغییر پلن)"
    "balance_payment" -> "پرداخت باقی‌مانده نوبت"
    "balance_income" -> "باقی‌مانده نوبت (از کیف پول مشتری)"
    "balance_income_reversal" -> "برگشت باقی‌مانده دریافتی"
    "balance_refund" -> "بازگشت باقی‌مانده پرداختی"
    "sms_cost" -> "هزینه پیامک"
    else -> kind
}

fun withdrawalStatusLabel(status: String) = when (status) {
    "pending" -> "در انتظار پرداخت"
    "paid" -> "پرداخت شد"
    "rejected" -> "رد شد؛ مبلغ به کیف پول برگشت"
    "cancelled" -> "لغو شد"
    else -> status
}

/** «۶۰۳۷ ۹۹۷۵ …» */
fun formatCardNumber(n: String) = n.chunked(4).joinToString(" ")

// ── Plans bought from the owner's wallet (apps/api salons/mine/subscription/…) ─────────────────

@Serializable
data class PurchasablePlan(val id: String, val name: String, val monthlyPriceToman: Int, val recommended: Boolean = false)

@Serializable
data class PurchasablePlans(val plans: List<PurchasablePlan> = emptyList(), val currentPlanId: String? = null, val switchCreditToman: Int = 0)

@Serializable
data class PurchasePlanRequest(val planId: String, val months: Int)

@Serializable
data class PurchasePlanResult(val planName: String, val months: Int, val amountToman: Int, val creditToman: Int = 0, val expiresAt: String? = null)
