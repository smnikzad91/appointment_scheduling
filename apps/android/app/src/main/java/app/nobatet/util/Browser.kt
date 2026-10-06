package app.nobatet.util

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Opens a web page in the browser. Website links like /s/{slug} are the app's own deep links, so a
 * plain ACTION_VIEW would come straight back into the app; the selector (a bare https URL, which
 * no app link claims) picks the browser while the page's URL still goes to it.
 */
fun Context.openInBrowser(url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)
    intent.selector = Intent(Intent.ACTION_VIEW, Uri.parse("https://")).addCategory(Intent.CATEGORY_BROWSABLE)
    runCatching { startActivity(intent) }.onFailure {
        // no browser matched the selector: let the system pick
        runCatching { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
    }
}
