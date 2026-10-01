package app.nobatet.util

import java.time.LocalDate
import java.time.chrono.HijrahDate
import java.time.temporal.ChronoField

// Iran's official public holidays, for marking days on the calendars — apps/web lib/iranHolidays.ts.
//
// • Solar holidays are fixed in the Jalali calendar — always exact.
// • Religious holidays follow the lunar Hijri calendar, which Iran fixes by moon sighting, so they're
//   computed with java.time's Umm al-Qura calendar (as the web uses the browser's) and can be a day
//   off. Once the year's official calendar is published (time.ir), put the exact dates in
//   OFFICIAL_OVERRIDES — an entry replaces the computed lunar holidays for that whole Jalali year.
//   Keep both lists in step with the web.

private data class Holiday(val month: Int, val day: Int, val title: String)

private val SOLAR = listOf(
    Holiday(1, 1, "عید نوروز"), Holiday(1, 2, "عید نوروز"), Holiday(1, 3, "عید نوروز"), Holiday(1, 4, "عید نوروز"),
    Holiday(1, 12, "روز جمهوری اسلامی"), Holiday(1, 13, "روز طبیعت"),
    Holiday(3, 14, "رحلت امام خمینی"), Holiday(3, 15, "قیام ۱۵ خرداد"),
    Holiday(11, 22, "پیروزی انقلاب اسلامی"), Holiday(12, 29, "ملی شدن صنعت نفت"),
)

// Hijri month (1 = Muharram … 12 = Dhu al-Hijjah) and day; day 0 = last day of that month.
private val LUNAR = listOf(
    Holiday(1, 9, "تاسوعای حسینی"), Holiday(1, 10, "عاشورای حسینی"),
    Holiday(2, 20, "اربعین حسینی"), Holiday(2, 28, "رحلت پیامبر و شهادت امام حسن مجتبی"), Holiday(2, 0, "شهادت امام رضا"),
    Holiday(3, 8, "شهادت امام حسن عسکری"), Holiday(3, 17, "میلاد پیامبر و امام جعفر صادق"),
    Holiday(6, 3, "شهادت حضرت فاطمه"), Holiday(7, 13, "ولادت امام علی"), Holiday(7, 27, "مبعث پیامبر"),
    Holiday(8, 15, "ولادت امام زمان"), Holiday(9, 21, "شهادت امام علی"),
    Holiday(10, 1, "عید فطر"), Holiday(10, 2, "تعطیل به مناسبت عید فطر"), Holiday(10, 25, "شهادت امام جعفر صادق"),
    Holiday(12, 10, "عید قربان"), Holiday(12, 18, "عید غدیر خم"),
)

/** Exact official dates per Jalali year ("MM-DD" Jalali → title); replaces the computed lunar ones. */
private val OFFICIAL_OVERRIDES: Map<Int, Map<String, String>> = emptyMap()

private val cache = HashMap<Int, Map<LocalDate, String>>()

private fun hijri(date: LocalDate): Pair<Int, Int>? = runCatching {
    val h = HijrahDate.from(date)
    h.get(ChronoField.MONTH_OF_YEAR) to h.get(ChronoField.DAY_OF_MONTH)
}.getOrNull() // outside the Umm al-Qura table → solar holidays only

/** All official holidays of one Jalali year. */
@Synchronized
fun holidaysOfJalaliYear(jy: Int): Map<LocalDate, String> = cache.getOrPut(jy) {
    val out = HashMap<LocalDate, String>()
    val first = jalaliToGregorian(jy, 1, 1)
    val next = jalaliToGregorian(jy + 1, 1, 1)
    val override = OFFICIAL_OVERRIDES[jy]
    var date = first
    while (date.isBefore(next)) {
        val j = date.toJalali()
        val titles = mutableListOf<String>()
        val solar = SOLAR.firstOrNull { it.month == j.month && it.day == j.day }
        if (solar != null) titles += solar.title
        if (override != null) {
            val md = String.format(java.util.Locale.ROOT, "%02d-%02d", j.month, j.day)
            if (solar == null) override[md]?.let { titles += it }
        } else hijri(date)?.let { (hm, hd) ->
            val lastOfMonth = hijri(date.plusDays(1))?.first != hm
            LUNAR.filter { it.month == hm && (it.day == hd || (it.day == 0 && lastOfMonth)) }.forEach { titles += it.title }
        }
        if (titles.isNotEmpty()) out[date] = titles.joinToString("، ")
        date = date.plusDays(1)
    }
    out
}

/** The official holiday on this day, or null. */
fun LocalDate.iranHoliday(): String? = holidaysOfJalaliYear(toJalali().year)[this]
