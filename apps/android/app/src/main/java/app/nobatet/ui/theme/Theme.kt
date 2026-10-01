package app.nobatet.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import app.nobatet.R

/** The web panel's semantic tokens (apps/web globals.css `.app-root` / `.dark .app-root`). */
@Immutable
data class AppColors(
    val bg: Color,
    val card: Color,
    val card2: Color,
    val ink: Color,
    val muted: Color,
    val line: Color,
    val accent: Color,
    val accentStrong: Color,
    val accentSoft: Color,
    val accentInk: Color,
    val pending: Color,
    val confirmed: Color,
    val done: Color,
    val danger: Color,
)

val LightAppColors = AppColors(
    bg = Color(0xFFF6EFE6), card = Color(0xFFFFFBF6), card2 = Color(0xFFF0E6DA), ink = Color(0xFF2A1D26),
    muted = Color(0xFF7B6B71), line = Color(0xFFE8DCCF), accent = Color(0xFFA34A30), accentStrong = Color(0xFF86391F),
    accentSoft = Color(0xFFF4E1D4), accentInk = Color(0xFFFFFAF5), pending = Color(0xFFB7791F), confirmed = Color(0xFF2F6F68),
    done = Color(0xFF4D7A3A), danger = Color(0xFFB3434C),
)

val DarkAppColors = AppColors(
    bg = Color(0xFF19121A), card = Color(0xFF231A24), card2 = Color(0xFF2D222E), ink = Color(0xFFF4EBE2),
    muted = Color(0xFFB1A1A6), line = Color(0xFF3A2C38), accent = Color(0xFFE07F58), accentStrong = Color(0xFFEE936D),
    accentSoft = Color(0xFF3C2522), accentInk = Color(0xFF1B1219), pending = Color(0xFFE0A94A), confirmed = Color(0xFF5FB3A8),
    done = Color(0xFF8CBF73), danger = Color(0xFFE27880),
)

val LocalAppColors = staticCompositionLocalOf { LightAppColors }

/** Vazirmatn, the web's only UI font, for Persian and Latin alike. */
val Vazirmatn = FontFamily(
    Font(R.font.vazirmatn_regular, FontWeight.Normal),
    Font(R.font.vazirmatn_bold, FontWeight.Bold),
)

private fun typography(): Typography {
    val base = Typography()
    fun TextStyle.v() = copy(fontFamily = Vazirmatn)
    return Typography(
        displayLarge = base.displayLarge.v(), displayMedium = base.displayMedium.v(), displaySmall = base.displaySmall.v(),
        headlineLarge = base.headlineLarge.v().copy(fontWeight = FontWeight.Bold), headlineMedium = base.headlineMedium.v().copy(fontWeight = FontWeight.Bold),
        headlineSmall = base.headlineSmall.v().copy(fontWeight = FontWeight.Bold),
        titleLarge = base.titleLarge.v().copy(fontWeight = FontWeight.Bold), titleMedium = base.titleMedium.v().copy(fontWeight = FontWeight.Bold),
        titleSmall = base.titleSmall.v().copy(fontWeight = FontWeight.Bold),
        bodyLarge = base.bodyLarge.v().copy(fontSize = 16.sp, lineHeight = 28.sp), bodyMedium = base.bodyMedium.v().copy(lineHeight = 24.sp),
        bodySmall = base.bodySmall.v(), labelLarge = base.labelLarge.v().copy(fontWeight = FontWeight.Bold),
        labelMedium = base.labelMedium.v(), labelSmall = base.labelSmall.v(),
    )
}

@Composable
fun NobatetTheme(dark: Boolean = isSystemInDarkTheme(), accent: Color? = null, content: @Composable () -> Unit) {
    val base = if (dark) DarkAppColors else LightAppColors
    // a salon page uses the salon's brand colour (the web's --salon-brand)
    val c = if (accent == null) base else base.copy(accent = accent, accentStrong = accent, accentSoft = accent.copy(alpha = 0.22f), accentInk = Color.White)
    val scheme = if (dark) {
        darkColorScheme(primary = c.accent, onPrimary = c.accentInk, primaryContainer = c.accentSoft, background = c.bg, onBackground = c.ink,
            surface = c.card, onSurface = c.ink, surfaceVariant = c.card2, onSurfaceVariant = c.muted, outline = c.line, error = c.danger)
    } else {
        lightColorScheme(primary = c.accent, onPrimary = c.accentInk, primaryContainer = c.accentSoft, background = c.bg, onBackground = c.ink,
            surface = c.card, onSurface = c.ink, surfaceVariant = c.card2, onSurfaceVariant = c.muted, outline = c.line, error = c.danger)
    }
    // The whole UI is Persian: right-to-left whatever the phone's language.
    CompositionLocalProvider(LocalAppColors provides c, LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(colorScheme = scheme, typography = typography(), content = content)
    }
}
