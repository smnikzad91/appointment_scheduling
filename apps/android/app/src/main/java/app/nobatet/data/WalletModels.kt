package app.nobatet.data

import kotlinx.serialization.Serializable

// «کیف پول» (apps/web /api/user/finance/**, same token), for every role: automatic top-ups (card to
// card through nodepass.ir — the only way in), the history, withdrawals to a Sheba. Booking
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
    /** nodepass.ir's receipt code («کد پیگیری»), for support if the payment isn't confirmed */
    val trackingCode: String? = null,
    /** nodepass.ir's page for this payment (its «بازگشت» comes back to /wallet-return) */
    val statusUrl: String? = null,
)

@Serializable
data class TopUpList(val available: Boolean = false, val items: List<TopUp> = emptyList())

@Serializable
data class NewTopUp(
    val amountToman: Int,
    /** where nodepass's status page «بازگشت» goes: apps/web /wallet-return, which this app opens (DeepLinks.kt) */
    val returnPath: String,
)

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
data class WalletInfo(
    val balanceToman: Int = 0,
    val items: List<WalletTx> = emptyList(),
    /** rows matching the filters, over every page */
    val total: Int = 0,
    val page: Int = 1,
    /** money in / out over all the matching rows, not just this page */
    val inToman: Int = 0,
    val outToman: Int = 0,
    /** the kinds this account has at all, for the type filter */
    val kinds: List<String> = emptyList(),
)

/** The history's filters (apps/web WalletHistory); the defaults are «no filter». */
data class WalletFilters(val direction: String = "all", val kind: String = "", val period: String = "all", val sort: String = "newest") {
    val filtered: Boolean get() = direction != "all" || kind.isNotEmpty() || period != "all"

    fun params(page: Int, pageSize: Int) = buildMap {
        put("page", page.toString()); put("pageSize", pageSize.toString())
        put("direction", direction); put("period", period); put("sort", sort)
        if (kind.isNotEmpty()) put("kind", kind)
    }
}

val WALLET_DIRECTIONS = listOf("all" to "همه", "in" to "واریز", "out" to "برداشت")
val WALLET_PERIODS = listOf("all" to "همه زمان‌ها", "7" to "۷ روز اخیر", "30" to "۳۰ روز اخیر", "90" to "۳ ماه اخیر", "365" to "یک سال اخیر")
val WALLET_SORTS = listOf("newest" to "جدیدترین", "oldest" to "قدیمی‌ترین", "credit" to "بیشترین واریز", "debit" to "بیشترین برداشت")

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
data class WalletMe(val balanceToman: Int = 0, val prepaymentPercent: Int = 25)

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
    "admin_adjustment" -> "اصلاح موجودی توسط پشتیبانی"
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
