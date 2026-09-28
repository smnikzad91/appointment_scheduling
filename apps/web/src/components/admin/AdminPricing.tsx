"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, EyeOff, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";
import {
  createPlan,
  deletePlan,
  getAdminPricing,
  reorderPlans,
  updatePlan,
  updatePricingSettings,
  type PlanDraft,
} from "@/lib/api/adminPricing";
import { isSafeCtaHref, PLAN_LIMITS, planFeatureLines, planPriceLabel, type PricingPlanData } from "@/lib/pricing";
import { normalizeDigits } from "@/lib/persian";
import { useT } from "@/i18n/useT";
import { useLocaleFormat } from "@/i18n/useLocaleFormat";

const card = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const input =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white/90";
const label = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";
const hint = "mt-1 block text-xs leading-5 text-gray-500";
const primaryBtn = "rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50";
const ghostBtn =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5";
const iconBtn =
  "rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-white/5";

/** Digits only (Persian digits accepted); "" stays "" so optional numbers can be cleared. */
const digitsOnly = (v: string) => normalizeDigits(v).replace(/\D/g, "");
const toNumberOrNull = (v: string) => (v === "" ? null : Number(v));
const toText = (n: number | null) => (n === null ? "" : String(n));

export default function AdminPricing() {
  const t = useT();
  const { apiError } = useLocaleFormat();
  const [plans, setPlans] = useState<PricingPlanData[] | null>(null);
  const [trialDays, setTrialDays] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PricingPlanData | "new" | null>(null);
  const [deleting, setDeleting] = useState<PricingPlanData | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    getAdminPricing()
      .then((d) => {
        setPlans(d.plans);
        setTrialDays(d.settings.trialDays);
      })
      .catch(() => setLoadError(t("prLoadError")));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, []);

  async function move(index: number, delta: -1 | 1) {
    if (!plans) return;
    const next = [...plans];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setPlans(next);
    try {
      await reorderPlans(next.map((p) => p.id));
    } catch (err) {
      toast.error(apiError(err, t("prSaveFailed")));
      load();
    }
  }

  async function toggleActive(plan: PricingPlanData) {
    setBusy(true);
    try {
      // The route validates and keeps only the plan fields; id/sortOrder ride along unused.
      const saved = await updatePlan(plan.id, { ...plan, active: !plan.active });
      setPlans((ps) => ps?.map((p) => (p.id === plan.id ? saved : p)) ?? null);
    } catch (err) {
      toast.error(apiError(err, t("prSaveFailed")));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await deletePlan(deleting.id);
      setPlans((ps) => ps?.filter((p) => p.id !== deleting.id) ?? null);
      toast.success(t("prDeleted"));
    } catch (err) {
      toast.error(apiError(err, t("prSaveFailed")));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  }

  function onSaved(saved: PricingPlanData) {
    setEditing(null);
    toast.success(t("prSaved"));
    // A new «recommended» plan takes the badge from the others, so reload rather than patch.
    if (saved.recommended) load();
    else setPlans((ps) => (ps?.some((p) => p.id === saved.id) ? ps.map((p) => (p.id === saved.id ? saved : p)) : [...(ps ?? []), saved]));
  }

  const unpriced = plans?.filter((p) => p.active && p.monthlyPriceToman === null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">{t("prTitle")}</h1>
          <p className="text-sm text-gray-500">{t("prSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/#pricing" target="_blank" className={`${ghostBtn} inline-flex items-center gap-1.5`}>
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t("prViewSite")}
          </Link>
          <button type="button" className={`${primaryBtn} inline-flex items-center gap-1.5`} onClick={() => setEditing("new")} disabled={!plans}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("prAddPlan")}
          </button>
        </div>
      </div>

      {loadError && <p className="text-sm text-rose-500">{loadError}</p>}
      {!plans ? (
        !loadError && <p className="text-sm text-gray-500">{t("prLoading")}</p>
      ) : (
        <>
          <TrialSettings initial={trialDays} onSaved={setTrialDays} />

          {unpriced.length > 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {t("prUnpricedWarning")} {unpriced.map((p) => p.name).join("، ")}
            </p>
          )}

          {plans.length === 0 ? (
            <p className={`${card} text-center text-sm text-gray-500`}>{t("prEmpty")}</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  first={i === 0}
                  last={i === plans.length - 1}
                  busy={busy}
                  onUp={() => move(i, -1)}
                  onDown={() => move(i, 1)}
                  onEdit={() => setEditing(plan)}
                  onToggle={() => toggleActive(plan)}
                  onDelete={() => setDeleting(plan)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {editing && <PlanEditor plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      <DeleteConfirmModal
        isOpen={!!deleting}
        title={t("prDeleteTitle")}
        itemName={deleting?.name ?? ""}
        confirmLabel={t("prDelete")}
        cancelLabel={t("prCancel")}
        isDeleting={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

function TrialSettings({ initial, onSaved }: { initial: number; onSaved: (days: number) => void }) {
  const t = useT();
  const { apiError } = useLocaleFormat();
  const [draft, setDraft] = useState(String(initial));
  const [busy, setBusy] = useState(false);
  const value = Number(draft);
  const valid = draft !== "" && value <= PLAN_LIMITS.maxTrialDays;

  async function save() {
    setBusy(true);
    try {
      const saved = await updatePricingSettings({ trialDays: value });
      onSaved(saved.trialDays);
      toast.success(t("prSaved"));
    } catch (err) {
      toast.error(apiError(err, t("prSaveFailed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={card}>
      <h2 className="font-bold text-gray-900 dark:text-white">{t("prTrialTitle")}</h2>
      <p className="mb-4 mt-1 text-sm leading-7 text-gray-600 dark:text-gray-400">{t("prTrialBody")}</p>
      <div className="flex items-center gap-3">
        <input
          className={`${input.replace("w-full", "")} w-24 text-center`}
          inputMode="numeric"
          dir="ltr"
          maxLength={3}
          value={draft}
          onChange={(e) => setDraft(digitsOnly(e.target.value))}
          aria-label={t("prTrialTitle")}
          aria-invalid={!valid}
        />
        <span className="text-sm text-gray-500">{t("prDays")}</span>
        <button type="button" className={primaryBtn} disabled={!valid || value === initial || busy} onClick={save}>
          {busy ? t("prSaving") : t("prSave")}
        </button>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  first,
  last,
  busy,
  onUp,
  onDown,
  onEdit,
  onToggle,
  onDelete,
}: {
  plan: PricingPlanData;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const price = planPriceLabel(plan.monthlyPriceToman);

  return (
    <article className={`${card} flex flex-col ${plan.active ? "" : "opacity-60"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">{plan.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {plan.recommended && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                <Star className="h-3 w-3" aria-hidden />
                {t("prRecommended")}
              </span>
            )}
            {!plan.active && (
              <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {t("prHidden")}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0">
          <button type="button" className={iconBtn} onClick={onUp} disabled={first || busy} aria-label={t("prMoveUp")} title={t("prMoveUp")}>
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={iconBtn} onClick={onDown} disabled={last || busy} aria-label={t("prMoveDown")} title={t("prMoveDown")}>
            <ArrowDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* The landing page's own wording, so always Persian */}
      <div dir="rtl" className="mt-3 flex flex-1 flex-col">
        {plan.description && <p className="text-sm leading-6 text-gray-500">{plan.description}</p>}
        <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
          {price.amount}
          {price.perMonth && <span className="text-xs font-normal text-gray-500"> تومان / ماه</span>}
        </p>
        <ul className="mt-3 flex flex-1 flex-col gap-1.5 text-sm text-gray-600 dark:text-gray-300">
          {planFeatureLines(plan).map((line, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 truncate text-xs text-gray-400">
          {plan.ctaLabel} ← <span dir="ltr">{plan.ctaHref}</span>
        </p>
      </div>

      <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
        <button type="button" className={`${ghostBtn} inline-flex flex-1 items-center justify-center gap-1.5`} onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
          {t("prEdit")}
        </button>
        <button
          type="button"
          className={`${ghostBtn} inline-flex items-center gap-1.5`}
          onClick={onToggle}
          disabled={busy}
          title={plan.active ? t("prHide") : t("prShow")}
        >
          {plan.active ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          {plan.active ? t("prHide") : t("prShow")}
        </button>
        <button
          type="button"
          className={`${iconBtn} text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`}
          onClick={onDelete}
          aria-label={t("prDelete")}
          title={t("prDelete")}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}

function PlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: PricingPlanData | null;
  onClose: () => void;
  onSaved: (plan: PricingPlanData) => void;
}) {
  const t = useT();
  const { apiError, num } = useLocaleFormat();
  const [name, setName] = useState(plan?.name ?? "");
  const [description, setDescription] = useState(plan?.description ?? "");
  const [price, setPrice] = useState(toText(plan?.monthlyPriceToman ?? null));
  const [maxStylists, setMaxStylists] = useState(toText(plan?.maxStylists ?? null));
  const [sms, setSms] = useState(toText(plan?.smsPerMonth ?? null));
  const [features, setFeatures] = useState((plan?.features ?? []).join("\n"));
  const [recommended, setRecommended] = useState(plan?.recommended ?? false);
  const [active, setActive] = useState(plan?.active ?? true);
  const [ctaLabel, setCtaLabel] = useState(plan?.ctaLabel ?? "انتخاب پلن");
  const [ctaHref, setCtaHref] = useState(plan?.ctaHref ?? "/signup-salon");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft: PlanDraft = {
    name: name.trim(),
    description: description.trim() || null,
    monthlyPriceToman: toNumberOrNull(price),
    maxStylists: toNumberOrNull(maxStylists),
    smsPerMonth: toNumberOrNull(sms),
    features: features.split("\n").map((f) => f.trim()).filter(Boolean),
    recommended,
    active,
    ctaLabel: ctaLabel.trim(),
    ctaHref: ctaHref.trim(),
  };

  const problem =
    !draft.name ? t("prErrName")
    : draft.maxStylists === 0 ? t("prErrStylists")
    : (draft.monthlyPriceToman ?? 0) > PLAN_LIMITS.maxPrice ? t("prErrPrice")
    : draft.features.length > PLAN_LIMITS.features || draft.features.some((f) => f.length > PLAN_LIMITS.feature) ? t("prErrFeatures")
    : !draft.ctaLabel ? t("prErrCtaLabel")
    : !isSafeCtaHref(draft.ctaHref) ? t("prErrCtaHref")
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onSaved(plan ? await updatePlan(plan.id, draft) : await createPlan(draft));
    } catch (err) {
      setError(apiError(err, t("prSaveFailed")));
    } finally {
      setBusy(false);
    }
  }

  const pricePreview = planPriceLabel(draft.monthlyPriceToman);

  return (
    <Modal isOpen onClose={onClose} className="mx-4 max-w-2xl">
      <form onSubmit={submit} className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <h3 className="mb-5 text-lg font-bold text-gray-900 dark:text-white">{plan ? t("prEditTitle") : t("prAddTitle")}</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className={label}>{t("prName")}</span>
            <input className={input} value={name} maxLength={PLAN_LIMITS.name} onChange={(e) => setName(e.target.value)} dir="rtl" />
          </label>

          <label className="sm:col-span-2">
            <span className={label}>{t("prDescription")}</span>
            <input
              className={input}
              value={description}
              maxLength={PLAN_LIMITS.description}
              onChange={(e) => setDescription(e.target.value)}
              dir="rtl"
            />
            <span className={hint}>{t("prDescriptionHint")}</span>
          </label>

          <label>
            <span className={label}>{t("prPrice")}</span>
            <input className={input} inputMode="numeric" dir="ltr" value={price} maxLength={10} onChange={(e) => setPrice(digitsOnly(e.target.value))} />
            <span className={hint}>
              <span dir="rtl" className="font-semibold text-gray-700 dark:text-gray-300">
                {pricePreview.amount}
                {pricePreview.perMonth && " تومان / ماه"}
              </span>
              {" — "}
              {t("prPriceHint")}
            </span>
          </label>

          <label>
            <span className={label}>{t("prMaxStylists")}</span>
            <input
              className={input}
              inputMode="numeric"
              dir="ltr"
              value={maxStylists}
              maxLength={6}
              onChange={(e) => setMaxStylists(digitsOnly(e.target.value))}
            />
            <span className={hint}>{t("prMaxStylistsHint")}</span>
          </label>

          <label>
            <span className={label}>{t("prSms")}</span>
            <input className={input} inputMode="numeric" dir="ltr" value={sms} maxLength={6} onChange={(e) => setSms(digitsOnly(e.target.value))} />
            <span className={hint}>{t("prSmsHint")}</span>
          </label>

          <div className="flex flex-col justify-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={recommended} onChange={(e) => setRecommended(e.target.checked)} className="h-4 w-4 accent-brand-500" />
              {t("prRecommendedToggle")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-brand-500" />
              {t("prActiveToggle")}
            </label>
          </div>

          <label className="sm:col-span-2">
            <span className={label}>{t("prFeatures")}</span>
            <textarea
              className={`${input} h-32 py-2 leading-7`}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              dir="rtl"
            />
            <span className={hint}>{t("prFeaturesHint").replace("{n}", num(PLAN_LIMITS.features))}</span>
          </label>

          <label>
            <span className={label}>{t("prCtaLabel")}</span>
            <input className={input} value={ctaLabel} maxLength={PLAN_LIMITS.ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} dir="rtl" />
          </label>

          <label>
            <span className={label}>{t("prCtaHref")}</span>
            <input className={input} value={ctaHref} maxLength={PLAN_LIMITS.ctaHref} onChange={(e) => setCtaHref(e.target.value)} dir="ltr" />
            <span className={hint}>{t("prCtaHrefHint")}</span>
          </label>
        </div>

        <div dir="rtl" className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/5">
          <p className="mb-2 text-xs font-semibold text-gray-500">{t("prPreview")}</p>
          <ul className="flex flex-col gap-1 text-sm text-gray-700 dark:text-gray-300">
            {planFeatureLines(draft).map((line, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="mt-4 text-sm text-rose-500">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className={ghostBtn} onClick={onClose} disabled={busy}>
            {t("prCancel")}
          </button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? t("prSaving") : t("prSave")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
