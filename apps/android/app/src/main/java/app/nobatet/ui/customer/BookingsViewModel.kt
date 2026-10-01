package app.nobatet.ui.customer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.nobatet.data.AppContainer
import app.nobatet.data.AppointmentStatus
import app.nobatet.data.CustomerBooking
import app.nobatet.data.StatusUpdate
import app.nobatet.data.persianError
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.Instant

data class BookingsState(
    val bookings: List<CustomerBooking> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
    val cancelling: String? = null,
) {
    private fun isUpcoming(b: CustomerBooking) =
        (b.status == AppointmentStatus.PENDING || b.status == AppointmentStatus.CONFIRMED) && Instant.parse(b.endAt).isAfter(Instant.now())

    /** Soonest first. */
    val upcoming get() = bookings.filter(::isUpcoming).sortedBy { it.startAt }
    /** Newest first. */
    val past get() = bookings.filterNot(::isUpcoming).sortedByDescending { it.startAt }
}

/** «نوبت‌ها» — GET /appointments/mine; cancel = PATCH /appointments/:id/status CANCELLED. */
class BookingsViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(BookingsState())
    val state: StateFlow<BookingsState> = _state
    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val messages: SharedFlow<String> = _messages

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = it.bookings.isEmpty(), error = null) }
            try {
                val list = container.api.myBookings()
                _state.update { it.copy(bookings = list, loading = false) }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = persianError(e, "دریافت نوبت‌ها انجام نشد", container.json)) }
            }
        }
    }

    fun cancel(id: String) {
        if (_state.value.cancelling != null) return
        viewModelScope.launch {
            _state.update { it.copy(cancelling = id) }
            try {
                container.api.setStatus(id, StatusUpdate(AppointmentStatus.CANCELLED))
                _state.update { s -> s.copy(cancelling = null, bookings = s.bookings.map { if (it.id == id) it.copy(status = AppointmentStatus.CANCELLED) else it }) }
                _messages.tryEmit("نوبت لغو شد")
            } catch (e: Exception) {
                _state.update { it.copy(cancelling = null) }
                _messages.tryEmit(persianError(e, "لغو نوبت انجام نشد", container.json))
            }
        }
    }
}
