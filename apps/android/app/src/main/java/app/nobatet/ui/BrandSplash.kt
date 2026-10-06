package app.nobatet.ui

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutLinearInEasing
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.R
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val SplashBg = Color(0xFF121319)
private val SplashInk = Color(0xFFF6EFE6)
private val Glow = Color(0xFFF2876A)
private val Rise = CubicBezierEasing(0.2f, 0.8f, 0.2f, 1f)

/**
 * The web's PWA splash (apps/web components/common/SplashScreen.tsx + `.app-splash` in globals.css),
 * once per launch: 0–0.6 s logo 0.7 → 1 with a soft coral glow · 0.6–1.2 s title and tagline slide
 * up · 1.6–2.0 s the screen fades out, then [onDone]. The app loads underneath meanwhile.
 */
@Composable
fun BrandSplash(onDone: () -> Unit) {
    val context = LocalContext.current
    val reduceMotion = remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
    val logo = remember { Animatable(if (reduceMotion) 1f else 0f) }
    val glow = remember { Animatable(0f) }
    val title = remember { Animatable(if (reduceMotion) 1f else 0f) }
    val tagline = remember { Animatable(if (reduceMotion) 1f else 0f) }
    val screen = remember { Animatable(1f) }
    val rise = with(LocalDensity.current) { 14.dp.toPx() }

    LaunchedEffect(Unit) {
        coroutineScope {
            if (!reduceMotion) {
                launch { logo.animateTo(1f, tween(600, easing = Rise)) }
                launch {
                    glow.animateTo(0.25f, keyframes { durationMillis = 1900; 0f at 300; 0.45f at 1100; 0.25f at 1900 })
                }
                launch { title.animateTo(1f, tween(600, delayMillis = 600, easing = Rise)) }
                launch { tagline.animateTo(1f, tween(600, delayMillis = 750, easing = Rise)) }
            }
            launch {
                delay(if (reduceMotion) 700 else 1600)
                screen.animateTo(0f, tween(if (reduceMotion) 300 else 400, easing = FastOutLinearInEasing))
            }
        }
        onDone()
    }

    Box(
        Modifier.fillMaxSize().graphicsLayer { alpha = screen.value }.background(SplashBg)
            // swallow taps while it's on screen, like the web overlay
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {},
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Image(
                painterResource(R.drawable.logo_symbol), contentDescription = null,
                modifier = Modifier.padding(bottom = 16.dp).size(128.dp)
                    .drawBehind {
                        // the CSS drop-shadow glow: a soft coral halo behind the mark
                        val r = size.minDimension * 0.85f
                        drawCircle(Brush.radialGradient(listOf(Glow.copy(alpha = glow.value), Color.Transparent), center, r), r, center)
                    }
                    .graphicsLayer {
                        alpha = logo.value
                        val s = 0.7f + 0.3f * logo.value
                        scaleX = s; scaleY = s
                    },
            )
            Text(
                "نوبتت", color = SplashInk, fontSize = 28.sp, lineHeight = 39.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.graphicsLayer { alpha = title.value; translationY = (1 - title.value) * rise },
            )
            Text(
                "سامانه نوبت‌دهی آنلاین زیبایی", color = SplashInk.copy(alpha = 0.6f), fontSize = 14.sp,
                modifier = Modifier.graphicsLayer { alpha = tagline.value; translationY = (1 - tagline.value) * rise },
            )
        }
    }
}
