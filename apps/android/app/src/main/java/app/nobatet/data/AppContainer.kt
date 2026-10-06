package app.nobatet.data

import android.content.Context
import app.nobatet.BuildConfig
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/** Adds `Authorization: Bearer <token>` — the same token works on apps/web's own routes too. */
class AuthInterceptor(private val tokens: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokens.current() }
        val request = if (token == null) chain.request() else chain.request().newBuilder().header("Authorization", "Bearer $token").build()
        return chain.proceed(request)
    }
}

/** Hand-made dependency container (one place, no DI framework yet). */
class AppContainer(context: Context) {
    val appContext: Context = context.applicationContext
    val tokens = TokenStore(context)
    val theme = ThemeStore(context)

    val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        coerceInputValues = true
    }

    private val http: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor(tokens))
        .apply { if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC)) }
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: NobatetApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(http)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(NobatetApi::class.java)

    val web: WebApi = Retrofit.Builder()
        .baseUrl(BuildConfig.WEB_BASE_URL)
        .client(http)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(WebApi::class.java)

    /**
     * Public requests that must not carry the sign-in token or depend on it: the update check (it
     * runs before anyone signs in) and the APK download when DownloadManager can't do it.
     */
    private val publicHttp: OkHttpClient = OkHttpClient.Builder()
        .apply { if (BuildConfig.DEBUG) addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC)) }
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    val updates: UpdateApi = Retrofit.Builder()
        .baseUrl(BuildConfig.WEB_BASE_URL)
        .client(publicHttp)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(UpdateApi::class.java)

    /** One per process: a download outlives the screen that started it. */
    val apkUpdater by lazy { app.nobatet.update.ApkUpdater(appContext, publicHttp) }

    /** The update check's result for this process, so a recreated activity neither asks again nor re-offers a dismissed update. */
    val updateCheck = app.nobatet.update.UpdateCheckCache()

    /** The customer's saved salons, shared by the salon page and home. */
    val favorites = FavoritesStore(api)

    /** A website link opened in the app, handled by the customer panel. */
    val links = PendingLinks()
}
