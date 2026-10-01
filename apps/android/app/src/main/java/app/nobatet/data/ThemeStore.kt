package app.nobatet.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.prefs by preferencesDataStore(name = "prefs")
private val THEME = stringPreferencesKey("theme")

/** The light/dark choice from «حالت تیره / حالت روشن», like the web's localStorage `theme`. */
enum class ThemeChoice { SYSTEM, LIGHT, DARK }

class ThemeStore(private val context: Context) {
    /** Nothing saved = follow the phone's setting, live (as on the web until the user toggles). */
    val choice: Flow<ThemeChoice> = context.prefs.data.map {
        when (it[THEME]) {
            "light" -> ThemeChoice.LIGHT
            "dark" -> ThemeChoice.DARK
            else -> ThemeChoice.SYSTEM
        }
    }

    suspend fun save(dark: Boolean) {
        context.prefs.edit { it[THEME] = if (dark) "dark" else "light" }
    }
}
