package app.nobatet.util

import java.text.NumberFormat
import java.time.LocalDateTime
import java.util.Locale

/** 450000 → «۴۵۰٬۰۰۰ تومان», as the web's formatToman. */
fun formatToman(amount: Int): String =
    NumberFormat.getIntegerInstance(Locale.US).format(amount).replace(',', '٬').toPersianDigits() + " تومان"

/** Minutes after midnight → «۰۹:۳۰». */
fun formatClock(minuteOfDay: Int): String = "%02d:%02d".format(minuteOfDay / 60 % 24, minuteOfDay % 60).toPersianDigits()

/** «۴۵ دقیقه» / «۱ ساعت و ۳۰ دقیقه». */
fun formatDuration(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    return when {
        h == 0 -> "${m.toString().toPersianDigits()} دقیقه"
        m == 0 -> "${h.toString().toPersianDigits()} ساعت"
        else -> "${h.toString().toPersianDigits()} ساعت و ${m.toString().toPersianDigits()} دقیقه"
    }
}

/** «سه‌شنبه ۷ مهر، ساعت ۱۶:۳۰». */
fun LocalDateTime.persianDateTime(): String = "${toLocalDate().persianLabel()}، ساعت ${formatClock(hour * 60 + minute)}"
