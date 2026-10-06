package app.nobatet.update

import app.nobatet.data.AppVersion
import java.io.File
import java.security.MessageDigest

/** What app-version.json asks of this build. */
enum class UpdateNeed { NONE, OFFERED, REQUIRED }

fun updateNeed(currentCode: Int, v: AppVersion): UpdateNeed = when {
    currentCode < v.minVersionCode -> UpdateNeed.REQUIRED
    currentCode < v.latestVersionCode -> UpdateNeed.OFFERED
    else -> UpdateNeed.NONE
}

/** Downloaded update APKs: `nobatet-<versionCode>.apk`, the same names apps/web serves at /download/. */
object UpdateFiles {
    private val APK = Regex("""^nobatet-\d+\.apk$""")

    fun apkName(versionCode: Int) = "nobatet-$versionCode.apk"

    /** Update APKs in the folder other than the one for [keepCode] (pass null to drop them all). */
    fun stale(names: Collection<String>, keepCode: Int?): List<String> =
        names.filter { APK.matches(it) && it != keepCode?.let(::apkName) }
}

private val SHA256_HEX = Regex("^[0-9a-f]{64}$")

/** The expected hash in app-version.json, or null when missing/malformed (no in-app install then). */
fun normalizedSha256(expected: String?): String? = expected?.trim()?.lowercase()?.takeIf { SHA256_HEX.matches(it) }

fun sha256Hex(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buf = ByteArray(64 * 1024)
        while (true) {
            val n = input.read(buf)
            if (n < 0) break
            digest.update(buf, 0, n)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

/** True only for an existing file whose SHA-256 is [expected]; never true without an expected hash. */
fun hashMatches(file: File, expected: String?): Boolean {
    val want = normalizedSha256(expected) ?: return false
    return file.isFile && sha256Hex(file) == want
}

/** The update check's result, kept for the life of the process (the app container holds one). */
class UpdateCheckCache {
    @Volatile var version: app.nobatet.data.AppVersion? = null
    @Volatile var checked: Boolean = false
    /** «بعداً» on an optional update: not offered again until the next cold start. */
    @Volatile var dismissed: Boolean = false
}
