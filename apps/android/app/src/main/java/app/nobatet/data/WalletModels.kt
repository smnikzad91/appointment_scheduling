package app.nobatet.data

import kotlinx.serialization.Serializable

// «کیف پول» (apps/web /api/user/finance/**, same token): the customer's bank cards, the platform's
// cards to transfer to, and deposits (a receipt photo the admin approves).

@Serializable
data class BankCard(val id: String, val cardNumber: String, val ownerName: String, val bankName: String)

@Serializable
data class NewBankCard(val cardNumber: String, val ownerName: String, val bankName: String)

@Serializable
data class DepositCard(val cardNumber: String = "", val bankName: String = "")

@Serializable
data class Deposit(
    val id: String,
    val amount: Int,
    val description: String? = null,
    val receiptImage: String? = null,
    /** pending | approved | rejected */
    val status: String,
    val adminNote: String? = null,
    val interceptionCode: String? = null,
    val createdAt: String = "",
    val card: DepositCard? = null,
)

@Serializable
data class NewDeposit(val cardId: String, val amount: Int, val description: String, val receiptImage: String)

@Serializable
data class WalletProfile(val walletBalance: Int = 0)

fun depositStatusLabel(status: String) = when (status) {
    "pending" -> "در انتظار بررسی"
    "approved" -> "تایید شده"
    "rejected" -> "رد شده"
    else -> status
}

/** «۶۰۳۷ ۹۹۷۵ …» */
fun formatCardNumber(n: String) = n.chunked(4).joinToString(" ")
