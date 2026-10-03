package app.nobatet.update

import app.nobatet.data.AppVersion
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class UpdateRulesTest {
    private fun version(latest: Int, min: Int = 0) = AppVersion(latestVersionCode = latest, minVersionCode = min, downloadUrl = "https://nobatet.app/download/nobatet-$latest.apk")

    @Test fun versionComparison() {
        assertEquals(UpdateNeed.NONE, updateNeed(42, version(latest = 42, min = 1)))
        assertEquals(UpdateNeed.NONE, updateNeed(43, version(latest = 42, min = 1)))
        assertEquals(UpdateNeed.OFFERED, updateNeed(41, version(latest = 42, min = 1)))
        assertEquals(UpdateNeed.OFFERED, updateNeed(41, version(latest = 42, min = 41)))
        assertEquals(UpdateNeed.REQUIRED, updateNeed(40, version(latest = 42, min = 41)))
        // a minimum above the latest still blocks
        assertEquals(UpdateNeed.REQUIRED, updateNeed(42, version(latest = 42, min = 43)))
    }

    @Test fun oldVersionFileStillParses() {
        val json = Json { ignoreUnknownKeys = true }
        val old = json.decodeFromString<AppVersion>("""{"latestVersionCode":1,"latestVersionName":"0.1.0","minVersionCode":1,"downloadUrl":"https://nobatet.app/","notes":"x"}""")
        assertNull(old.apkSha256)
        assertNull(old.apkSize)
        val new = json.decodeFromString<AppVersion>("""{"latestVersionCode":42,"downloadUrl":"u","apkSha256":"AB","apkSize":12345678,"future":true}""")
        assertEquals(12345678L, new.apkSize)
    }

    @Test fun downloadFileNames() {
        assertEquals("nobatet-42.apk", UpdateFiles.apkName(42))
        val inFolder = listOf("nobatet-40.apk", "nobatet-41.apk", "nobatet-42.apk", "notes.txt", "nobatet-x.apk", "nobatet-42.apk.part", "other-41.apk")
        assertEquals(listOf("nobatet-40.apk", "nobatet-41.apk"), UpdateFiles.stale(inFolder, keepCode = 42))
        assertEquals(listOf("nobatet-40.apk", "nobatet-41.apk", "nobatet-42.apk"), UpdateFiles.stale(inFolder, keepCode = null))
    }

    @Test fun hashVerification() {
        val f = File.createTempFile("nobatet-", ".apk").apply { deleteOnExit(); writeText("abc") }
        val abc = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        assertEquals(abc, sha256Hex(f))
        assertTrue(hashMatches(f, abc))
        assertTrue(hashMatches(f, " ${abc.uppercase()}\n"))
        assertFalse(hashMatches(f, abc.replaceFirst('b', 'c')))
        assertFalse(hashMatches(f, null))
        assertFalse(hashMatches(f, "abc"))
        assertFalse(hashMatches(File(f.path + ".missing"), abc))
        assertNull(normalizedSha256(""))
        assertNull(normalizedSha256("zz".repeat(32)))
    }
}
