"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Field, TextInput } from "./ui";
import { useOptionalWallet } from "@/context/WalletContext";
import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { toastError } from "@/lib/toastError";

// «افزایش خودکار موجودی»: card-to-card through nodepass.ir (lib/topUps.ts), which gives the card and
// confirms the deposit. The customer pays the requested amount plus 1–1000 rial — that exact rial
// amount identifies them — so both the card number and the amount must be copied, and the exact-amount
// box ticked, before «واریز کردم» (owner's wording for the warning and the box, 2026-10-30).
// This is the only way to add money to a wallet. In the public booking sheet (no NextAuth session)
// it's given the customer's apps/api token, which these routes accept too (requestSession).

interface TopUp {
  id: string;
  amountToman: number;
  payableRial: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  expiresAt: string;
  creditedToman: number | null;
  card: { cardNumber: string; ownerName: string; bankName: string } | null;
  /** nodepass.ir's receipt code */
  trackingCode?: string | null;
  /** nodepass's status page for this payment */
  statusUrl?: string | null;
}

const QUICK = [100_000, 200_000, 500_000, 1_000_000];
const fa = (n: number | string) => toPersianDigits(Number(n).toLocaleString("en-US").replace(/,/g, "٬"));

export default function WalletTopUp({ accessToken, suggestedToman, onPaid }: { accessToken?: string; suggestedToman?: number; onPaid?: () => void } = {}) {
  const wallet = useOptionalWallet();
  const auth: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  // in a ref: an inline callback from the parent must not restart the polling timers every render
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; });
  const [available, setAvailable] = useState<boolean | null>(null);
  const [topUp, setTopUp] = useState<TopUp | null>(null);
  const [amount, setAmount] = useState(suggestedToman ? String(suggestedToman) : "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState({ card: false, amount: false });
  const [paidClicked, setPaidClicked] = useState(false);
  const [exactConfirmed, setExactConfirmed] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    fetch("/api/user/finance/top-ups", { headers: auth })
      .then((r) => r.json())
      .then((d) => {
        setAvailable(!!d.available);
        const pending = (d.items as TopUp[] | undefined)?.find((x) => x.status === "pending");
        if (pending) {
          setTopUp(pending);
          setNow(Date.now());
        }
      })
      .catch(() => setAvailable(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // while one is pending: poll its status and tick the countdown
  const poll = useCallback(async (id: string) => {
    const r = await fetch(`/api/user/finance/top-ups/${id}`, { headers: auth }).catch(() => null);
    if (!r?.ok) return;
    const t = (await r.json()) as TopUp;
    setTopUp(t);
    if (t.status === "paid") {
      toast.success(`${fa(t.creditedToman ?? 0)} تومان به کیف پول شما اضافه شد`);
      wallet?.refresh();
      onPaidRef.current?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.refresh, accessToken]);
  useEffect(() => {
    if (topUp?.status !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const check = setInterval(() => poll(topUp.id), 8000);
    return () => { clearInterval(tick); clearInterval(check); };
  }, [topUp?.id, topUp?.status, poll]);

  async function start(amountToman: number) {
    setBusy(true);
    const r = await fetch("/api/user/finance/top-ups", { method: "POST", headers: { "Content-Type": "application/json", ...auth }, body: JSON.stringify({ amountToman, returnPath: window.location.pathname }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toastError(d.error ?? "ساخت درخواست انجام نشد");
    setTopUp(d);
    setCopied({ card: false, amount: false });
    setPaidClicked(false);
    setExactConfirmed(false);
    setNow(Date.now());
  }

  async function cancel() {
    if (!topUp) return;
    await fetch(`/api/user/finance/top-ups/${topUp.id}`, { method: "DELETE", headers: auth }).catch(() => null);
    setTopUp(null);
  }

  async function copy(what: "card" | "amount", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((c) => ({ ...c, [what]: true }));
    } catch {
      toastError("کپی انجام نشد؛ دستی یادداشت کنید");
      setCopied((c) => ({ ...c, [what]: true }));
    }
  }

  if (available === null) return null;
  if (!available) {
    // nodepass isn't configured (NODEPASS_API_KEY)
    return (
      <Card className="p-5">
        <p className="text-sm leading-7 text-app-muted">شارژ کیف پول فعلاً در دسترس نیست؛ کمی بعد دوباره سر بزنید.</p>
      </Card>
    );
  }

  // the payment instructions
  if (topUp && topUp.status === "pending" && topUp.card) {
    const left = Math.max(0, new Date(topUp.expiresAt).getTime() - now);
    const mm = Math.floor(left / 60_000);
    const ss = Math.floor((left % 60_000) / 1000);
    const card = topUp.card.cardNumber;
    return (
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-bold text-app-ink">واریز کارت به کارت</h2>
        <CopyRow label={`شماره کارت — ${topUp.card.bankName}، ${topUp.card.ownerName}`} value={toPersianDigits(card.replace(/(.{4})/g, "$1 ").trim())} ltr done={copied.card} onCopy={() => copy("card", card)} />
        <CopyRow label="مبلغ دقیق (ریال)" value={fa(topUp.payableRial)} hint={`حدود ${fa(Math.floor(Number(topUp.payableRial) / 10))} تومان`} copyLabel="کپی مبلغ دقیق" done={copied.amount} onCopy={() => copy("amount", topUp.payableRial)} />
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-app-pending/40 bg-app-pending/10 p-3">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-app-pending" aria-hidden />
          <p className="text-sm leading-7 text-app-ink">
            <strong>توجه بسیار مهم:</strong> لطفاً دقیقاً همین مبلغ نمایش‌داده‌شده را بدون کم یا زیاد کردن واریز نمایید. هرگونه مغایرت در مبلغ، فرآیند تأیید خودکار را با خطا مواجه می‌کند. چند ریال آخر مبلغ، پرداخت شما را شناسایی می‌کند.
          </p>
        </div>
        {!paidClicked ? (
          <>
            <label className="flex cursor-pointer items-start gap-3 text-sm leading-7 text-app-ink">
              <input type="checkbox" checked={exactConfirmed} onChange={(e) => setExactConfirmed(e.target.checked)} className="mt-1.5 h-4 w-4 shrink-0 accent-[var(--app-accent)]" />
              تأیید می‌کنم که مبلغ پرداختی دقیقاً با مبلغ فاکتور یکسان است
            </label>
            <Button block disabled={!copied.card || !copied.amount || !exactConfirmed} onClick={() => setPaidClicked(true)}>
              {!copied.card || !copied.amount ? "اول شماره کارت و مبلغ را کپی کنید" : exactConfirmed ? "واریز کردم" : "اول یکسان بودن مبلغ را تأیید کنید"}
            </Button>
          </>
        ) : (
          <p className="rounded-2xl bg-app-accent-soft px-4 py-3 text-sm text-app-ink">در انتظار پیامک بانک… معمولاً کمتر از یک دقیقه طول می‌کشد؛ بعد از تایید، موجودی خودکار اضافه می‌شود.</p>
        )}
        {topUp.trackingCode && (
          <p className="text-sm text-app-muted">
            کد پیگیری: <span dir="ltr" className="font-bold text-app-ink">{topUp.trackingCode}</span>
            {topUp.statusUrl && (
              <>
                {" · "}
                <a href={topUp.statusUrl} target="_blank" rel="noopener noreferrer" className="text-app-accent underline">
                  صفحه پرداخت در nodepass
                </a>
              </>
            )}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-app-muted">
          <span>مهلت واریز: {toPersianDigits(`${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`)}</span>
          <button type="button" onClick={cancel} className="text-app-danger">لغو</button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <h2 className="text-lg font-bold text-app-ink">افزایش خودکار موجودی</h2>
      {topUp?.status === "paid" && <p className="text-sm text-app-done">{fa(topUp.creditedToman ?? 0)} تومان به کیف پول شما اضافه شد.</p>}
      {topUp?.status === "expired" && <p className="text-sm text-app-danger">مهلت آن درخواست تمام شد. اگر واریز کرده‌اید، با پشتیبانی تماس بگیرید.</p>}
      <Field label="مبلغ (تومان)">
        <TextInput inputMode="numeric" dir="ltr" className="text-end" value={amount ? fa(amount) : ""} onChange={(e) => setAmount(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 9))} placeholder="۲۰۰٬۰۰۰" />
      </Field>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setAmount(String(q))} className="rounded-full border border-app-line px-3 py-1 text-sm text-app-ink">{fa(q)}</button>
        ))}
      </div>
      <Button block busy={busy} disabled={!amount} onClick={() => start(Number(amount))}>ادامه</Button>
    </Card>
  );
}

function CopyRow({ label, value, hint, ltr, copyLabel = "کپی", done, onCopy }: { label: string; value: string; hint?: string; ltr?: boolean; copyLabel?: string; done: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-2xl border border-app-line p-3">
      <p className="text-xs text-app-muted">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span dir={ltr ? "ltr" : undefined} className="text-lg font-black tracking-wide text-app-ink">{value}</span>
        <button type="button" onClick={onCopy} className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm ${done ? "bg-app-done/10 text-app-done" : "bg-app-accent text-app-accent-ink"}`}>
          {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {done ? "کپی شد" : copyLabel}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-app-muted">{hint}</p>}
    </div>
  );
}
