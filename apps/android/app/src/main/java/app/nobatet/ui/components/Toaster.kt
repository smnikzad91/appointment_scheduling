package app.nobatet.ui.components

import android.view.Gravity
import android.view.WindowManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlin.math.roundToInt

/**
 * App-wide toasts, like the web's (sonner, components/common/ToastProvider.tsx + lib/toastError.ts):
 * every message after an action — saved, sent, failed, invalid — is a toast at the top that goes
 * away by itself after 4 s; page-load failures keep their inline LoadError instead. Callable from
 * anywhere (screens, view models); [Toaster] shows them.
 */
object Toasts {
    enum class Kind { SUCCESS, ERROR, INFO }

    data class Toast(val message: String, val kind: Kind, val id: Long = System.nanoTime())

    private val _current = MutableStateFlow<Toast?>(null)
    val current: StateFlow<Toast?> = _current

    fun success(message: String) = show(message, Kind.SUCCESS)
    fun error(message: String) = show(message, Kind.ERROR)
    fun info(message: String) = show(message, Kind.INFO)

    /** The newest toast replaces the one on screen. */
    private fun show(message: String, kind: Kind) {
        _current.value = Toast(message, kind)
    }

    fun dismiss(id: Long) = _current.update { if (it?.id == id) null else it }
}

// sonner's dark theme with richColors
private data class ToastColors(val bg: Color, val border: Color, val text: Color)

private fun Toasts.Kind.colors() = when (this) {
    Toasts.Kind.SUCCESS -> ToastColors(Color(0xFF001F0F), Color(0xFF003D1C), Color(0xFF59F3A6))
    Toasts.Kind.ERROR -> ToastColors(Color(0xFF2D0607), Color(0xFF4D0408), Color(0xFFFF9EA1))
    Toasts.Kind.INFO -> ToastColors(Color(0xFF000000), Color(0xFF333333), Color(0xFFFCFCFC))
}

private const val DURATION_MS = 4000L

/** Place once at the root. Each toast gets its own window, so it shows over open sheets and dialogs. */
@Composable
fun Toaster() {
    val toast by Toasts.current.collectAsState()
    val top = WindowInsets.statusBars.asPaddingValues().calculateTopPadding()
    var shown by remember { mutableStateOf<Toasts.Toast?>(null) }
    val visible = remember { MutableTransitionState(false) }
    LaunchedEffect(toast) {
        val t = toast
        if (t == null) {
            visible.targetState = false
        } else {
            shown = t
            visible.targetState = true
            delay(DURATION_MS)
            Toasts.dismiss(t.id)
        }
    }
    val t = shown ?: return
    // the window stays only while the toast is in or animating out
    if (visible.currentState || visible.targetState) ToastWindow {
        AnimatedVisibility(
            visibleState = visible,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
        ) { ToastCard(t, top) }
    }
}

/** A non-focusable, non-modal window at the top: taps and back go to the app underneath. */
@Composable
private fun ToastWindow(content: @Composable () -> Unit) {
    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false, usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.run {
                addFlags(
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                )
                clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
                setGravity(Gravity.TOP)
                setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT)
                setWindowAnimations(0)
            }
        }
        content()
    }
}

@Composable
private fun ToastCard(t: Toasts.Toast, statusBar: Dp) {
    val colors = t.kind.colors()
    val shape = RoundedCornerShape(8.dp)
    val density = LocalDensity.current
    var drag by remember(t.id) { mutableFloatStateOf(0f) }
    Box(Modifier.fillMaxWidth().padding(top = statusBar + 12.dp, start = 16.dp, end = 16.dp, bottom = 12.dp), contentAlignment = Alignment.TopCenter) {
        Row(
            Modifier.widthIn(max = 356.dp).fillMaxWidth()
                .offset { IntOffset(0, drag.roundToInt()) }
                // swipe up to dismiss, as on the web
                .draggable(
                    rememberDraggableState { drag = (drag + it).coerceAtMost(0f) }, Orientation.Vertical,
                    onDragStopped = { if (drag < -with(density) { 40.dp.toPx() }) Toasts.dismiss(t.id) else drag = 0f },
                )
                .shadow(12.dp, shape, ambientColor = Color.Black.copy(alpha = 0.3f), spotColor = Color.Black.copy(alpha = 0.3f))
                .clip(shape).background(colors.bg).border(1.dp, colors.border, shape)
                .semantics { liveRegion = LiveRegionMode.Polite }
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                when (t.kind) { Toasts.Kind.SUCCESS -> Icons.Filled.CheckCircle; Toasts.Kind.ERROR -> Icons.Filled.Error; Toasts.Kind.INFO -> Icons.Filled.Info },
                contentDescription = null, tint = colors.text, modifier = Modifier.size(20.dp),
            )
            Text(t.message, color = colors.text, fontSize = 14.sp, lineHeight = 24.sp, modifier = Modifier.padding(start = 10.dp))
        }
    }
}
