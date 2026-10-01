package app.nobatet.util

import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

// apps/api returns real instants; slots, working hours and the date strip are the salon's
// wall-clock time (Salon.timezone, Asia/Tehran today) — the same rule as apps/web src/lib/salonTime.ts.

const val DEFAULT_TIMEZONE = "Asia/Tehran"

fun zone(timezone: String?): ZoneId = runCatching { ZoneId.of(timezone ?: DEFAULT_TIMEZONE) }.getOrDefault(ZoneId.of(DEFAULT_TIMEZONE))

/** Today's date in the salon's time zone. */
fun salonToday(timezone: String?): LocalDate = LocalDate.now(zone(timezone))

/** A salon-local day + minutes after midnight → the instant to send to apps/api. */
fun salonWallTimeToInstant(date: LocalDate, minuteOfDay: Int, timezone: String?): Instant =
    LocalDateTime.of(date, java.time.LocalTime.MIDNIGHT).plusMinutes(minuteOfDay.toLong()).atZone(zone(timezone)).toInstant()

/** An instant from apps/api → the salon-local date and time. */
fun Instant.toSalonDateTime(timezone: String?): LocalDateTime = atZone(zone(timezone)).toLocalDateTime()
