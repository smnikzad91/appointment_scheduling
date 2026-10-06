package app.nobatet.util

import java.time.DayOfWeek
import java.time.LocalDate

/** A Jalali (Solar Hijri) date. */
data class JalaliDate(val year: Int, val month: Int, val day: Int)

private val MONTHS = listOf("فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند")

/** Gregorian → Jalali (the standard jalaali algorithm, valid for the years anyone books in). */
fun LocalDate.toJalali(): JalaliDate {
    val gy = year
    val gm = monthValue
    val gd = dayOfMonth
    val gDaysInMonth = intArrayOf(0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334)
    val gy2 = if (gm > 2) gy + 1 else gy
    var days = 355666 + 365 * gy + (gy2 + 3) / 4 - (gy2 + 99) / 100 + (gy2 + 399) / 400 + gd + gDaysInMonth[gm - 1]
    var jy = -1595 + 33 * (days / 12053)
    days %= 12053
    jy += 4 * (days / 1461)
    days %= 1461
    if (days > 365) {
        jy += (days - 1) / 365
        days = (days - 1) % 365
    }
    val jm: Int
    val jd: Int
    if (days < 186) {
        jm = 1 + days / 31
        jd = 1 + days % 31
    } else {
        jm = 7 + (days - 186) / 30
        jd = 1 + (days - 186) % 30
    }
    return JalaliDate(jy, jm, jd)
}

fun jalaliMonthName(month: Int): String = MONTHS[month - 1]

/** «شنبه» … «جمعه». */
fun DayOfWeek.persianName(): String = when (this) {
    DayOfWeek.SATURDAY -> "شنبه"
    DayOfWeek.SUNDAY -> "یکشنبه"
    DayOfWeek.MONDAY -> "دوشنبه"
    DayOfWeek.TUESDAY -> "سه‌شنبه"
    DayOfWeek.WEDNESDAY -> "چهارشنبه"
    DayOfWeek.THURSDAY -> "پنجشنبه"
    DayOfWeek.FRIDAY -> "جمعه"
}

/** «سه‌شنبه ۷ مهر», as the web's formatSalonDate. */
fun LocalDate.persianLabel(): String {
    val j = toJalali()
    return "${dayOfWeek.persianName()} ${j.day.toString().toPersianDigits()} ${jalaliMonthName(j.month)}"
}

/** Friday is the weekend in Iran. */
val LocalDate.isWeekend: Boolean get() = dayOfWeek == DayOfWeek.FRIDAY

/** Jalali → Gregorian (the jalaali algorithm's inverse). */
fun jalaliToGregorian(jy: Int, jm: Int, jd: Int): LocalDate {
    var jy1 = jy + 1595
    var days = -355668 + 365 * jy1 + (jy1 / 33) * 8 + ((jy1 % 33) + 3) / 4 + jd + if (jm < 7) (jm - 1) * 31 else (jm - 7) * 30 + 186
    var gy = 400 * (days / 146097)
    days %= 146097
    if (days > 36524) {
        days--
        gy += 100 * (days / 36524)
        days %= 36524
        if (days >= 365) days++
    }
    gy += 4 * (days / 1461)
    days %= 1461
    if (days > 365) {
        gy += (days - 1) / 365
        days = (days - 1) % 365
    }
    var gd = days + 1
    val leap = (gy % 4 == 0 && gy % 100 != 0) || gy % 400 == 0
    val monthDays = intArrayOf(0, 31, if (leap) 29 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
    var gm = 1
    while (gm <= 12 && gd > monthDays[gm]) {
        gd -= monthDays[gm]
        gm++
    }
    return LocalDate.of(gy, gm, gd)
}

/** A Jalali month as salon-local days [start, end): the accounting screens' period (apps/web accountingPeriod). */
data class MonthPeriod(val label: String, val start: LocalDate, val end: LocalDate)

fun jalaliMonthPeriod(today: LocalDate, offset: Int): MonthPeriod {
    val j = today.toJalali()
    var y = j.year
    var m = j.month + offset
    while (m < 1) { m += 12; y-- }
    while (m > 12) { m -= 12; y++ }
    val start = jalaliToGregorian(y, m, 1)
    val (ny, nm) = if (m == 12) (y + 1) to 1 else y to (m + 1)
    return MonthPeriod("${jalaliMonthName(m)} ${y.toString().toPersianDigits()}", start, jalaliToGregorian(ny, nm, 1))
}
