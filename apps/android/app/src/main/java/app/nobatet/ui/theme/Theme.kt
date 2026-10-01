package app.nobatet.ui.theme

import android.content.Context
import android.content.ContextWrapper
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
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

/** The current light/dark mode and «حالت تیره / حالت روشن» (the web's ThemeContext). */
@Immutable
data class ThemeControl(val dark: Boolean, val toggle: () -> Unit)

val LocalThemeControl = staticCompositionLocalOf { ThemeControl(dark = false, toggle = {}) }

/**
 * The web's sign-in pages (`.app-root.guest-root`): near-black with a coral accent. The web's cards
 * are translucent over the backdrop; these are the same colours flattened onto it.
 */
val GuestAppColors = DarkAppColors.copy(
    bg = Color(0xFF0C090E), card = Color(0xFF1A131C), card2 = Color(0xFF1B171C), ink = Color(0xFFF7F0EA),
    muted = Color(0xFF9E9896), line = Color(0xFF2A262C), accent = Color(0xFFF2876A), accentStrong = Color(0xFFF6A07F),
    accentSoft = Color(0xFF2C1B1B),
)

/** The web's rounded-2xl fields, rounded-3xl cards and sheets (Material picks these by size). */
private val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(16.dp), small = RoundedCornerShape(16.dp), medium = RoundedCornerShape(24.dp),
    large = RoundedCornerShape(24.dp), extraLarge = RoundedCornerShape(28.dp),
)

private class BarRequest(var dark: Boolean)

private class BarsStack(private val activity: ComponentActivity?) {
    val entries = mutableListOf<BarRequest>()
    fun apply() {
        entries.lastOrNull()?.let { activity?.systemBars(it.dark) }
    }
}

private val LocalBarsStack = staticCompositionLocalOf<BarsStack?> { null }

private tailrec fun Context.findActivity(): ComponentActivity? = when (this) {
    is ComponentActivity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

private fun ComponentActivity.systemBars(dark: Boolean) {
    val style = SystemBarStyle.auto(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT) { dark }
    enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
}

@Composable
fun NobatetTheme(
    dark: Boolean = LocalThemeControl.current.dark,
    accent: Color? = null,
    guest: Boolean = false,
    content: @Composable () -> Unit,
) {
    val base = if (guest) GuestAppColors else if (dark) DarkAppColors else LightAppColors
    val isDark = dark || guest
    // a salon page uses the salon's brand colour (the web's --salon-brand)
    val c = if (accent == null) base else base.copy(accent = accent, accentStrong = accent, accentSoft = accent.copy(alpha = 0.22f), accentInk = Color.White)
    // Every Material role mapped onto the web tokens, so dialogs, sheets, menus, chips and switches
    // don't fall back to Material's default purple tints.
    val scheme = (if (isDark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.accent, onPrimary = c.accentInk, primaryContainer = c.accentSoft, onPrimaryContainer = c.accentStrong,
        inversePrimary = c.accentSoft,
        secondary = c.accent, onSecondary = c.accentInk, secondaryContainer = c.accentSoft, onSecondaryContainer = c.ink,
        tertiary = c.confirmed, onTertiary = c.accentInk, tertiaryContainer = c.confirmed.copy(alpha = 0.15f), onTertiaryContainer = c.ink,
        background = c.bg, onBackground = c.ink,
        surface = c.card, onSurface = c.ink, surfaceVariant = c.card2, onSurfaceVariant = c.muted, surfaceTint = Color.Transparent,
        surfaceBright = c.card, surfaceDim = c.card2,
        surfaceContainerLowest = c.card, surfaceContainerLow = c.card, surfaceContainer = c.card,
        surfaceContainerHigh = c.card, surfaceContainerHighest = c.card2,
        inverseSurface = c.ink, inverseOnSurface = c.bg,
        outline = c.line, outlineVariant = c.line,
        error = c.danger, onError = Color.White, errorContainer = c.danger.copy(alpha = 0.12f), onErrorContainer = c.danger,
    )
    // Status/navigation bar icons follow the newest theme on screen (a dark salon page, sign-in or
    // the splash over a light app); when it leaves, the one before it takes over again.
    val activity = LocalContext.current.findActivity()
    val stack = LocalBarsStack.current ?: remember(activity) { BarsStack(activity) }
    val request = remember(stack) { BarRequest(isDark) }
    DisposableEffect(stack, request) {
        stack.entries += request
        stack.apply()
        onDispose { stack.entries -= request; stack.apply() }
    }
    SideEffect { if (request.dark != isDark) { request.dark = isDark; stack.apply() } }
    // The whole UI is Persian: right-to-left whatever the phone's language.
    CompositionLocalProvider(LocalAppColors provides c, LocalBarsStack provides stack, LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(colorScheme = scheme, typography = typography(), shapes = AppShapes, content = content)
    }
}
