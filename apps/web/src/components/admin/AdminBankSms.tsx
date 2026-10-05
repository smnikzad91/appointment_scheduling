"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

// /admin/bank-sms: the bank-SMS device (apps/bank-sms-agent) — its heartbeat, the SMS from the cards'
// bank senders and what they matched (all other SMS: /admin/received-sms), and the automatic wallet top-ups. An SMS that didn't match by itself (paid
// after expiry, a typo in the amount…) is matched to its top-up by hand here, or set aside.

interface Person { firstName: string; lastName: string; phone: string | null }
interface Sms {
  id: string; sender: string; body: string; receivedAt: string; status: "matched" | "unmatched" | "not_deposit" | "ignored";
  note: string; amountRial: string | null; balanceRial: string | null;
  card: { cardNumber: string; bankName: string } | null; topUp: { id: string; user: Person } | null;
}
interface TopUp {
  id: string; user: Person; cardNumber: string; amountToman: number; payableRial: string;
  status: "pending" | "paid" | "expired" | "cancelled"; createdAt: string; expiresAt: string; paidAt: string | null; creditedToman: number | null;
}
interface Device { id: string; lastSeenAt: string; signal: number | null; info: Record<string, unknown> | null }

const OFFLINE_AFTER_MS = 10 * 60_000;

export default function AdminBankSms() {
  const t = useT();
  const { num, date, apiError } = useLocaleFormat();
  const [data, setData] = useState<{ sms: Sms[]; topUps: TopUp[]; devices: Device[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // when the data was loaded (the device counts as offline from its last heartbeat to this)
  const [loadedAt, setLoadedAt] = useState(0);

  const load = useCallback(() => {
    fetch("/api/admin/finance/bank-sms").then((r) => r.json()).then((d) => { setData(d); setLoadedAt(Date.now()); }).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (sms: Sms, body: object) => {
    setBusy(sms.id);
    const res = await fetch(`/api/admin/finance/bank-sms/${sms.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok) load();
    else toast.error(apiError(new Error(d.error ?? ""), t("saveError")));
  };

  const name = (p: Person) => `${p.firstName} ${p.lastName}`.trim() + (p.phone ? ` · ${num(p.phone)}` : "");
  const rial = (v: string | null) => (v ? num(Number(v).toLocaleString("en-US")) : "—");
  const smsStatus: Record<Sms["status"], [string, string]> = {
    matched: [t("bankSmsMatched"), "bg-success-50 text-success-600"],
    unmatched: [t("bankSmsUnmatched"), "bg-warning-50 text-warning-600"],
    not_deposit: [t("bankSmsNotDeposit"), "bg-gray-100 text-gray-500"],
    ignored: [t("bankSmsIgnored"), "bg-gray-100 text-gray-500"],
  };
  const topUpStatus: Record<TopUp["status"], [string, string]> = {
    pending: [t("topUpPending"), "bg-warning-50 text-warning-600"],
    paid: [t("topUpPaid"), "bg-success-50 text-success-600"],
    expired: [t("topUpExpired"), "bg-gray-100 text-gray-500"],
    cancelled: [t("topUpCancelled"), "bg-gray-100 text-gray-500"],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("bankSmsTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("bankSmsDesc")}</p>
      </div>

      <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">{t("bankSmsDevice")}</h2>
        {!data ? null : data.devices.length === 0 ? (
          <p className="text-sm text-gray-500">{t("bankSmsNoDevice")}</p>
        ) : (
          data.devices.map((d) => {
            const offline = loadedAt - new Date(d.lastSeenAt).getTime() > OFFLINE_AFTER_MS;
            return (
              <div key={d.id} className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium" dir="ltr">{d.id}</span>
                <span className={`rounded-lg px-2 py-0.5 text-xs ${offline ? "bg-error-50 text-error-600" : "bg-success-50 text-success-600"}`}>{offline ? t("bankSmsOffline") : "OK"}</span>
                <span>{t("bankSmsLastSeen")}: {date(d.lastSeenAt)}</span>
                {d.signal !== null && <span>{t("bankSmsSignal")}: {num(d.signal)}/31</span>}
                {d.info && <span dir="ltr" className="font-mono text-xs text-gray-500">{JSON.stringify(d.info)}</span>}
              </div>
            );
          })
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">{t("bankSmsMessages")}</h2>
        <div className="space-y-3">
          {data?.sms.map((s) => {
            const [label, cls] = smsStatus[s.status];
            // top-ups this SMS could belong to: same exact amount, not yet paid
            const candidates = data.topUps.filter((tu) => s.amountRial && tu.payableRial === s.amountRial && (tu.status === "pending" || tu.status === "expired"));
            return (
              <div key={s.id} className={`rounded-xl border border-gray-100 p-3 dark:border-gray-800 ${busy === s.id ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className={`rounded-lg px-2 py-0.5 text-xs ${cls}`}>{label}</span>
                  <span className="text-gray-500">{date(s.receivedAt)}</span>
                  <span dir="ltr" className="text-gray-500">{s.sender}</span>
                  {s.amountRial && <span className="font-medium text-gray-900 dark:text-white">{rial(s.amountRial)} ریال</span>}
                  {s.topUp && <span className="text-success-600">→ {name(s.topUp.user)}</span>}
                  {s.note && <span className="text-xs text-gray-400">{s.note}</span>}
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-gray-600 dark:text-gray-400">{s.body}</pre>
                {s.status === "unmatched" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {candidates.length === 0 && <span className="text-xs text-gray-400">{t("bankSmsNoCandidates")}</span>}
                    {candidates.map((c) => (
                      <button key={c.id} onClick={() => act(s, { action: "match", topUpId: c.id })} className="rounded-lg bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600">
                        {t("bankSmsMatchTo")}: {name(c.user)} ({topUpStatus[c.status][0]})
                      </button>
                    ))}
                    <button onClick={() => act(s, { action: "ignore" })} className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
                      {t("bankSmsIgnore")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 p-5 dark:border-gray-700">
        <h2 className="mb-3 font-semibold text-gray-900 dark:text-white">{t("bankSmsTopUps")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {data?.topUps.map((tu) => {
                const [label, cls] = topUpStatus[tu.status];
                return (
                  <tr key={tu.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 text-gray-900 dark:text-white">{name(tu.user)}</td>
                    <td className="py-2 font-medium">{rial(tu.payableRial)} ریال</td>
                    <td className="py-2"><span className={`rounded-lg px-2 py-0.5 text-xs ${cls}`}>{label}</span></td>
                    <td className="py-2 text-gray-500">{date(tu.createdAt)}</td>
                    <td dir="ltr" className="py-2 font-mono text-xs text-gray-500">…{tu.cardNumber.slice(-4)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
