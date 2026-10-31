@file:OptIn(ExperimentalFoundationApi::class)

package app.nobatet.ui.panels

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.animateScrollBy
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.withFrameNanos
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.LayoutCoordinates
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.navigationBars
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.toPersianDigits
import kotlinx.coroutines.delay

// The web's first-run panel tour (apps/web components/app/PanelTour.tsx): a step opens its tab and
// lights up an element tagged with Modifier.tourTarget (the web's data-tour), dimming the rest.

data class TourStep(
    /** Tab to open first; null → stay on the current one. */
    val tab: Int? = null,
    /** [tourTarget] key of the element to spotlight; null → a centred card. */
    val target: String? = null,
    /** Skip the step when its element never shows (e.g. a card only some accounts have). */
    val optional: Boolean = false,
    val title: String,
    val body: String,
)

/** A panel's tour; [id] is `<panel>:<userId>`, so each account on the phone gets it once. */
data class PanelTourSpec(val id: String, val steps: List<TourStep>)

internal class TourEntry(val bring: BringIntoViewRequester) {
    var coords: LayoutCoordinates? = null
}

/** A lazy list that may hold a step's element below the fold (not composed until scrolled to). */
internal interface TourScroller {
    suspend fun forward(): Boolean
    suspend fun top()
}

class TourState {
    private val entries = LinkedHashMap<String, MutableList<TourEntry>>()
    private val scrollers = mutableListOf<TourScroller>()

    internal fun add(key: String, e: TourEntry) { entries.getOrPut(key) { mutableListOf() } += e }
    internal fun remove(key: String, e: TourEntry) { entries[key]?.remove(e) }
    internal fun addScroller(s: TourScroller) { scrollers += s }
    internal fun removeScroller(s: TourScroller) { scrollers -= s }

    /** The first laid-out, visible element with this key. */
    internal fun find(key: String): TourEntry? = entries[key]?.firstOrNull { e ->
        e.coords?.let { it.isAttached && it.size.width > 0 && it.size.height > 0 } == true
    }

    /** Scroll the lists a page down; false when none could move. */
    internal suspend fun scrollForward(): Boolean = scrollers.toList().any { it.forward() }
    internal suspend fun scrollTop() = scrollers.toList().forEach { it.top() }
}

val LocalTour = staticCompositionLocalOf<TourState?> { null }

/** Tags an element as a tour step's target (the web's `data-tour`). */
fun Modifier.tourTarget(key: String): Modifier = composed {
    val tour = LocalTour.current ?: return@composed Modifier
    val bring = remember { BringIntoViewRequester() }
    val entry = remember { TourEntry(bring) }
    DisposableEffect(tour, key) {
        tour.add(key, entry)
        onDispose { tour.remove(key, entry) }
    }
    Modifier.bringIntoViewRequester(bring).onGloballyPositioned { entry.coords = it }
}

/** Lets the tour scroll this list to find a target that isn't composed yet. */
@Composable
fun TourScrollable(list: LazyListState) {
    val tour = LocalTour.current ?: return
    DisposableEffect(tour, list) {
        val s = object : TourScroller {
            override suspend fun forward(): Boolean {
                if (!list.canScrollForward) return false
                list.animateScrollBy(list.layoutInfo.viewportSize.height * 0.7f)
                return true
            }
            override suspend fun top() = list.scrollToItem(0)
        }
        tour.addScroller(s)
        onDispose { tour.removeScroller(s) }
    }
}

private fun Context.tourPrefs() = getSharedPreferences("tour", Context.MODE_PRIVATE)
private fun doneKey(id: String) = "tour-done:$id"

/** Opens once by itself per panel and account (900 ms after the shell shows), and again from [start]. */
class PanelTourControl(open: Boolean) {
    var open by mutableStateOf(open)
        internal set
    fun start() { open = true }
}

@Composable
fun rememberPanelTour(id: String?): PanelTourControl {
    val context = LocalContext.current
    val control = remember { PanelTourControl(false) }
    LaunchedEffect(id) {
        if (id == null || context.tourPrefs().getBoolean(doneKey(id), false)) return@LaunchedEffect
        // let the shell and the first screen settle before measuring targets
        delay(900)
        control.open = true
    }
    return control
}

private fun PanelTourControl.close(context: Context, id: String) {
    open = false
    context.tourPrefs().edit().putBoolean(doneKey(id), true).apply()
}

private val Coral = Color(0xFFF2876A)
private val Dim = Color(0xB8080A10)
private val Pad = 6.dp
private val Corner = 16.dp
/** Rough height of the caption card before it's measured. */
private val CardH = 250.dp
/** How long to wait for a step's element (the screen may still be loading its data). */
private const val SEEK_MS = 6000L
private val WaveEase = CubicBezierEasing(0.15f, 0.55f, 0.3f, 1f)

