package app.nobatet

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import app.nobatet.ui.BrandSplash
import app.nobatet.ui.components.Toaster
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import app.nobatet.data.DeepLink
import app.nobatet.data.ThemeChoice
import app.nobatet.ui.AppRoot
import app.nobatet.ui.theme.LocalThemeControl
import app.nobatet.ui.theme.NobatetTheme
import app.nobatet.ui.theme.ThemeControl
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as NobatetApp).container
        // a website link that opened the app (a fresh start; not again after rotation)
        if (savedInstanceState == null) DeepLink.parse(intent?.data)?.let { container.links.link.value = it }
        var themeLoaded = false
        // keep the splash until the saved light/dark choice is read, so the first frame is right
        splash.setKeepOnScreenCondition { !themeLoaded }
        setContent {
            val choice by container.theme.choice.collectAsState(initial = null)
            if (choice != null) themeLoaded = true
            val dark = when (choice) {
                ThemeChoice.LIGHT -> false
                ThemeChoice.DARK -> true
                else -> isSystemInDarkTheme()
            }
            val scope = rememberCoroutineScope()
            var showSplash by rememberSaveable { mutableStateOf(savedInstanceState == null) }
            CompositionLocalProvider(LocalThemeControl provides ThemeControl(dark) { scope.launch { container.theme.save(!dark) } }) {
                NobatetTheme(dark = dark) {
                    Box(Modifier.fillMaxSize()) {
                        AppRoot(container)
                        // the web's PWA splash, once per launch (not again on rotation)
                        if (showSplash) NobatetTheme(dark = true) { BrandSplash(onDone = { showSplash = false }) }
                        Toaster()
                    }
                }
            }
        }
    }

    /** A website link while the app is already open (launchMode singleTask). */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        DeepLink.parse(intent.data)?.let { (application as NobatetApp).container.links.link.value = it }
    }
}
