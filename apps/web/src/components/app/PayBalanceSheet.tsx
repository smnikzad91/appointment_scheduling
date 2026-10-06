"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Sheet from "./Sheet";
import { Button } from "./ui";
import WalletTopUp from "./WalletTopUp";
import { payBookingBalance, type CustomerBooking } from "@/lib/api/customerBookings";
import { getWallet } from "@/lib/api/wallet";
import { persianApiError } from "@/lib/api/errorMessages";
import { formatToman } from "@/lib/persian";
import { toastError } from "@/lib/toastError";

// The customer pays the rest of a completed booking from their wallet, after the stylist asked for
// it (apps/api POST appointments/:id/pay-balance). Short of balance: top up right here.
export default function PayBalanceSheet({ token, booking, onClose, onPaid }: { token: string; booking: CustomerBooking; onClose: () => void; onPaid: () => void }) {
  const due = booking.balanceDueToman ?? 0;
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getWallet(token).then((w) => setBalance(w.balanceToman)).catch(() => setBalance(null));
  }, [token]);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const short = balance === null ? 0 : Math.max(0, due - balance);

  async function pay() {
    setBusy(true);
    try {
      await payBookingBalance(token, booking.id);
      toast.success(`${formatToman(due)} از کیف پول پرداخت شد`);
      onPaid();
      onClose();
    } catch (err) {
      toastError(persianApiError(err, "پرداخت انجام نشد"));
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open
      onClose={() => !busy && onClose()}
      title="پرداخت باقی‌مانده نوبت"
      footer={
        <Button block busy={busy} disabled={balance === null || short > 0} onClick={pay}>
          پرداخت {formatToman(due)} از کیف پول
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="leading-7 text-app-muted">{booking.salon.name} باقی‌مانده مبلغ این نوبت را از کیف پول شما درخواست کرده است.</p>
        <div className="space-y-1 rounded-2xl bg-app-card-2 p-3.5">
          <p className="flex justify-between font-bold text-app-ink"><span>مبلغ</span><span>{formatToman(due)}</span></p>
          <p className="flex justify-between text-app-muted"><span>موجودی کیف پول</span><span>{balance === null ? "…" : formatToman(balance)}</span></p>
        </div>
        {short > 0 && (
          <div className="space-y-2">
            <p className="font-bold text-app-ink">موجودی کافی نیست؛ حداقل {formatToman(short)} شارژ کنید.</p>
            <WalletTopUp accessToken={token} suggestedToman={Math.max(10_000, Math.ceil(short / 1000) * 1000)} onPaid={load} />
          </div>
        )}
      </div>
    </Sheet>
  );
}
