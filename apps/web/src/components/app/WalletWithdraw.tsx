"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote } from "lucide-react";
import { toast } from "sonner";
import Sheet from "./Sheet";
import { Button, Card, Field, TextInput } from "./ui";
import { normalizeDigits, toPersianDigits } from "@/lib/persian";
import { formatSalonDate } from "@/lib/salonTime";
import { toastError } from "@/lib/toastError";

// «برداشت از کیف پول»: the amount leaves the balance now; the platform pays it to the Sheba by bank
// transfer and marks it paid (or rejects it — then it's back in the wallet). One pending at a time.

interface Withdrawal {
  id: string;
  amountToman: number;
  sheba: string;
  accountHolder: string;
  status: "pending" | "paid" | "rejected" | "cancelled";
  adminNote: string;
  trackingCode: string | null;
  createdAt: string;
}

const fa = (n: number | string) => toPersianDigits(Number(n).toLocaleString("en-US").replace(/,/g, "٬"));
const STATUS: Record<Withdrawal["status"], string> = { pending: "در انتظار پرداخت", paid: "پرداخت شد", rejected: "رد شد؛ مبلغ به کیف پول برگشت", cancelled: "لغو شد" };

export default function WalletWithdraw({ balanceToman, onChange }: { balanceToman: number; onChange: () => void }) {
  const [items, setItems] = useState<Withdrawal[] | null>(null);
  const [min, setMin] = useState(50_000);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", sheba: "", holder: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch("/api/user/finance/withdrawals")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setItems(d.items); setMin(d.minToman); })
      .catch(() => setItems([]));
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  if (!items) return null;
  const pending = items.find((w) => w.status === "pending");
  const last = items.find((w) => w.status !== "pending");

  function openSheet() {
    // the Sheba and holder of the last request, so a regular withdrawal is just the amount
    const prev = items?.[0];
    setForm({ amount: String(balanceToman), sheba: prev?.sheba.slice(2) ?? "", holder: prev?.accountHolder ?? "" });
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    const r = await fetch("/api/user/finance/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountToman: Number(form.amount), sheba: `IR${form.sheba}`, accountHolder: form.holder }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toastError(d.error ?? "ثبت درخواست انجام نشد");
    toast.success("درخواست برداشت ثبت شد");
    setOpen(false);
    load();
    onChange();
  }

  async function cancel(id: string) {
    const r = await fetch(`/api/user/finance/withdrawals/${id}`, { method: "DELETE" });
    if (!r.ok) toastError((await r.json().catch(() => ({}))).error ?? "لغو انجام نشد");
    load();
    onChange();
  }

  return (
    <>
      {pending ? (
        <Card className="space-y-1 p-4">
          <p className="text-sm font-bold text-app-ink">برداشت {fa(pending.amountToman)} تومان: {STATUS.pending}</p>
          <p className="text-xs text-app-muted" dir="ltr">{pending.sheba}</p>
          <p className="text-xs text-app-muted">معمولاً تا یک روز کاری به حساب شما واریز می‌شود.</p>
          <button type="button" onClick={() => cancel(pending.id)} className="text-sm text-app-danger">لغو درخواست</button>
        </Card>
      ) : (
        <Button variant="secondary" block icon={Banknote} disabled={balanceToman < min} onClick={openSheet}>
          {balanceToman < min ? `برداشت از ${fa(min)} تومان به بالا` : "برداشت از کیف پول"}
        </Button>
      )}
      {last && (
        <p className="px-1 text-xs text-app-muted">
          آخرین برداشت: {fa(last.amountToman)} تومان، {formatSalonDate(last.createdAt)} — {STATUS[last.status]}
          {last.trackingCode && <>، کد پیگیری <span dir="ltr">{last.trackingCode}</span></>}
          {last.adminNote && <>، {last.adminNote}</>}
        </p>
      )}

      <Sheet
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="برداشت از کیف پول"
        footer={<Button block busy={busy} onClick={submit}>ثبت درخواست برداشت</Button>}
      >
        <div className="space-y-4">
          <Field label="مبلغ (تومان)" hint={`موجودی: ${fa(balanceToman)} تومان`}>
            <TextInput inputMode="numeric" dir="ltr" className="text-end" value={form.amount ? fa(form.amount) : ""} onChange={(e) => setForm((f) => ({ ...f, amount: normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 9) }))} />
          </Field>
          <Field label="شماره شبا" hint="۲۴ رقم بعد از IR">
            <div className="flex items-center gap-2" dir="ltr">
              <span className="font-bold text-app-muted">IR</span>
              <TextInput inputMode="numeric" dir="ltr" value={toPersianDigits(form.sheba)} onChange={(e) => setForm((f) => ({ ...f, sheba: normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 24) }))} />
            </div>
          </Field>
          <Field label="نام صاحب حساب">
            <TextInput value={form.holder} onChange={(e) => setForm((f) => ({ ...f, holder: e.target.value }))} />
          </Field>
        </div>
      </Sheet>
    </>
  );
}
