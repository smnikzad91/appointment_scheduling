package app.nobatet.ui.components

import android.content.Context
import android.content.Intent
import android.print.PrintAttributes
import android.util.Base64
import android.print.PrintManager
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.TableChart
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import app.nobatet.R
import app.nobatet.ui.theme.LocalAppColors
import app.nobatet.util.formatAmount
import app.nobatet.util.toJalali
import app.nobatet.util.toPersianDigits
import app.nobatet.util.toSalonDateTime
import java.io.File
import java.time.Instant

// Accounting export, as apps/web lib/accountingExport.ts + components/app/AccountingReport.tsx:
// one report description rendered two ways — a CSV for Excel and a printable page («ذخیره
// به‌صورت PDF» in the print dialog).

/** A cell: text, or a number (an amount Excel can sum). */
sealed interface Cell {
    data class T(val text: String) : Cell
    data class N(val value: Number) : Cell
}

fun cell(text: String): Cell = Cell.T(text)
fun cell(value: Number): Cell = Cell.N(value)

data class ReportSection(val title: String, val columns: List<String>, val rows: List<List<Cell>>, val totals: List<Cell>? = null)

/** [fileSlug] names the CSV, e.g. "hesabdari-1405-07". */
data class Report(val title: String, val subtitle: String, val fileSlug: String, val sections: List<ReportSection>)

/** "1405/07/05" — the salon-local Jalali date with Latin digits, so Excel can sort it. */
fun jalaliDate(iso: String, tz: String?): String {
    val j = Instant.parse(iso).toSalonDateTime(tz).toLocalDate().toJalali()
    return "%04d/%02d/%02d".format(java.util.Locale.ROOT, j.year, j.month, j.day)
}

/** "1405-07" for a month starting on [startIso]. */
fun jalaliMonthSlug(startIso: String, tz: String?) = jalaliDate(startIso, tz).take(7).replace('/', '-')

private fun csvCell(c: Cell): String {
    val s = when (c) { is Cell.T -> c.text; is Cell.N -> c.value.toString() }
    return if (Regex("[\",\r\n]").containsMatchIn(s)) "\"" + s.replace("\"", "\"\"") + "\"" else s
}

fun Report.toCsv(): String {
    val lines = mutableListOf(listOf(cell(title)), listOf(cell(subtitle)))
    sections.forEach { sec ->
        lines += listOf(emptyList(), listOf(cell(sec.title)), sec.columns.map { cell(it) }) + sec.rows
        sec.totals?.let { lines += it }
    }
    return lines.joinToString("\r\n") { row -> row.joinToString(",") { csvCell(it) } }
}

