package app.nobatet.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.ModalBottomSheetProperties
import androidx.compose.material3.SheetValue
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.ProvideTextStyle
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.nobatet.ui.theme.LocalAppColors

// The web's form controls and buttons (apps/web components/app/ui.tsx): Field + TextInput, Button
// variants, Toggle, ChipTabs, and Sheet in place of centred dialogs.

/** The web's Field + TextInput: the label above in small bold muted text, a rounded-2xl card-coloured box. */
@Composable
fun AppTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    label: (@Composable () -> Unit)? = null,
    placeholder: (@Composable () -> Unit)? = null,
    leadingIcon: (@Composable () -> Unit)? = null,
    trailingIcon: (@Composable () -> Unit)? = null,
    prefix: (@Composable () -> Unit)? = null,
    suffix: (@Composable () -> Unit)? = null,
    supportingText: (@Composable () -> Unit)? = null,
    isError: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = false,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1,
    shape: Shape = RoundedCornerShape(16.dp),
) {
    val c = LocalAppColors.current
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (label != null) Box(Modifier.padding(horizontal = 4.dp)) {
            ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 13.sp, lineHeight = 20.sp, fontWeight = FontWeight.Bold, color = c.muted)) { label() }
        }
        OutlinedTextField(
            value = value, onValueChange = onValueChange, modifier = Modifier.fillMaxWidth(), enabled = enabled, readOnly = readOnly,
            // 16 like the web's inputs (smaller makes phones zoom on the web; here it just reads better)
            textStyle = LocalTextStyle.current.copy(fontSize = 16.sp),
            placeholder = placeholder?.let { p -> { ProvideTextStyle(LocalTextStyle.current.copy(color = c.muted.copy(alpha = 0.7f))) { p() } } },
            leadingIcon = leadingIcon, trailingIcon = trailingIcon, prefix = prefix, suffix = suffix, supportingText = supportingText,
            isError = isError, visualTransformation = visualTransformation, keyboardOptions = keyboardOptions, keyboardActions = keyboardActions,
            singleLine = singleLine, maxLines = maxLines, minLines = minLines, shape = shape,
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = c.card, unfocusedContainerColor = c.card, disabledContainerColor = c.card2, errorContainerColor = c.card,
                focusedBorderColor = c.accent, unfocusedBorderColor = c.line, disabledBorderColor = c.line, errorBorderColor = c.danger,
                focusedTextColor = c.ink, unfocusedTextColor = c.ink, disabledTextColor = c.muted, cursorColor = c.accent,
                focusedTrailingIconColor = c.muted, unfocusedTrailingIconColor = c.muted, focusedLeadingIconColor = c.muted, unfocusedLeadingIconColor = c.muted,
            ),
        )
    }
}

/** The web's ghost/link button: bold accent text, rounded-2xl press area. */
@Composable
fun AppTextButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    val c = LocalAppColors.current
    TextButton(
        onClick = onClick, modifier = modifier, enabled = enabled, shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.textButtonColors(contentColor = c.accent, disabledContentColor = c.muted.copy(alpha = 0.5f)),
    ) { ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold)) { content() } }
}

/** The web's secondary Button: card colour, hairline border, ink text, 48 high, rounded-2xl. */
@Composable
fun SecondaryButton(onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, content: @Composable RowScope.() -> Unit) {
    val c = LocalAppColors.current
    OutlinedButton(
        onClick = onClick, modifier = modifier.heightIn(min = 48.dp), enabled = enabled, shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, c.line),
        colors = ButtonDefaults.outlinedButtonColors(containerColor = c.card, contentColor = c.ink, disabledContentColor = c.muted),
    ) { ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 15.sp, fontWeight = FontWeight.Bold)) { content() } }
}

/**
 * The web's iOS-style Toggle, mirrored for RTL like iOS/Android: off rests at the right, on slides
 * to the left.
 */
