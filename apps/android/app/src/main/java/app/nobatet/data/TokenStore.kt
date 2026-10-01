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

/** The apps/api token, the only thing the app keeps about the session. */
class TokenStore(private val context: Context) {
    val token: Flow<String?> = context.session.data.map { it[TOKEN] }

    suspend fun current(): String? = token.first()

    suspend fun save(token: String) {
        context.session.edit { it[TOKEN] = token }
    }

    suspend fun clear() {
        context.session.edit { it.remove(TOKEN) }
    }
}
