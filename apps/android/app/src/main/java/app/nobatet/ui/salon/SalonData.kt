package app.nobatet.ui.salon

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import app.nobatet.data.AppContainer
import app.nobatet.data.OwnerSalon
import app.nobatet.data.OwnerService
import app.nobatet.data.OwnerStylist
import app.nobatet.data.OwnerSubscription
import app.nobatet.data.StaffAppointment
import app.nobatet.ui.staff.BookableService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/** What the salon panel's tabs share: the salon, its services and stylists, appointments, plan. */
class SalonData(private val container: AppContainer, private val scope: CoroutineScope) {
    var salon by mutableStateOf<OwnerSalon?>(null)
    var services by mutableStateOf<List<OwnerService>>(emptyList())
    var stylists by mutableStateOf<List<OwnerStylist>>(emptyList())
    var appointments by mutableStateOf<List<StaffAppointment>?>(null)
    var subscription by mutableStateOf<OwnerSubscription?>(null)
    var error by mutableStateOf<String?>(null)

    fun loadAll() {
        loadSalon(); loadCatalog(); loadAppointments(); loadSubscription()
    }

    fun loadSalon() = scope.launch {
        runCatching { container.api.mySalon() }.onSuccess { salon = it; error = null }
            .onFailure { if (salon == null) error = app.nobatet.data.persianError(it, "خطا در دریافت اطلاعات سالن", container.json) }
    }

    fun loadCatalog() = scope.launch {
        launch { runCatching { container.api.mySalonServices() }.onSuccess { services = it } }
        launch { runCatching { container.api.mySalonStylists() }.onSuccess { stylists = it } }
    }

    fun loadAppointments() = scope.launch { runCatching { container.api.mySalonAppointments() }.onSuccess { appointments = it } }

    fun loadSubscription() = scope.launch { runCatching { container.api.mySubscription() }.onSuccess { subscription = it } }

    /** A stylist's bookable services at their own price/duration (the salon's where not set). */
    fun bookableFor(stylistId: String): List<BookableService> {
        val st = stylists.firstOrNull { it.id == stylistId } ?: return emptyList()
        return st.services.mapNotNull { link ->
            val s = services.firstOrNull { it.id == link.serviceId && it.active } ?: return@mapNotNull null
            BookableService(s.id, s.name, link.overridePriceToman ?: s.priceToman, link.overrideDurationMinutes ?: s.durationMinutes)
        }
    }
}
