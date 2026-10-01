package app.nobatet.ui.customer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.nobatet.data.AppContainer
import app.nobatet.data.CreateAppointmentRequest
import app.nobatet.data.CreatedAppointment
import app.nobatet.data.SalonDetail
import app.nobatet.data.SalonStylist
import app.nobatet.data.ServiceLocation
import app.nobatet.data.TimeSlot
import app.nobatet.data.persianError
import app.nobatet.util.salonToday
import app.nobatet.util.salonWallTimeToInstant
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate

/** The booking sheet's steps, as the web's BookingProvider (signed in: no contact/OTP steps). */
enum class BookingStep(val title: String) {
    SERVICES("انتخاب خدمات"), STYLIST("انتخاب متخصص"), DATETIME("انتخاب زمان"), PLACE("محل نوبت"), SUMMARY("تایید نهایی"), SUCCESS("رزرو موفق")
}

data class BookingState(
    val open: Boolean = false,
    val step: BookingStep = BookingStep.SERVICES,
    val serviceIds: List<String> = emptyList(),
    /** null = «فرقی نمی‌کند». */
    val stylistId: String? = null,
    val date: LocalDate? = null,
    val slots: List<TimeSlot> = emptyList(),
    val slotsLoading: Boolean = false,
    val startMinute: Int? = null,
    val place: ServiceLocation? = null,
    val visitAddress: String = "",
    /** A note for the salon (optional). */
    val notes: String = "",
    val submitting: Boolean = false,
    val result: CreatedAppointment? = null,
)

/** Choices to open the booking sheet with: «رزرو دوباره», or a "time opened up" notification. */
data class BookingPrefill(val serviceIds: List<String>, val stylistId: String? = null, val date: LocalDate? = null)

data class SalonUiState(
    val salon: SalonDetail? = null,
    val reviews: List<app.nobatet.data.PublicReview> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
    val booking: BookingState = BookingState(),
)

