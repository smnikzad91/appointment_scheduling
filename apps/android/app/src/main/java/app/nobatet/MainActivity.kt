package app.nobatet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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
            CompositionLocalProvider(LocalThemeControl provides ThemeControl(dark) { scope.launch { container.theme.save(!dark) } }) {
                NobatetTheme(dark = dark) {
                    AppRoot(container)
                }
            }
        }
    }
}
