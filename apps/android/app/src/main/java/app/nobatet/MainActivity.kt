package app.nobatet

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import app.nobatet.ui.AppRoot
import app.nobatet.ui.theme.NobatetTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val container = (application as NobatetApp).container
        setContent {
            NobatetTheme {
                AppRoot(container)
            }
        }
    }
}
