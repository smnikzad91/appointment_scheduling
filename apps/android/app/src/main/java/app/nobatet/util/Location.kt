package app.nobatet.util

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Looper
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

/**
 * The phone's position for «نزدیک من» (the web uses navigator.geolocation). A recent last-known
 * fix if there is one, else the first new fix within 10 s; null if location is off or denied.
 * Plain LocationManager — no Google Play services, which many phones in Iran don't have.
 */
@SuppressLint("MissingPermission")
suspend fun currentLocation(context: Context): Location? {
    val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER).filter {
        runCatching { lm.isProviderEnabled(it) }.getOrDefault(false)
    }
    if (providers.isEmpty()) return null
    val recent = providers.mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }
        .filter { System.currentTimeMillis() - it.time < 10 * 60_000 }
        .maxByOrNull { it.time }
    if (recent != null) return recent
    val provider = if (LocationManager.NETWORK_PROVIDER in providers) LocationManager.NETWORK_PROVIDER else providers.first()
    return withTimeoutOrNull(10_000) {
        suspendCancellableCoroutine { cont ->
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    lm.removeUpdates(this)
                    if (cont.isActive) cont.resume(location)
                }
            }
            lm.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
            cont.invokeOnCancellation { lm.removeUpdates(listener) }
        }
    }
}
