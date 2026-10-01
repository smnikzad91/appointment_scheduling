package app.nobatet.ui.customer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.nobatet.data.AppContainer
import app.nobatet.data.SalonCard
import app.nobatet.data.SalonKind
import app.nobatet.data.persianError
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DiscoverState(
    val query: String = "",
    /** null = همه, SALON = سالن‌ها, INDEPENDENT = آرایشگران مستقل. */
    val kind: SalonKind? = null,
    /** «نزدیک من»: the customer's position — results nearest first, with distances. */
    val near: Pair<Double, Double>? = null,
    val locating: Boolean = false,
    val showMap: Boolean = false,
    val items: List<SalonCard> = emptyList(),
    val total: Int = 0,
    val loading: Boolean = true,
    val loadingMore: Boolean = false,
    val error: String? = null,
)

private const val PAGE = 20

/** GET /salons/search, as the web's SalonSearch (text, kind filter, sorted by rating; 20 per page). */
class DiscoverViewModel(private val container: AppContainer) : ViewModel() {
    private val _state = MutableStateFlow(DiscoverState())
    val state: StateFlow<DiscoverState> = _state
    private var job: Job? = null

    init {
        search(debounce = false)
    }

    fun setQuery(q: String) {
        _state.update { it.copy(query = q) }
        search(debounce = true)
    }

    fun setKind(kind: SalonKind?) {
        _state.update { it.copy(kind = kind) }
        search(debounce = false)
    }

    fun retry() = search(debounce = false)

    fun setLocating(on: Boolean) = _state.update { it.copy(locating = on) }

    fun setNear(lat: Double, lng: Double) {
        _state.update { it.copy(near = lat to lng, locating = false) }
        search(debounce = false)
    }

    fun clearNear() {
        _state.update { it.copy(near = null) }
        search(debounce = false)
    }

    fun setShowMap(on: Boolean) = _state.update { it.copy(showMap = on) }

    fun loadMore() {
        val s = _state.value
        if (s.loading || s.loadingMore || s.items.size >= s.total) return
        viewModelScope.launch {
            _state.update { it.copy(loadingMore = true) }
            runCatching { container.api.searchSalons(params(s, offset = s.items.size)) }
                .onSuccess { r -> _state.update { it.copy(items = it.items + r.items, total = r.total, loadingMore = false) } }
                .onFailure { _state.update { it.copy(loadingMore = false) } }
        }
    }

    private fun search(debounce: Boolean) {
        job?.cancel()
        job = viewModelScope.launch {
            if (debounce) delay(350)
            _state.update { it.copy(loading = true, error = null) }
            try {
                val r = container.api.searchSalons(params(_state.value, offset = 0))
                _state.update { it.copy(items = r.items, total = r.total, loading = false) }
            } catch (e: Exception) {
                if (e is kotlinx.coroutines.CancellationException) throw e
                _state.update { it.copy(loading = false, error = persianError(e, "جستجو انجام نشد", container.json)) }
            }
        }
    }

    private fun params(s: DiscoverState, offset: Int) = buildMap {
        if (s.query.isNotBlank()) put("q", s.query.trim())
        s.kind?.let { put("kind", it.name) }
        val near = s.near
        if (near != null) {
            put("lat", near.first.toString())
            put("lng", near.second.toString())
            put("sort", "distance")
        } else {
            put("sort", "rating")
        }
        put("limit", PAGE.toString())
        put("offset", offset.toString())
    }
}
