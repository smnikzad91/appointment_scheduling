package app.nobatet.util

private const val FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

/** Latin digits → Persian, as everywhere in the web UI (toPersianDigits). */
fun String.toPersianDigits(): String = map { c -> if (c in '0'..'9') FA_DIGITS[c - '0'] else c }.joinToString("")

/** Persian/Arabic digits → Latin, for phone numbers and codes typed on a Persian keyboard (normalizeDigits). */
fun String.normalizeDigits(): String = map { c ->
    when (c) {
        in '۰'..'۹' -> '0' + (c - '۰')
        in '٠'..'٩' -> '0' + (c - '٠')
        else -> c
    }
}.joinToString("")

/** 09xxxxxxxxx, the only format apps/api accepts. */
fun isValidIranianMobile(phone: String): Boolean = Regex("^09[0-9]{9}$").matches(phone)

/** +989… / 00989… / 989… (and Persian digits, spaces, dashes) → 09…, as apps/api ToIranianMobile; anything else as typed. */
fun toIranianMobile(input: String): String {
    val s = input.normalizeDigits().filter { it.isDigit() || it == '+' }
    return when {
        s.startsWith("+98") -> "0" + s.drop(3)
        s.startsWith("0098") -> "0" + s.drop(4)
        s.startsWith("98") && s.length == 12 -> "0" + s.drop(2)
        else -> s
    }
}