class SalonViewModel(private val container: AppContainer, private val slug: String) : ViewModel() {
    private val _state = MutableStateFlow(SalonUiState())
    val state: StateFlow<SalonUiState> = _state
    private val _errors = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val errors: SharedFlow<String> = _errors
    private var slotsJob: Job? = null

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            try {
                val salon = container.api.salon(slug)
                _state.update { it.copy(salon = salon, loading = false) }
                runCatching { container.api.salonPublicReviews(slug) }.onSuccess { r -> _state.update { it.copy(reviews = r) } }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = persianError(e, "دریافت اطلاعات سالن انجام نشد", container.json)) }
            }
        }
    }

    // ── booking ───────────────────────────────────────────────────────────────────────────────

    private val salon get() = _state.value.salon!!
    private val b get() = _state.value.booking
    private fun setBooking(f: (BookingState) -> BookingState) = _state.update { it.copy(booking = f(it.booking)) }

    /** Steps for this salon: no stylist step for an independent stylist; a place step when it's a choice or needs an address. */
    fun steps(): List<BookingStep> = buildList {
        add(BookingStep.SERVICES)
        if (!salon.independent) add(BookingStep.STYLIST)
        add(BookingStep.DATETIME)
        if (salon.independent && (salon.serviceLocations.size > 1 || ServiceLocation.CLIENT_HOME in salon.serviceLocations)) add(BookingStep.PLACE)
        add(BookingStep.SUMMARY)
    }

    fun openBooking(serviceId: String? = null) {
        val only = salon.serviceLocations.singleOrNull()
        setBooking { BookingState(open = true, serviceIds = listOfNotNull(serviceId), place = if (salon.independent) only else null) }
    }

    /** Straight to the day/time step with these choices (services no longer offered are dropped). */
    fun openBookingPrefilled(prefill: BookingPrefill) {
        val ids = prefill.serviceIds.filter { id -> salon.activeServices.any { it.id == id } }
        val stylist = prefill.stylistId?.takeIf { id -> salon.stylists.any { it.id == id } }
        // no services chosen (a short link, «?book=1»): start at the services step, with the stylist if one came
        if (ids.isEmpty()) {
            openBooking()
            if (stylist != null) setBooking { it.copy(stylistId = stylist) }
            return
        }
        setBooking {
            BookingState(open = true, step = BookingStep.DATETIME, serviceIds = ids, stylistId = stylist,
                place = if (salon.independent) salon.serviceLocations.singleOrNull() else null)
        }
        chooseDate(prefill.date?.takeIf { !it.isBefore(salonToday(salon.timezone)) } ?: salonToday(salon.timezone))
    }

    /** «خبرم کن»: a fully booked day — a text/notification when a time opens up (POST /salons/:slug/waitlist). */
    fun joinWaitlist() {
        val date = b.date ?: return
        viewModelScope.launch {
            try {
                container.api.joinWaitlist(salon.slug, app.nobatet.data.JoinWaitlistRequest(date.toString(), b.serviceIds, b.stylistId))
                fail("در لیست انتظار ثبت شدید؛ اگر وقتی خالی شد خبرتان می‌کنیم.")
            } catch (e: Exception) {
                fail(persianError(e, "ثبت در لیست انتظار انجام نشد", container.json))
            }
        }
    }

    /** «رزرو با …» on a stylist card: their services only, that stylist chosen. */
    fun openBookingWithStylist(stylistId: String) {
        setBooking { BookingState(open = true, stylistId = stylistId, place = if (salon.independent) salon.serviceLocations.singleOrNull() else null) }
    }

    fun setNotes(v: String) = setBooking { it.copy(notes = v.take(500)) }

    fun closeBooking() = setBooking { it.copy(open = false) }

    fun toggleService(id: String) = setBooking {
        it.copy(serviceIds = if (id in it.serviceIds) it.serviceIds - id else it.serviceIds + id, startMinute = null)
    }

    fun chooseStylist(id: String?) = setBooking { it.copy(stylistId = id, startMinute = null) }

    fun chooseDate(date: LocalDate) {
        setBooking { it.copy(date = date, startMinute = null) }
        loadSlots()
    }

    fun chooseTime(minute: Int) = setBooking { it.copy(startMinute = minute) }
    fun choosePlace(place: ServiceLocation) = setBooking { it.copy(place = place) }
    fun setVisitAddress(v: String) = setBooking { it.copy(visitAddress = v) }

    /** Stylists who do every chosen service (the web's eligible stylists). */
    fun eligibleStylists(): List<SalonStylist> =
        salon.stylists.filter { st -> b.serviceIds.all { id -> st.services.any { it.serviceId == id } } }

    /** Price of the chosen services: the stylist's own price where set, else the salon's. */
    fun totalPrice(stylistId: String? = b.stylistId): Int {
        val stylist = salon.stylists.firstOrNull { it.id == stylistId }
        return b.serviceIds.sumOf { id ->
            val base = salon.services.first { it.id == id }
            stylist?.services?.firstOrNull { it.serviceId == id }?.overridePriceToman ?: base.priceToman
        }
    }

    fun totalDuration(stylistId: String? = b.stylistId): Int {
        val stylist = salon.stylists.firstOrNull { it.id == stylistId }
        return b.serviceIds.sumOf { id ->
            val base = salon.services.first { it.id == id }
            stylist?.services?.firstOrNull { it.serviceId == id }?.overrideDurationMinutes ?: base.durationMinutes
        }
    }

    fun next() {
        val steps = steps()
        val i = steps.indexOf(b.step)
        when (b.step) {
            BookingStep.SERVICES -> if (b.serviceIds.isEmpty()) return fail("دست‌کم یک خدمت انتخاب کنید")
            BookingStep.DATETIME -> if (b.startMinute == null) return fail("روز و ساعت نوبت را انتخاب کنید")
            BookingStep.PLACE -> {
                if (b.place == null) return fail("محل نوبت را انتخاب کنید")
                if (b.place == ServiceLocation.CLIENT_HOME && b.visitAddress.trim().length < 5) return fail("نشانی خود را برای خدمات در منزل وارد کنید")
            }
            else -> Unit
        }
        val nextStep = steps.getOrNull(i + 1) ?: return
        setBooking { it.copy(step = nextStep) }
        if (nextStep == BookingStep.DATETIME) {
            if (b.date == null) chooseDate(salonToday(salon.timezone)) else loadSlots()
        }
    }

    fun back() {
        val steps = steps()
        val i = steps.indexOf(b.step)
        if (i > 0) setBooking { it.copy(step = steps[i - 1]) } else closeBooking()
    }

    private fun loadSlots() {
        val date = b.date ?: return
        if (b.serviceIds.isEmpty()) return
        slotsJob?.cancel()
        slotsJob = viewModelScope.launch {
            setBooking { it.copy(slotsLoading = true, slots = emptyList()) }
            try {
                val slots = container.api.availability(salon.slug, date.toString(), b.serviceIds.joinToString(","), b.stylistId)
                setBooking { it.copy(slots = slots, slotsLoading = false) }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                setBooking { it.copy(slotsLoading = false) }
                fail(persianError(e, "دریافت ساعت‌های خالی انجام نشد", container.json))
            }
        }
    }

    fun submit() {
        val date = b.date ?: return
        val minute = b.startMinute ?: return
        if (b.submitting) return
        viewModelScope.launch {
            setBooking { it.copy(submitting = true) }
            try {
                val place = if (salon.independent) b.place else null
                val created = container.api.book(
                    CreateAppointmentRequest(
                        salonId = salon.id,
                        stylistId = b.stylistId,
                        serviceIds = b.serviceIds,
                        startAt = salonWallTimeToInstant(date, minute, salon.timezone).toString(),
                        serviceLocation = place,
                        visitAddress = if (place == ServiceLocation.CLIENT_HOME) b.visitAddress.trim() else null,
                        notes = b.notes.trim().ifEmpty { null },
                    ),
                )
                setBooking { it.copy(submitting = false, result = created, step = BookingStep.SUCCESS) }
            } catch (e: Exception) {
                setBooking { it.copy(submitting = false) }
                fail(persianError(e, "ثبت نوبت انجام نشد", container.json))
            }
        }
    }

    private fun fail(message: String) {
        _errors.tryEmit(message)
    }
}
