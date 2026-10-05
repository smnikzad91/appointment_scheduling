"use client";

import { useEffect, useState } from "react";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import { formatSalonDateTime, DEFAULT_SALON_TIME_ZONE } from "@/lib/salonTime";

// /admin/received-sms: every SMS on the bank-SMS device's SIM, as forwarded (bank deposits and
// withdrawals, operator messages, anything else), with status/sender/text filters. Read-only —
// matching an unmatched deposit by hand stays on /admin/bank-sms.

type Status = "matched" | "unmatched" | "not_deposit" | "ignored";
interface Item {
  id: string; deviceId: string; sender: string; body: string; receivedAt: string; status: Status; note: string;
  amountRial: string | null; card: { cardNumber: string; bankName: string } | null;
  user: { firstName: string; lastName: string; phone: string | null } | null;
}
interface Data { page: number; pageSize: number; total: number; senders: { sender: string; count: number }[]; items: Item[] }

const BADGE: Record<Status, string> = {
  matched: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  unmatched: "bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400",
  not_deposit: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  ignored: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
};

export default function AdminReceivedSms() {
  const t = useT();
  const { lang, num } = useLocaleFormat();
  const [status, setStatus] = useState<Status | "">("");
  const [sender, setSender] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // q, applied after a pause in typing
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => { setQuery(q.trim()); setPage(1); }, 400);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (status) params.set("status", status);
    if (sender) params.set("sender", sender);
    if (query) params.set("q", query);
    let cancelled = false;
    fetch(`/api/admin/finance/received-sms?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (!cancelled) { setData(d); setFailed(false); } })
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [status, sender, query, page]);

  const statusLabel: Record<Status, string> = {
    matched: t("bankSmsMatched"), unmatched: t("bankSmsUnmatched"), not_deposit: t("bankSmsNotDeposit"), ignored: t("bankSmsIgnored"),
  };
  const when = (iso: string) =>
    lang === "fa" ? formatSalonDateTime(iso) : new Date(iso).toLocaleString("en-US", { timeZone: DEFAULT_SALON_TIME_ZONE, dateStyle: "medium", timeStyle: "short" });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const input = "rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("receivedSmsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("receivedSmsDesc")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["", "matched", "unmatched", "not_deposit", "ignored"] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === s ? "bg-brand-500 text-white" : "border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"}`}
          >
            {s ? statusLabel[s] : t("receivedSmsAll")}
          </button>
        ))}
        <select value={sender} onChange={(e) => { setSender(e.target.value); setPage(1); }} className={input} dir="ltr">
          <option value="">{t("receivedSmsAllSenders")}</option>
          {data?.senders.map((s) => (
            <option key={s.sender} value={s.sender}>{s.sender} ({num(s.count)})</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("receivedSmsSearch")} className={`${input} w-56`} />
        {data && <span className="text-sm text-gray-500">{t("receivedSmsTotal")}: {num(data.total)}</span>}
      </div>

      {failed && <p className="text-sm text-red-500">{t("saveError")}</p>}
      {!data ? (
        <p className="text-sm text-gray-400">{t("loading")}</p>
      ) : data.items.length === 0 ? (
        <p className="text-sm text-gray-400">{t("receivedSmsNone")}</p>
      ) : (
        <div className="space-y-2">
          {data.items.map((s) => (
            <div key={s.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span dir="ltr" className="font-semibold text-gray-900 dark:text-white">{s.sender}</span>
                <span className="text-gray-500">{when(s.receivedAt)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[s.status]}`}>{statusLabel[s.status]}</span>
                {s.amountRial && <span className="text-gray-600 dark:text-gray-300">{num(Number(s.amountRial).toLocaleString("en-US"))} {lang === "fa" ? "ریال" : "rial"}</span>}
                {s.user && <span className="text-gray-600 dark:text-gray-300">→ {s.user.firstName} {s.user.lastName} <span dir="ltr">{s.user.phone}</span></span>}
                {s.note && <span className="text-xs text-gray-500">{s.note}</span>}
              </div>
              <p dir="auto" className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200">{s.body}</p>
            </div>
          ))}
        </div>
      )}

      {data && pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("receivedSmsNewer")}</button>
          <span className="text-gray-500">{num(page)} / {num(pages)}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300">{t("receivedSmsOlder")}</button>
        </div>
      )}
    </div>
  );
}
