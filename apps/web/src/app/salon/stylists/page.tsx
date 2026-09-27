"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, Share2, UserPlus, Users } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  listMyStylists,
  inviteStylist,
  updateStylist,
  setStylistServices,
  listMyServices,
  type OwnerStylist,
  type OwnerService,
  type StylistServiceEntry,
} from "@/lib/api/ownerSalon";
import { normalizeDigits, formatToman, toPersianDigits, isValidIranianMobile } from "@/lib/persian";
import { SalonApiError } from "@/lib/api/salonApiClient";
import Sheet from "@/components/app/Sheet";
import ProfilePhotos, { type PhotoPatch } from "@/components/app/ProfilePhotos";
import CommissionInput, { parseCommission } from "@/components/app/CommissionInput";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  ListGroup,
  ListSkeleton,
  PageHeader,
  TextInput,
  Toggle,
  cx,
  riseStyle,
} from "@/components/app/ui";
import Sep from "@/components/common/Sep";

const EMPTY_INVITE = { phone: "", firstName: "", lastName: "", displayName: "", commission: "" };

export default function SalonStylistsPage() {
  const token = useApiAccessToken();
  const [stylists, setStylists] = useState<OwnerStylist[] | null>(null);
  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, { price: string; duration: string }>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);
  const [commissionSaved, setCommissionSaved] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [created, setCreated] = useState<{ name: string; phone: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reload = useCallback(() => {
    if (!token) return;
    Promise.all([listMyStylists(token), listMyServices(token)])
      .then(([s, sv]) => {
        setStylists(s);
        setServices(sv);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

  useEffect(reload, [reload]);

  const selected = stylists?.find((s) => s.id === selectedId) ?? null;

  function openStylist(stylist: OwnerStylist) {
    setSheetError(null);
    setOverrideDrafts({});
    setCommissionDraft(String(stylist.commissionPercent));
    setCommissionSaved(false);
    setSelectedId(stylist.id);
  }

  async function handleToggleActive(stylist: OwnerStylist) {
    if (!token) return;
    setError(null);
    setStylists((list) => list?.map((s) => (s.id === stylist.id ? { ...s, active: !s.active } : s)) ?? list);
    try {
      await updateStylist(token, stylist.id, { active: !stylist.active });
    } catch {
      setError("تغییر وضعیت آرایشگر انجام نشد");
      reload();
    }
  }

  async function savePhotos(stylist: OwnerStylist, patch: PhotoPatch) {
    if (!token) return;
    const updated = await updateStylist(token, stylist.id, patch);
    setStylists((list) => list?.map((s) => (s.id === stylist.id ? { ...s, avatarUrl: updated.avatarUrl, coverImageUrl: updated.coverImageUrl } : s)) ?? list);
  }

  async function saveServices(stylist: OwnerStylist, next: StylistServiceEntry[], serviceId: string) {
    if (!token) return;
    setSavingServiceId(serviceId);
    setSheetError(null);
    try {
      await setStylistServices(token, stylist.id, next);
      reload();
    } catch {
      setSheetError("به‌روزرسانی خدمات آرایشگر انجام نشد");
    } finally {
      setSavingServiceId(null);
    }
  }

  function handleToggleService(stylist: OwnerStylist, serviceId: string) {
    const exists = stylist.services.some((s) => s.serviceId === serviceId);
    const next: StylistServiceEntry[] = exists
      ? stylist.services.filter((s) => s.serviceId !== serviceId)
      : [...stylist.services, { serviceId, overridePriceToman: null, overrideDurationMinutes: null }];
    // Optimistic so the switch responds immediately.
    setStylists((list) =>
      list?.map((s) =>
        s.id === stylist.id
          ? { ...s, services: next.map((n) => ({ serviceId: n.serviceId, overridePriceToman: n.overridePriceToman ?? null, overrideDurationMinutes: n.overrideDurationMinutes ?? null })) }
          : s,
      ) ?? list,
    );
    void saveServices(stylist, next, serviceId);
  }

  function draftFor(stylist: OwnerStylist, serviceId: string) {
    if (overrideDrafts[serviceId]) return overrideDrafts[serviceId];
    const existing = stylist.services.find((s) => s.serviceId === serviceId);
    return {
      price: existing?.overridePriceToman != null ? String(existing.overridePriceToman) : "",
      duration: existing?.overrideDurationMinutes != null ? String(existing.overrideDurationMinutes) : "",
    };
  }

  function overrideDirty(stylist: OwnerStylist, serviceId: string) {
    const draft = overrideDrafts[serviceId];
    if (!draft) return false;
    const existing = stylist.services.find((s) => s.serviceId === serviceId);
    return (
      draft.price !== (existing?.overridePriceToman != null ? String(existing.overridePriceToman) : "") ||
      draft.duration !== (existing?.overrideDurationMinutes != null ? String(existing.overrideDurationMinutes) : "")
    );
  }

  function handleSaveOverride(stylist: OwnerStylist, serviceId: string) {
    const draft = draftFor(stylist, serviceId);
    setOverrideDrafts((d) => {
      const rest = { ...d };
      delete rest[serviceId];
      return rest;
    });
    const next: StylistServiceEntry[] = stylist.services.map((s) =>
      s.serviceId === serviceId
        ? {
            serviceId,
            overridePriceToman: draft.price.trim() ? Number(draft.price) : null,
            overrideDurationMinutes: draft.duration.trim() ? Number(draft.duration) : null,
          }
        : s,
    );
    void saveServices(stylist, next, serviceId);
  }

  async function saveCommission(stylist: OwnerStylist) {
    const commissionPercent = parseCommission(commissionDraft);
    if (!token || commissionPercent === null) return;
    setSavingCommission(true);
    setSheetError(null);
    try {
      const updated = await updateStylist(token, stylist.id, { commissionPercent });
      setStylists((list) => list?.map((s) => (s.id === stylist.id ? { ...s, commissionPercent: updated.commissionPercent } : s)) ?? list);
      setCommissionSaved(true);
    } catch {
      setSheetError("ذخیره سهم آرایشگر انجام نشد");
    } finally {
      setSavingCommission(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const phone = normalizeDigits(invite.phone);
    if (!invite.firstName.trim() || !invite.lastName.trim()) {
      setInviteError("نام و نام خانوادگی را وارد کنید");
      return;
    }
    if (!isValidIranianMobile(phone)) {
      setInviteError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد");
      return;
    }
    const commissionPercent = parseCommission(invite.commission);
    if (commissionPercent === null) {
      setInviteError("سهم آرایشگر از درآمد را وارد کنید (۰ تا ۱۰۰ درصد)");
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const result = await inviteStylist(token, {
        phone,
        firstName: invite.firstName.trim(),
        lastName: invite.lastName.trim(),
        displayName: invite.displayName.trim() || invite.firstName.trim(),
        commissionPercent,
      });
      setInvite(EMPTY_INVITE);
      if (result.tempPassword) {
        setCreated({ name: result.displayName, phone, password: result.tempPassword });
      } else {
        setInviteOpen(false);
      }
      reload();
    } catch (err) {
      setInviteError(err instanceof SalonApiError && err.status === 409 ? "این شماره قبلاً در نوبتا ثبت شده و نمی‌توان آن را به‌عنوان آرایشگر اضافه کرد" : "افزودن آرایشگر انجام نشد");
    } finally {
      setInviting(false);
    }
  }

  const credentialsText = created
    ? `ورود به پنل آرایشگر نوبتا\nشماره موبایل: ${created.phone}\nرمز عبور موقت: ${created.password}\n${typeof window !== "undefined" ? window.location.origin : ""}/signin`
    : "";

  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the password is still visible on screen.
    }
  }

  async function shareCredentials() {
    try {
      await navigator.share({ text: credentialsText });
    } catch {
      // Dismissed.
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    setCreated(null);
    setInviteError(null);
  }

  if (!stylists || !services) {
    return error ? <ErrorBanner onRetry={reload}>{error}</ErrorBanner> : <ListSkeleton />;
  }

  const activeServices = services.filter((s) => s.active);

  return (
    <>
      <PageHeader
        title="آرایشگرها"
        subtitle={`${toPersianDigits(stylists.filter((s) => s.active).length)} آرایشگر فعال`}
        action={<IconButton icon={Plus} label="دعوت آرایشگر" onClick={() => setInviteOpen(true)} />}
      />

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {stylists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="هنوز آرایشگری اضافه نکرده‌اید"
          hint="آرایشگرها را با شماره موبایل دعوت کنید؛ هرکدام پنل خودش را برای دیدن نوبت‌ها و تنظیم ساعات کاری دارد."
          action={<Button icon={UserPlus} onClick={() => setInviteOpen(true)}>دعوت آرایشگر</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {stylists.map((stylist, i) => (
            <div
              key={stylist.id}
              style={riseStyle(i)}
              className={cx("app-rise flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-3.5 shadow-app", !stylist.active && "opacity-60")}
            >
              <button type="button" onClick={() => openStylist(stylist)} className="flex min-w-0 flex-1 items-center gap-3 text-start active:opacity-70">
                <Avatar name={stylist.displayName} src={stylist.avatarUrl} size={52} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-bold text-app-ink">{stylist.displayName}</span>
                  <span className="mt-0.5 block text-[13px] text-app-muted">
                    {toPersianDigits(stylist.services.length)} خدمت
                    <Sep />
                    سهم {toPersianDigits(stylist.commissionPercent)}٪
                    {stylist.user.phone && (
                      <>
                        <Sep />
                        <span dir="ltr">{toPersianDigits(stylist.user.phone)}</span>
                      </>
                    )}
                  </span>
                </span>
              </button>
              <Toggle checked={stylist.active} onChange={() => handleToggleActive(stylist)} label={`فعال بودن ${stylist.displayName}`} />
            </div>
          ))}
        </div>
      )}

      {/* Stylist detail */}
      <Sheet open={selected !== null} onClose={() => setSelectedId(null)} title={selected?.displayName ?? ""}>
        {selected && (
          <>
            <ProfilePhotos
              name={selected.displayName}
              coverUrl={selected.coverImageUrl}
              avatarUrl={selected.avatarUrl}
              avatarLabel="عکس آرایشگر"
              folder="stylists"
              onSave={(patch) => savePhotos(selected, patch)}
              hint={`${selected.user.firstName} ${selected.user.lastName}${selected.user.phone ? `، ${toPersianDigits(selected.user.phone)}` : ""}`}
            />
            <div className="mb-5" />

            {sheetError && <p className="mb-3 rounded-2xl bg-app-danger/10 px-4 py-3 text-sm font-medium text-app-danger">{sheetError}</p>}

            <h3 className="mb-2 px-1 text-[13px] font-bold text-app-muted">سهم آرایشگر از درآمد</h3>
            <div className="mb-5 rounded-3xl border border-app-line bg-app-card p-4">
              <CommissionInput
                value={commissionDraft}
                onChange={(v) => {
                  setCommissionDraft(v);
                  setCommissionSaved(false);
                }}
              />
              {parseCommission(commissionDraft) !== null && parseCommission(commissionDraft) !== selected.commissionPercent ? (
                <Button block className="mt-3" busy={savingCommission} onClick={() => saveCommission(selected)}>
                  ذخیره سهم {toPersianDigits(parseCommission(commissionDraft)!)}٪
                </Button>
              ) : (
                commissionSaved && <p className="mt-2 px-1 text-sm font-bold text-app-done">ذخیره شد</p>
              )}
              <p className="mt-2 px-1 text-xs leading-6 text-app-muted">تغییر سهم فقط روی نوبت‌هایی اثر دارد که از این به بعد «انجام‌شده» می‌شوند.</p>
            </div>

            <h3 className="mb-2 px-1 text-[13px] font-bold text-app-muted">خدماتی که ارائه می‌دهد</h3>
            {activeServices.length === 0 ? (
              <p className="rounded-2xl bg-app-card-2 p-4 text-sm text-app-muted">ابتدا در تب خدمات، خدمتی اضافه کنید.</p>
            ) : (
              <ListGroup>
                {activeServices.map((service) => {
                  const assigned = selected.services.some((s) => s.serviceId === service.id);
                  const draft = draftFor(selected, service.id);
                  return (
                    <div key={service.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-app-ink">{service.name}</p>
                          <p className="text-xs text-app-muted">
                            پیش‌فرض: {formatToman(service.priceToman)}<Sep />{toPersianDigits(service.durationMinutes)} دقیقه
                          </p>
                        </div>
                        <Toggle
                          checked={assigned}
                          disabled={savingServiceId === service.id}
                          onChange={() => handleToggleService(selected, service.id)}
                          label={`ارائه ${service.name}`}
                        />
                      </div>
                      {assigned && (
                        <div className="mt-3 flex items-end gap-2">
                          <label className="min-w-0 flex-1">
                            <span className="mb-1 block text-[11px] font-bold text-app-muted">قیمت اختصاصی</span>
                            <TextInput
                              inputMode="numeric"
                              dir="ltr"
                              className="h-11 text-end"
                              placeholder={toPersianDigits(service.priceToman)}
                              value={draft.price}
                              onChange={(e) => setOverrideDrafts((d) => ({ ...d, [service.id]: { ...draft, price: normalizeDigits(e.target.value).replace(/\D/g, "") } }))}
                            />
                          </label>
                          <label className="w-24">
                            <span className="mb-1 block text-[11px] font-bold text-app-muted">دقیقه</span>
                            <TextInput
                              inputMode="numeric"
                              dir="ltr"
                              className="h-11 text-end"
                              placeholder={toPersianDigits(service.durationMinutes)}
                              value={draft.duration}
                              onChange={(e) => setOverrideDrafts((d) => ({ ...d, [service.id]: { ...draft, duration: normalizeDigits(e.target.value).replace(/\D/g, "") } }))}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleSaveOverride(selected, service.id)}
                            disabled={!overrideDirty(selected, service.id) || savingServiceId === service.id}
                            aria-label={`ذخیره قیمت اختصاصی ${service.name}`}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent text-app-accent-ink transition active:scale-90 disabled:bg-app-card-2 disabled:text-app-muted"
                          >
                            <Check className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </ListGroup>
            )}
            <p className="mt-2 px-1 text-xs leading-6 text-app-muted">
              قیمت و زمان اختصاصی را خالی بگذارید تا مقدار پیش‌فرض سالن برای این آرایشگر اعمال شود.
            </p>
          </>
        )}
      </Sheet>

      {/* Invite */}
      <Sheet open={inviteOpen} onClose={closeInvite} title={created ? "حساب آرایشگر ساخته شد" : "دعوت آرایشگر"}>
        {created ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-7 text-app-muted">
              {created.name} با همین شماره موبایل و این رمز موقت از صفحه ورود وارد پنل آرایشگر می‌شود. این رمز فقط همین یک بار نمایش داده
              می‌شود.
            </p>
            <div className="flex items-center gap-3 rounded-3xl border border-dashed border-app-accent/50 bg-app-accent-soft p-4">
              <KeyRound className="h-6 w-6 shrink-0 text-app-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-app-muted">رمز عبور موقت</p>
                <p dir="ltr" className="text-end font-mono text-xl font-bold tracking-wider text-app-ink">
                  {created.password}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Button variant="secondary" icon={copied ? Check : Copy} onClick={copyCredentials}>
                {copied ? "کپی شد" : "کپی"}
              </Button>
              <Button icon={Share2} onClick={shareCredentials}>
                ارسال
              </Button>
            </div>
            <Button variant="ghost" block onClick={closeInvite}>
              تمام
            </Button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="نام">
                <TextInput value={invite.firstName} onChange={(e) => setInvite((f) => ({ ...f, firstName: e.target.value }))} autoComplete="given-name" />
              </Field>
              <Field label="نام خانوادگی">
                <TextInput value={invite.lastName} onChange={(e) => setInvite((f) => ({ ...f, lastName: e.target.value }))} autoComplete="family-name" />
              </Field>
            </div>
            <Field label="نام نمایشی برای مشتری‌ها" hint="اختیاری — اگر خالی بماند، نام کوچک نمایش داده می‌شود.">
              <TextInput value={invite.displayName} onChange={(e) => setInvite((f) => ({ ...f, displayName: e.target.value }))} placeholder="مثلاً نگار" />
            </Field>
            <Field label="سهم آرایشگر از درآمد">
              <CommissionInput value={invite.commission} onChange={(commission) => setInvite((f) => ({ ...f, commission }))} />
            </Field>
            <Field label="شماره موبایل">
              <TextInput
                type="tel"
                inputMode="numeric"
                dir="ltr"
                className="text-end"
                maxLength={11}
                value={invite.phone}
                onChange={(e) => setInvite((f) => ({ ...f, phone: normalizeDigits(e.target.value) }))}
                placeholder="09121234567"
              />
            </Field>
            {inviteError && <p className="text-sm font-medium text-app-danger">{inviteError}</p>}
            <Button type="submit" block icon={UserPlus} busy={inviting}>
              ساخت حساب آرایشگر
            </Button>
          </form>
        )}
      </Sheet>
    </>
  );
}