private fun html(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

/** Amounts with separators, a fractional percent with «٫», text with Persian digits (the web's printNumber). */
private fun printCell(c: Cell): String = when (c) {
    is Cell.N -> if (c.value.toDouble() % 1.0 == 0.0) formatAmount(c.value.toLong()) else c.value.toString().replace(".", "٫").toPersianDigits()
    is Cell.T -> html(c.text).toPersianDigits()
}

/** A bundled font as a data: URL (resource paths aren't stable once release builds shrink resources). */
private fun fontDataUrl(context: Context, res: Int): String =
    "data:font/ttf;base64," + Base64.encodeToString(context.resources.openRawResource(res).use { it.readBytes() }, Base64.NO_WRAP)

/** The print-only A4 page (the web's PrintableReport + its print CSS), in Vazirmatn. */
fun Report.toHtml(context: Context): String = buildString {
    append("""<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><style>
        @font-face { font-family: Vazirmatn; src: url('${fontDataUrl(context, R.font.vazirmatn_regular)}'); }
        @font-face { font-family: Vazirmatn; font-weight: bold; src: url('${fontDataUrl(context, R.font.vazirmatn_bold)}'); }
        @page { size: A4; margin: 14mm; }
        body { font-family: Vazirmatn, Tahoma, sans-serif; color: #111; font-size: 10pt; }
        h1 { font-size: 15pt; margin: 0 0 2mm; } h2 { font-size: 11.5pt; margin: 7mm 0 2mm; }
        .sub { color: #555; margin: 0 0 4mm; } .empty { color: #777; } .foot { color: #777; margin-top: 6mm; font-size: 8.5pt; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        th, td { border: 1px solid #ccc; padding: 1.6mm 2mm; text-align: right; vertical-align: top; }
        th { background: #f2ece5; } tfoot td { font-weight: bold; background: #faf7f3; }
        td.num { white-space: nowrap; direction: ltr; text-align: left; } tr { page-break-inside: avoid; }
    </style></head><body>""")
    append("<h1>${html(title).toPersianDigits()}</h1><p class=\"sub\">${html(subtitle).toPersianDigits()}</p>")
    sections.forEach { sec ->
        append("<section><h2>${html(sec.title)}</h2>")
        if (sec.rows.isEmpty()) append("<p class=\"empty\">موردی ثبت نشده است.</p>")
        else {
            append("<table><thead><tr>")
            sec.columns.forEach { append("<th>${html(it)}</th>") }
            append("</tr></thead><tbody>")
            sec.rows.forEach { row -> append("<tr>"); row.forEach { append("<td${if (it is Cell.N) " class=\"num\"" else ""}>${printCell(it)}</td>") }; append("</tr>") }
            append("</tbody>")
            sec.totals?.let { t -> append("<tfoot><tr>"); t.forEach { append("<td${if (it is Cell.N) " class=\"num\"" else ""}>${printCell(it)}</td>") }; append("</tr></tfoot>") }
            append("</table>")
        }
        append("</section>")
    }
    append("<p class=\"foot\">مبالغ به تومان است.</p></body></html>")
}

/** Writes the CSV (with the UTF-8 BOM Excel needs for Persian) and hands it to the share sheet. */
private fun shareCsv(context: Context, report: Report) {
    val dir = File(context.cacheDir, "exports").apply { mkdirs() }
    val file = File(dir, "${report.fileSlug}.csv")
    file.writeText("﻿" + report.toCsv(), Charsets.UTF_8)
    val uri = FileProvider.getUriForFile(context, context.packageName + ".files", file)
    val send = Intent(Intent.ACTION_SEND).setType("text/csv").putExtra(Intent.EXTRA_STREAM, uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    runCatching { context.startActivity(Intent.createChooser(send, "فایل اکسل")) }
}

// The WebView must outlive the composable until printing has the page; one at a time.
private var printing: WebView? = null

/** Lays the report out in an off-screen WebView and opens the print dialog («ذخیره به‌صورت PDF»). */
private fun printReport(context: Context, report: Report) {
    val web = WebView(context)
    printing = web
    web.webViewClient = object : WebViewClient() {
        override fun onPageFinished(view: WebView, url: String?) {
            val pm = context.getSystemService(Context.PRINT_SERVICE) as PrintManager
            pm.print(report.fileSlug, view.createPrintDocumentAdapter(report.fileSlug), PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build())
        }
    }
    web.loadDataWithBaseURL(null, report.toHtml(context), "text/html", "utf-8", null)
}

/** «خروجی گزارش»: Excel (CSV) or PDF / print, as the web's ExportSheet. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ReportExportSheet(report: Report, onDismiss: () -> Unit) {
    val c = LocalAppColors.current
    val context = LocalContext.current
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = c.bg) {
        Column(Modifier.padding(horizontal = 20.dp).padding(bottom = 16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("خروجی گزارش", color = c.ink, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            Text(report.subtitle, color = c.muted, fontSize = 14.sp, modifier = Modifier.padding(bottom = 6.dp))
            ExportChoice(Icons.Outlined.TableChart, c.done, "فایل اکسل", "CSV — در اکسل یا Google Sheets باز می‌شود") { shareCsv(context, report); onDismiss() }
            ExportChoice(Icons.Outlined.Description, c.danger, "PDF / چاپ", "در پنجره چاپ، «ذخیره به‌صورت PDF» را انتخاب کنید") { printReport(context, report); onDismiss() }
        }
    }
}

@Composable
private fun ExportChoice(icon: ImageVector, tint: Color, title: String, subtitle: String, onClick: () -> Unit) {
    val c = LocalAppColors.current
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(c.card).border(1.dp, c.line, RoundedCornerShape(24.dp)).clickable(onClick = onClick).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(16.dp)).background(tint.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(24.dp))
        }
        Column(Modifier.padding(start = 12.dp)) {
            Text(title, color = c.ink, fontWeight = FontWeight.Bold)
            Text(subtitle, color = c.muted, fontSize = 12.sp)
        }
    }
}