@Composable
fun AppSwitch(checked: Boolean, onCheckedChange: ((Boolean) -> Unit)?, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val c = LocalAppColors.current
    val track by animateColorAsState(if (checked) c.accent else c.card2, label = "track")
    val bias by animateFloatAsState(if (checked) 1f else -1f, label = "thumb")
    Box(
        modifier.alpha(if (enabled) 1f else 0.5f).size(width = 52.dp, height = 32.dp).clip(CircleShape).background(track)
            .then(if (checked) Modifier else Modifier.border(1.dp, c.line, CircleShape))
            .then(
                if (onCheckedChange != null) Modifier.toggleable(value = checked, enabled = enabled, role = Role.Switch, onValueChange = onCheckedChange)
                else Modifier,
            )
            .padding(4.dp),
        // BiasAlignment follows the layout direction: -1 = start (right in RTL), 1 = end
        contentAlignment = BiasAlignment(bias, 0f),
    ) { Box(Modifier.size(24.dp).shadow(2.dp, CircleShape).clip(CircleShape).background(Color.White)) }
}

/** The web's ChipTabs chip: the active one filled in ink, the others outlined on card. */
@Composable
fun AppChip(selected: Boolean, onClick: () -> Unit, label: @Composable () -> Unit, modifier: Modifier = Modifier) {
    val c = LocalAppColors.current
    Box(
        modifier.height(40.dp).clip(CircleShape).background(if (selected) c.ink else c.card)
            .then(if (selected) Modifier else Modifier.border(1.dp, c.line, CircleShape))
            .clickable(role = Role.Tab, onClick = onClick).padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 14.sp, fontWeight = FontWeight.Bold, color = if (selected) c.bg else c.muted)) { label() }
    }
}

/** A row of [AppChip]s that scrolls sideways (the web's ChipTabs). */
@Composable
fun <T> ChipTabs(options: List<Pair<T, String>>, value: T, modifier: Modifier = Modifier, onChange: (T) -> Unit) {
    Row(
        modifier.fillMaxWidth().horizontalScroll(androidx.compose.foundation.rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) { options.forEach { (v, label) -> AppChip(v == value, { onChange(v) }, { Text(label) }) } }
}

/**
 * The web's Sheet in place of a centred dialog: same slots as Material's AlertDialog, shown as a
 * bottom sheet with the title, the content and the buttons at the bottom.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AppDialog(
    onDismissRequest: () -> Unit,
    confirmButton: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    dismissButton: (@Composable () -> Unit)? = null,
    title: (@Composable () -> Unit)? = null,
    text: (@Composable () -> Unit)? = null,
    // false: swipe, scrim tap and back can't close it (a required step, e.g. a mandatory update)
    dismissible: Boolean = true,
) {
    val c = LocalAppColors.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true, confirmValueChange = { dismissible || it != SheetValue.Hidden })
    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        containerColor = c.bg,
        properties = ModalBottomSheetProperties(shouldDismissOnBackPress = dismissible),
    ) {
        Column(modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (title != null) ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 18.sp, lineHeight = 28.sp, fontWeight = FontWeight.Bold, color = c.ink)) { title() }
            if (text != null) ProvideTextStyle(LocalTextStyle.current.copy(fontSize = 15.sp, lineHeight = 26.sp, color = c.ink)) { text() }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End), verticalAlignment = Alignment.CenterVertically) {
                dismissButton?.invoke()
                confirmButton()
            }
        }
    }
}

/** The web's PageHeader: a large title with an optional subtitle and trailing action. */
@Composable
fun PageHeader(title: String, subtitle: String? = null, modifier: Modifier = Modifier, action: (@Composable () -> Unit)? = null) {
    val c = LocalAppColors.current
    Row(modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom) {
        Column(Modifier.weight(1f)) {
            Text(title, color = c.ink, fontSize = 26.sp, lineHeight = 34.sp, fontWeight = FontWeight.Bold)
            if (subtitle != null) Text(subtitle, color = c.muted, fontSize = 14.sp, lineHeight = 22.sp, modifier = Modifier.padding(top = 4.dp))
        }
        action?.invoke()
    }
}
