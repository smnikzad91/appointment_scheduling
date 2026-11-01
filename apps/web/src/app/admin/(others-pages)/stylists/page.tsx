"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import { listAdminStylists, setStylistApproval, type AdminStylist, type StylistApproval } from "@/lib/api/adminStylists";
import Sep from "@/components/common/Sep";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";
import type { TranslationKey } from "@/i18n/translations";
import { toastError } from "@/lib/toastError";

const TABS: { label: TranslationKey; value: StylistApproval | "ALL" }[] = [
  { label: "stPending", value: "PENDING" },
  { label: "stApproved", value: "APPROVED" },
  { label: "stRejected", value: "REJECTED" },
  { label: "stAll", value: "ALL" },
];

const LABEL: Record<StylistApproval, TranslationKey> = { PENDING: "stPending", APPROVED: "stApproved", REJECTED: "stRejected" };

const COLOR: Record<StylistApproval, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
};

/** Stylists that salons invite are approved here, separately from the salon itself. */
export default function AdminStylistsPage() {
  const token = useApiAccessToken();
  const t = useT();
  const { date, apiError } = useLocaleFormat();
  const [tab, setTab] = useState<StylistApproval | "ALL">("PENDING");
  const [stylists, setStylists] = useState<AdminStylist[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function reload() {
    if (!token) return;
    listAdminStylists(token, tab === "ALL" ? undefined : tab)
      .then((list) => {
        setError(false);
        setStylists(list);
      })
      .catch(() => setError(true));
  }

  useEffect(reload, [token, tab]);

  async function decide(id: string, approval: "APPROVED" | "REJECTED") {
    if (!token) return;
    setBusyId(id);
    try {
      const res = await setStylistApproval(token, id, approval);
      if (res.approval === "APPROVED" && !res.active) toast(t("stOffNoSeat"));
      reload();
    } catch (err) {
      toastError(apiError(err, t("stActionError")));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{t("stTitle")}</h1>
        <p className="text-sm text-gray-500">{t("stSubtitle")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            type="button"
            onClick={() => {
              setStylists(null);
              setTab(tb.value);
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              tab === tb.value ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t(tb.label)}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-rose-500">{t("stLoadError")}</p>
      ) : !stylists ? (
        <p className="text-sm text-gray-500">{t("stLoading")}</p>
      ) : stylists.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-gray-800">{t("stEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {stylists.map((st) => (
            <div key={st.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-gray-900 dark:text-white">{st.displayName}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${COLOR[st.approval]}`}>{t(LABEL[st.approval])}</span>
                    {st.approval === "APPROVED" && !st.active && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{t("stOff")}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {st.user.firstName} {st.user.lastName} <span dir="ltr">{st.user.phone}</span>
                    {st.user.mustSetPassword && (
                      <>
                        <Sep />
                        <span className="text-amber-600">{t("stNotSignedIn")}</span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("stSalon")}: <span className="font-semibold text-gray-600 dark:text-gray-300">{st.salon.name}</span>، {st.salon.city}
                    {st.salon.status !== "ACTIVE" && (
                      <>
                        {" "}
                        <span className="text-amber-600">({t("stSalonNotActive")})</span>
                      </>
                    )}
                    <Sep />
                    {t("stOwner")}: {st.salon.owner.firstName} {st.salon.owner.lastName} <span dir="ltr">{st.salon.owner.phone}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t("stInvited")}: {date(st.createdAt)}
                    {st.approvalDecidedAt && (
                      <>
                        <Sep />
                        {t("stDecided")}: {date(st.approvalDecidedAt)}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {st.approval !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={busyId === st.id}
                      onClick={() => decide(st.id, "APPROVED")}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {t("stApprove")}
                    </button>
                  )}
                  {st.approval !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={busyId === st.id}
                      onClick={() => decide(st.id, "REJECTED")}
                      className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:hover:bg-rose-500/10"
                    >
                      {t("stReject")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
