"use client";

import { createPortal } from "react-dom";
import { FileSpreadsheet, FileText } from "lucide-react";
import { downloadCsv, type Report } from "@/lib/accountingExport";
import { toPersianDigits } from "@/lib/persian";
import { formatAmount } from "./accounting";
import Sheet from "./Sheet";

/**
 * Amounts get thousands separators; a fractional percent keeps its decimal ("۴۵٫۷"). Text cells
 * get Persian digits too (the CSV keeps Latin-digit dates so Excel can sort them).
 */
function printNumber(n: number) {
  return Number.isInteger(n) ? formatAmount(n) : toPersianDigits(String(n).replace(".", "٫"));
}

/**
 * Print-only copy of the report, portalled to <body>. While it's mounted, globals.css
 * (`body:has(> #print-report)`) hides the rest of the app when printing, so "Save as PDF" in the
 * print dialog gives a clean A4 report instead of a screenshot of the phone UI.
 */
function PrintableReport({ report }: { report: Report }) {
  return createPortal(
    <div id="print-report" dir="rtl" lang="fa">
      <h1>{report.title}</h1>
      <p className="print-sub">{report.subtitle}</p>
      {report.sections.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          {section.rows.length === 0 ? (
            <p className="print-empty">موردی ثبت نشده است.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  {section.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className={typeof cell === "number" ? "num" : undefined}>
                        {typeof cell === "number" ? printNumber(cell) : toPersianDigits(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {section.totals && (
                <tfoot>
                  <tr>
                    {section.totals.map((cell, j) => (
                      <td key={j} className={typeof cell === "number" ? "num" : undefined}>
                        {typeof cell === "number" ? printNumber(cell) : toPersianDigits(cell)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </section>
      ))}
      <p className="print-foot">مبالغ به تومان است.</p>
    </div>,
    document.body,
  );
}

/** Bottom sheet with the two export choices: Excel (CSV) or PDF (print dialog). */
export default function ExportSheet({ report, onClose }: { report: Report | null; onClose: () => void }) {
  return (
    <>
      <Sheet open={!!report} onClose={onClose} title="خروجی گزارش">
        {report && (
          <>
            <p className="mb-4 text-sm leading-6 text-app-muted">{report.subtitle}</p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => downloadCsv(report)}
                className="flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 text-start shadow-app active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-done/12 text-app-done">
                  <FileSpreadsheet className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-black text-app-ink">فایل اکسل</span>
                  <span className="block text-xs text-app-muted">CSV — در اکسل یا Google Sheets باز می‌شود</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 text-start shadow-app active:scale-[0.99]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-danger/10 text-app-danger">
                  <FileText className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-black text-app-ink">PDF / چاپ</span>
                  <span className="block text-xs text-app-muted">در پنجره چاپ، «ذخیره به‌صورت PDF» را انتخاب کنید</span>
                </span>
              </button>
            </div>
          </>
        )}
      </Sheet>
      {/* Mounted (hidden on screen) while the sheet is open, so print() has it ready. */}
      {report && <PrintableReport report={report} />}
    </>
  );
}