/**
 * The spotlight overlay, drawn over the whole panel: walks through the steps (opening each step's
 * tab), waits for the step's element (scrolling lazy lists to find it), brings it into view and dims
 * everything around it with a glowing coral border and waves rippling outward, with a caption card
 * on the roomier side. Mount it only while open, so every run starts at the first step.
 */
@Composable
fun PanelTourOverlay(state: TourState, spec: PanelTourSpec, control: PanelTourControl, selectTab: (Int) -> Unit) {
    val context = LocalContext.current
    val close = { control.close(context, spec.id) }
    val steps = spec.steps
    var index by remember { mutableIntStateOf(0) }
    var dir by remember { mutableIntStateOf(1) }
    // false while looking for the step's element; then the card shows (over [spot], or centred)
    var found by remember { mutableStateOf(false) }
    var spot by remember { mutableStateOf<Rect?>(null) }
    var active by remember { mutableStateOf<TourEntry?>(null) }
    var overlay by remember { mutableStateOf<LayoutCoordinates?>(null) }
    val anim = remember { Animatable(Rect.Zero, Rect.VectorConverter) }
    val density = LocalDensity.current
    val step = steps.getOrNull(index) ?: return
    val last = index >= steps.size - 1
    val select by rememberUpdatedState(selectTab)

    fun go(delta: Int) {
        if (delta == 1 && last) return close()
        dir = delta
        found = false
        index = (index + delta).coerceAtLeast(0)
    }

    BackHandler(onBack = close)

    LaunchedEffect(index) {
        active = null
        spot = null
        step.tab?.let(select)
        val key = step.target
        if (key == null) { found = true; return@LaunchedEffect }
        val started = System.currentTimeMillis()
        var triedTop = false
        while (System.currentTimeMillis() - started < SEEK_MS) {
            state.find(key)?.let { e ->
                val size = e.coords?.size
                // a margin around it, so it doesn't stick to the edge after scrolling
                val margin = with(density) { 120.dp.toPx() }
                if (size != null) runCatching { e.bring.bringIntoView(Rect(0f, -margin, size.width.toFloat(), size.height + margin)) }
                active = e
                found = true
                return@LaunchedEffect
            }
            delay(150)
            // not composed yet: after a moment (data loading), page through the lazy lists, then from the top once
            if (System.currentTimeMillis() - started > 700 && !state.scrollForward() && !triedTop) {
                triedTop = true
                state.scrollTop()
            }
        }
        if (step.optional) {
            if (dir == 1 && last) close() else index = (index + dir).coerceAtLeast(0)
        } else found = true
    }

    // follow the element every frame (scrolling, the screen's entrance animation)
    LaunchedEffect(Unit) {
        while (true) {
            withFrameNanos { }
            val c = active?.coords
            val o = overlay
            spot = if (c != null && c.isAttached && o != null && o.isAttached) {
                val pad = with(density) { Pad.toPx() }
                val p = o.localPositionOf(c, Offset.Zero)
                Rect(p.x - pad, p.y - pad, p.x + c.size.width + pad, p.y + c.size.height + pad)
            } else null
        }
    }
    LaunchedEffect(spot) {
        val s = spot ?: return@LaunchedEffect
        if (anim.value == Rect.Zero) anim.snapTo(s) else anim.animateTo(s, spring(stiffness = Spring.StiffnessMediumLow))
    }
    LaunchedEffect(found, spot == null) { if (found && spot == null) anim.snapTo(Rect.Zero) }

    val waves = rememberInfiniteTransition(label = "tour")
    val wave by waves.animateFloat(0f, 1f, infiniteRepeatable(tween(2100, easing = LinearEasing)), label = "wave")
    val glow by waves.animateFloat(0f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "glow")

    val c = LocalAppColors.current
    Box(
        Modifier.fillMaxSize()
            .onGloballyPositioned { overlay = it }
            // the page under the tour doesn't take taps or scrolls
            .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
            .graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }
            .drawBehind {
                drawRect(Dim)
                val r = anim.value.takeIf { spot != null && it != Rect.Zero } ?: return@drawBehind
                val corner = Corner.toPx()
                val stroke = 3.dp.toPx()
                // the glow: soft rings fading outward, breathing
                val spread = (18.dp.toPx() + 20.dp.toPx() * glow)
                for (i in 1..6) {
                    val d = spread * i / 6f
                    drawRoundRect(
                        Coral.copy(alpha = (0.75f + 0.2f * glow) * (1f - i / 7f) * 0.35f),
                        topLeft = Offset(r.left - d, r.top - d), size = androidx.compose.ui.geometry.Size(r.width + 2 * d, r.height + 2 * d),
                        cornerRadius = CornerRadius(corner + d), style = Stroke(spread / 6f),
                    )
                }
                drawRoundRect(Color.Black, r.topLeft, r.size, CornerRadius(corner), blendMode = BlendMode.Clear)
                drawRoundRect(Coral, r.topLeft, r.size, CornerRadius(corner), style = Stroke(stroke))
                // three waves rippling out, a third of a cycle apart
                for (k in 0..2) {
                    val p = (wave + k / 3f) % 1f
                    val d = stroke + 35.dp.toPx() * WaveEase.transform(p)
                    drawRoundRect(
                        Coral.copy(alpha = 1f - p),
                        topLeft = Offset(r.left - d, r.top - d), size = androidx.compose.ui.geometry.Size(r.width + 2 * d, r.height + 2 * d),
                        cornerRadius = CornerRadius(corner + d), style = Stroke(stroke),
                    )
                }
            },
    ) {
        if (!found) return@Box
        var cardH by remember { mutableIntStateOf(0) }
        val h = overlay?.size?.height ?: 0
        val gap = with(density) { 14.dp.toPx() }
        val needed = (if (cardH > 0) cardH.toFloat() else with(density) { CardH.toPx() }) + with(density) { 20.dp.toPx() }
        val bottomInset = WindowInsets.navigationBars.getBottom(density) + with(density) { 16.dp.toPx() }
        val s = spot
        // below the spotlight if it fits, else above, else pinned to the bottom over the page
        val y = when {
            s == null -> (h - cardH) / 2f
            h - s.bottom >= needed -> s.bottom + gap
            s.top >= needed -> s.top - gap - cardH
            else -> h - bottomInset - cardH
        }
        key(index) {
            val rise = remember { Animatable(0f) }
            LaunchedEffect(Unit) { rise.animateTo(1f, tween(320)) }
            Column(
                Modifier.align(Alignment.TopCenter).offset { IntOffset(0, y.toInt() + ((1f - rise.value) * 24.dp.toPx()).toInt()) }
                    .alpha(if (cardH == 0) 0f else rise.value)
                    .padding(horizontal = 16.dp).widthIn(max = 384.dp).fillMaxWidth()
                    .onSizeChanged { cardH = it.height }
                    .clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp))
                    // taps on the card stay on the card
                    .clickable(interactionSource = remember { MutableInteractionSource() }, indication = null) {}
                    .padding(20.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(step.title, color = c.ink, fontSize = 17.sp, lineHeight = 26.sp, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    Icon(
                        Icons.Outlined.Close, contentDescription = "بستن تور", tint = c.muted,
                        modifier = Modifier.size(32.dp).clip(CircleShape).clickable(role = Role.Button, onClick = close).padding(6.dp),
                    )
                }
                Text(step.body, color = c.muted, fontSize = 14.sp, lineHeight = 28.sp, modifier = Modifier.padding(top = 8.dp))
                Row(Modifier.padding(top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    val progress = "${(index + 1).toString().toPersianDigits()} از ${steps.size.toString().toPersianDigits()}"
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(progress, color = c.muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Box(Modifier.fillMaxWidth().height(4.dp).clip(CircleShape).background(c.line)) {
                            Box(Modifier.fillMaxWidth((index + 1f) / steps.size).fillMaxHeight().clip(CircleShape).background(c.accent))
                        }
                    }
                    Spacer(Modifier.size(12.dp))
                    if (index > 0) {
                        Box(
                            Modifier.size(40.dp).clip(CircleShape).border(1.dp, c.line, CircleShape).clickable(role = Role.Button, onClickLabel = "قبلی") { go(-1) },
                            contentAlignment = Alignment.Center,
                        ) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, contentDescription = "قبلی", tint = c.ink) }
                    } else {
                        Text(
                            "رد کردن", color = c.muted, fontSize = 14.sp, fontWeight = FontWeight.Bold,
                            modifier = Modifier.clip(CircleShape).clickable(role = Role.Button, onClick = close).padding(horizontal = 12.dp, vertical = 10.dp),
                        )
                    }
                    Spacer(Modifier.size(8.dp))
                    Row(
                        Modifier.height(40.dp).clip(CircleShape).background(c.accent).clickable(role = Role.Button) { go(1) }.padding(horizontal = 20.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(if (last) "شروع کنیم" else if (index == 0) "بزن بریم" else "بعدی", color = c.accentInk, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        if (!last) Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, contentDescription = null, tint = c.accentInk, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
