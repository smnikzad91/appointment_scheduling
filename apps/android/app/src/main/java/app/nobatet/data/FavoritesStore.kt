package app.nobatet.data

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update

/** The saved salons' ids (like the web's src/lib/favorites.ts store), loaded once, updated optimistically. */
class FavoritesStore(private val api: NobatetApi) {
    private val _ids = MutableStateFlow<Set<String>>(emptySet())
    val ids: StateFlow<Set<String>> = _ids
    private var loaded = false

    suspend fun ensureLoaded() {
        if (loaded) return
        runCatching { api.favoriteIds() }.onSuccess { _ids.value = it.toSet(); loaded = true }
    }

    /** Toggles; on failure the change is undone and the error rethrown. */
    suspend fun toggle(salonId: String) {
        val adding = salonId !in _ids.value
        _ids.update { if (adding) it + salonId else it - salonId }
        try {
            if (adding) api.addFavorite(salonId) else api.removeFavorite(salonId)
        } catch (e: Exception) {
            _ids.update { if (adding) it - salonId else it + salonId }
            throw e
        }
    }

    fun clear() {
        _ids.value = emptySet()
        loaded = false
    }
}
