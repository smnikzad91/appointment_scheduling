package app.nobatet.data

import kotlinx.serialization.Serializable

// The owner panel's analytics (apps/api src/insights, apps/web lib/api/insights.ts): «آمار بازدید» from
// the public page's visit log and «آنالیز رفتار مشتری» from past appointments. Windows end now and
// start at a salon-local midnight.

val VISIT_RANGES = listOf(7, 30, 90)
val CUSTOMER_RANGES = listOf(30, 90, 365)

@Serializable
data class Breakdown(
    /** referrers: "direct", "nobatet" (another page of this site), a host (l.instagram.com…) or a type; devices: mobile/desktop/tablet */
    val key: String,
    val views: Int = 0,
    val visitors: Int = 0,
)

@Serializable
data class ViewCount(val views: Int = 0, val visitors: Int = 0)

@Serializable
data class PreviousVisits(val views: Int = 0, val visitors: Int = 0, val onlineBookings: Int = 0, val conversion: Double = 0.0)

@Serializable
data class DayVisits(val day: String, val views: Int = 0, val visitors: Int = 0)

@Serializable
data class VisitFunnel(val opened: Int = 0, val openedVisitors: Int = 0, val done: Int = 0, val doneVisitors: Int = 0)

@Serializable
data class VisitInsights(
    val days: Int,
    val totals: ViewCount = ViewCount(),
    /** the window of the same length just before */
    val previous: PreviousVisits = PreviousVisits(),
    val today: ViewCount = ViewCount(),
    val liveVisitors: Int = 0,
    val liveMinutes: Int = 30,
    val perDay: List<DayVisits> = emptyList(),
    val referrers: List<Breakdown> = emptyList(),
    val devices: List<Breakdown> = emptyList(),
    val funnel: VisitFunnel = VisitFunnel(),
    /** customers' own bookings made in the window (site or app) */
    val onlineBookings: Int = 0,
    /** online bookings per 100 unique visitors, at most 100 */
    val conversion: Double = 0.0,
)

@Serializable
data class BookingTotals(
    val bookings: Int = 0,
    val completed: Int = 0,
    val cancelled: Int = 0,
    val noShow: Int = 0,
    val unmarked: Int = 0,
    val cancelRate: Double = 0.0,
    val noShowRate: Double = 0.0,
    val revenueToman: Long = 0,
)

@Serializable
data class ServiceInsight(val serviceId: String, val name: String, val bookings: Int = 0, val revenueToman: Long = 0, val revenueShare: Double = 0.0)

@Serializable
data class CustomerCounts(val total: Int = 0, val new: Int = 0, val returning: Int = 0, val repeatInWindow: Int = 0, val avgVisits: Double = 0.0)

@Serializable
data class LeadBuckets(val sameDay: Int = 0, val upTo3Days: Int = 0, val upTo7Days: Int = 0, val moreThan7Days: Int = 0)

@Serializable
data class LeadTime(val avgHours: Double = 0.0, val medianHours: Double = 0.0, val buckets: LeadBuckets = LeadBuckets())

@Serializable
data class UnreliableCustomer(val customerId: String, val name: String, val noShows: Int = 0, val cancellations: Int = 0, val bookings: Int = 0, val lastAt: String)

/** Percent back within 30/60/90 days; null = too soon to tell. */
@Serializable
data class CohortReturn(val d30: Double? = null, val d60: Double? = null, val d90: Double? = null)

/** `month` is already a Persian label («مهر ۱۴۰۵»). */
@Serializable
data class Cohort(val month: String, val customers: Int = 0, val returned: CohortReturn = CohortReturn())

/** tone: good | warn | info */
@Serializable
data class InsightTip(val tone: String, val text: String)

@Serializable
data class CustomerInsights(
    val totals: BookingTotals = BookingTotals(),
    /** non-cancelled bookings by salon-local hour 0–23 */
    val byHour: List<Int> = List(24) { 0 },
    /** Saturday-first */
    val byWeekday: List<Int> = List(7) { 0 },
    /** [weekday Saturday-first][hour] */
    val grid: List<List<Int>> = emptyList(),
    val services: List<ServiceInsight> = emptyList(),
    val customers: CustomerCounts = CustomerCounts(),
    val leadTime: LeadTime = LeadTime(),
    val unreliable: List<UnreliableCustomer> = emptyList(),
    val cohorts: List<Cohort> = emptyList(),
    val tips: List<InsightTip> = emptyList(),
)
