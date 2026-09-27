import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import { toSalonWallTime } from "./salonTime";

// Accounting export: one report description rendered two ways — a CSV for Excel and a printable
// page (components/app/AccountingReport.tsx, saved as PDF from the browser's print dialog).

export type Cell = string | number;

export interface ReportSection {
  title: string;
  columns: string[];
  rows: Cell[][];
  /** Optional totals row, same length as columns ("" for blank cells). */
  totals?: Cell[];
}

export interface Report {
  title: string;
  subtitle: string;
  /** Used for the CSV file name, e.g. "hesab-1405-07". */
  fileSlug: string;
  sections: ReportSection[];
}

/** "1405/07/05" — Jalali salon-local date with Latin digits, so Excel can sort and filter it. */
export function jalaliDate(iso: string) {
  const [y, m, d] = toSalonWallTime(iso).dateKey.split("-").map(Number);
  return new DateObject({ date: new Date(y, m - 1, d, 12), calendar: persian }).format("YYYY/MM/DD");
}

/** "1405-07" for the period starting at `fromIso`. */
export function jalaliMonthSlug(fromIso: string) {
  return jalaliDate(fromIso).slice(0, 7).replace("/", "-");
}

function csvCell(value: Cell) {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(report: Report) {
  const lines: Cell[][] = [[report.title], [report.subtitle]];
  for (const section of report.sections) {
    lines.push([], [section.title], section.columns, ...section.rows);
    if (section.totals) lines.push(section.totals);
  }
  return lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * Downloads the report as CSV. The UTF-8 byte-order mark is what makes Excel read Persian text
 * correctly instead of mojibake; amounts are plain numbers so Excel can sum them.
 */
export function downloadCsv(report: Report) {
  const blob = new Blob(["﻿", reportToCsv(report)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.fileSlug}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
