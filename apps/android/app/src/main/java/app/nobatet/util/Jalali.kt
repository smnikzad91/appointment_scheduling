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
