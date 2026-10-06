package app.nobatet.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.session by preferencesDataStore(name = "session")
private val TOKEN = stringPreferencesKey("api_token")
private val ROLE = stringPreferencesKey("role")

/** The apps/api token, the only thing the app keeps about the session. */
class TokenStore(private val context: Context) {
    val token: Flow<String?> = context.session.data.map { it[TOKEN] }

    suspend fun current(): String? = token.first()

    suspend fun save(token: String) {
        context.session.edit { it[TOKEN] = token }
    }

    /** The signed-in account's role, for the background notification check (which panel's texts). */
    suspend fun role(): Role? = context.session.data.first()[ROLE]?.let { r -> Role.entries.firstOrNull { it.name == r } }

    suspend fun saveRole(role: Role) {
        context.session.edit { it[ROLE] = role.name }
    }

    suspend fun clear() {
        context.session.edit { it.remove(TOKEN); it.remove(ROLE) }
    }
}
