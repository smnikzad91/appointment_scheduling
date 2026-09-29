"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BellOff, BellRing, Clock, FolderCog, Plus, Scissors, Trash2 } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  listMyCategories,
  createCategory,
  deleteCategory,
  listMyServices,
  createService,
  updateService,
  type OwnerCategory,
  type OwnerService,
} from "@/lib/api/ownerSalon";
import { formatToman, normalizeDigits, toPersianDigits } from "@/lib/persian";
import Sheet from "@/components/app/Sheet";
import {
  Button,
  ChipTabs,
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
import PickerSelect from "@/components/app/PickerSelect";

interface ServiceDraft {
  id: string | null; // null = new service
  name: string;
  categoryId: string;
  durationMinutes: string;
  priceToman: string;
  rebookEnabled: boolean;
  rebookDays: string;
}

/** "Time to book again" SMS defaults for a new service. */
const REBOOK_DEFAULT_DAYS = 30;
const REBOOK_MAX_DAYS = 365;

const EMPTY_DRAFT: ServiceDraft = {
  id: null,
  name: "",
  categoryId: "",
  durationMinutes: "",
  priceToman: "",
  rebookEnabled: true,
  rebookDays: String(REBOOK_DEFAULT_DAYS),
};

export default function SalonServicesPage() {
  const token = useApiAccessToken();
  const [categories, setCategories] = useState<OwnerCategory[] | null>(null);
  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const [draft, setDraft] = useState<ServiceDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Services whose on/off switch is being saved (locked until the server answers).
  const [pendingActive, setPendingActive] = useState<Set<string>>(() => new Set());
  // Only the newest load may write the list: a reload started before a later change (a switch
  // tapped while it was in flight) would otherwise put the old state back on screen.
  const loadSeq = useRef(0);

  const reload = useCallback(() => {
    if (!token) return;
    const seq = ++loadSeq.current;
    Promise.all([listMyCategories(token), listMyServices(token)])
      .then(([c, s]) => {
        if (seq !== loadSeq.current) return;
        setCategories(c);
        setServices(s);
      })
      .catch(() => {
        if (seq === loadSeq.current) setError("خطا در دریافت اطلاعات");
      });
  }, [token]);

  /** Put the server's copy of a saved service in the list (and drop any older load still in flight). */
  function applySaved(saved: OwnerService) {
    loadSeq.current++;
    setServices((list) => list?.map((s) => (s.id === saved.id ? saved : s)) ?? list);
  }

  useEffect(reload, [reload]);

  function openNew() {
    setDraftError(null);
    setDraft({ ...EMPTY_DRAFT, categoryId: filter !== "all" && filter !== "none" ? filter : "" });
  }

  function openEdit(service: OwnerService) {
    setDraftError(null);
    setDraft({
      id: service.id,
      name: service.name,
      categoryId: service.categoryId ?? "",
      durationMinutes: String(service.durationMinutes),
      priceToman: String(service.priceToman),
      rebookEnabled: service.rebookReminderEnabled,
      rebookDays: String(service.rebookReminderDays),
    });
  }

  async function handleSave() {
    if (!token || !draft) return;
    const duration = Number(normalizeDigits(draft.durationMinutes));
    const price = Number(normalizeDigits(draft.priceToman));
    if (!draft.name.trim() || !duration || !price) {
      setDraftError("نام، مدت و قیمت خدمت را کامل کنید");
      return;
    }
    const rebookDays = Number(normalizeDigits(draft.rebookDays));
    if (draft.rebookEnabled && !(rebookDays >= 1 && rebookDays <= REBOOK_MAX_DAYS)) {
      setDraftError(`فاصله یادآوری باید بین ۱ تا ${toPersianDigits(REBOOK_MAX_DAYS)} روز باشد`);
      return;
    }
    const rebook = {
      rebookReminderEnabled: draft.rebookEnabled,
      ...(rebookDays >= 1 && rebookDays <= REBOOK_MAX_DAYS && { rebookReminderDays: rebookDays }),
    };
    setSaving(true);
    setDraftError(null);
    try {
      if (draft.id) {
        const saved = await updateService(token, draft.id, {
          name: draft.name.trim(),
          categoryId: draft.categoryId || null,
          durationMinutes: duration,
          priceToman: price,
          ...rebook,
        });
        applySaved(saved);
      } else {
        await createService(token, {
          name: draft.name.trim(),
          categoryId: draft.categoryId || undefined,
          durationMinutes: duration,
          priceToman: price,
          ...rebook,
        });
      }
      setDraft(null);
      reload();
    } catch {
      setDraftError("ذخیره خدمت انجام نشد، دوباره تلاش کنید");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(service: OwnerService) {
    if (!token || pendingActive.has(service.id)) return;
    const active = !service.active;
    setError(null);
    setPendingActive((ids) => new Set(ids).add(service.id));
    // Optimistic — the switch should feel instant; the server's answer then settles it.
    loadSeq.current++;
    setServices((list) => list?.map((s) => (s.id === service.id ? { ...s, active } : s)) ?? list);
    try {
      applySaved(await updateService(token, service.id, { active }));
    } catch {
      setError("تغییر وضعیت خدمت انجام نشد");
      reload();
    } finally {
      setPendingActive((ids) => {
        const next = new Set(ids);
        next.delete(service.id);
        return next;
      });
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newCategoryName.trim()) return;
    setCategoryError(null);
    try {
      await createCategory(token, { name: newCategoryName.trim(), order: categories?.length ?? 0 });
      setNewCategoryName("");
      reload();
    } catch {
      setCategoryError("افزودن دسته‌بندی انجام نشد");
    }
  }

  async function handleDeleteCategory(category: OwnerCategory) {
    if (!token || !confirm(`دسته «${category.name}» حذف شود؟ خدمات آن بدون دسته می‌مانند.`)) return;
    setCategoryError(null);
    try {
      await deleteCategory(token, category.id);
      if (filter === category.id) setFilter("all");
      reload();
    } catch {
      setCategoryError("حذف دسته‌بندی انجام نشد");
    }
  }

  if (!categories || !services) {
    return error ? <ErrorBanner onRetry={reload}>{error}</ErrorBanner> : <ListSkeleton />;
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const visible = services
    .filter((s) => (filter === "all" ? true : filter === "none" ? !s.categoryId : s.categoryId === filter))
    .sort((a, b) => Number(b.active) - Number(a.active));
  const hasUncategorized = services.some((s) => !s.categoryId);

  return (
    <>
      <PageHeader
        title="خدمات"
        subtitle={`${toPersianDigits(services.filter((s) => s.active).length)} خدمت فعال`}
        action={<IconButton icon={Plus} label="افزودن خدمت" onClick={openNew} />}
      />

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ChipTabs
            bleed={false}
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "همه" },
              ...categories.map((c) => ({ value: c.id, label: c.name, count: services.filter((s) => s.categoryId === c.id).length })),
              ...(hasUncategorized ? [{ value: "none", label: "بدون دسته" }] : []),
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => setCategoriesOpen(true)}
          aria-label="مدیریت دسته‌بندی‌ها"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-card text-app-muted active:scale-90"
        >
          <FolderCog className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </div>

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {visible.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="هنوز خدمتی اینجا نیست"
          hint="خدماتی که سالن ارائه می‌دهد را با مدت و قیمت اضافه کنید تا مشتری‌ها بتوانند رزرو کنند."
          action={<Button icon={Plus} onClick={openNew}>افزودن خدمت</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {visible.map((service, i) => (
            <div
              key={service.id}
              style={riseStyle(i)}
              className={cx(
                "app-rise flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-4 shadow-app",
                !service.active && "opacity-60",
              )}
            >
              <button type="button" onClick={() => openEdit(service)} className="min-w-0 flex-1 text-start active:opacity-70">
                <p className="truncate text-[15px] font-bold text-app-ink">{service.name}</p>
                <p className="mt-1 flex items-center gap-1.5 text-[13px] text-app-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {toPersianDigits(service.durationMinutes)} دقیقه
                  <Sep className="mx-0" />
                  <span className="font-semibold text-app-ink/80">{formatToman(service.priceToman)}</span>
                </p>
                {/* Always shown, on or off: it's set in the edit sheet, not by the switch beside it. */}
                <p className="mt-1 flex items-center gap-1.5 text-[12px] text-app-muted">
                  {service.rebookReminderEnabled ? (
                    <>
                      <BellRing className="h-3.5 w-3.5" aria-hidden />
                      پیامک یادآوری: {toPersianDigits(service.rebookReminderDays)} روز بعد
                    </>
                  ) : (
                    <>
                      <BellOff className="h-3.5 w-3.5" aria-hidden />
                      پیامک یادآوری: خاموش
                    </>
                  )}
                </p>
                {filter === "all" && categoryName(service.categoryId) && (
                  <span className="mt-2 inline-block rounded-full bg-app-card-2 px-2.5 py-0.5 text-[11px] font-semibold text-app-muted">
                    {categoryName(service.categoryId)}
                  </span>
                )}
              </button>
              {/* This switch is the service itself (bookable or not) — labelled so it isn't read as the SMS reminder. */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <Toggle
                  checked={service.active}
                  disabled={pendingActive.has(service.id)}
                  onChange={() => handleToggleActive(service)}
                  label={`فعال بودن ${service.name}`}
                />
                <span className={cx("text-[11px] font-bold", service.active ? "text-app-accent" : "text-app-muted")}>
                  {service.active ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit service */}
      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "ویرایش خدمت" : "خدمت جدید"}
        footer={
          <Button block busy={saving} onClick={handleSave}>
            {draft?.id ? "ذخیره تغییرات" : "افزودن خدمت"}
          </Button>
        }
      >
        {draft && (
          <div className="flex flex-col gap-4">
            <Field label="نام خدمت">
              <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً کوتاهی مو" autoFocus={!draft.id} />
            </Field>
            <Field label="دسته‌بندی">
              <PickerSelect
                title="دسته‌بندی"
                value={draft.categoryId}
                onChange={(categoryId) => setDraft({ ...draft, categoryId })}
                options={[{ value: "", label: "بدون دسته" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مدت (دقیقه)">
                <TextInput
                  inputMode="numeric"
                  dir="ltr"
                  className="text-end"
                  value={draft.durationMinutes}
                  onChange={(e) => setDraft({ ...draft, durationMinutes: normalizeDigits(e.target.value).replace(/\D/g, "") })}
                  placeholder="۴۵"
                />
              </Field>
              <Field label="قیمت (تومان)" hint={Number(draft.priceToman) ? formatToman(Number(draft.priceToman)) : undefined}>
                <TextInput
                  inputMode="numeric"
                  dir="ltr"
                  className="text-end"
                  value={draft.priceToman}
                  onChange={(e) => setDraft({ ...draft, priceToman: normalizeDigits(e.target.value).replace(/\D/g, "") })}
                  placeholder="۳۵۰۰۰۰"
                />
              </Field>
            </div>
            <div className="rounded-2xl border border-app-line bg-app-card p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-app-ink">پیامک یادآوری نوبت بعدی</p>
                  <p className="mt-0.5 text-xs leading-5 text-app-muted">
                    چند روز بعد از انجام این خدمت، به مشتری پیامک می‌دهیم که وقت نوبت بعدی است (با لینک رزرو).
                  </p>
                </div>
                <Toggle
                  checked={draft.rebookEnabled}
                  onChange={(rebookEnabled) => setDraft({ ...draft, rebookEnabled })}
                  label="پیامک یادآوری نوبت بعدی"
                />
              </div>
              {draft.rebookEnabled && (
                <div className="mt-3">
                <Field label="چند روز بعد؟" hint="هر روز ساعت ۱۲ ظهر ارسال می‌شود و از سهمیه پیامک ماهانه کم می‌شود.">
                  <TextInput
                    inputMode="numeric"
                    dir="ltr"
                    className="text-end"
                    value={draft.rebookDays}
                    onChange={(e) => setDraft({ ...draft, rebookDays: normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 3) })}
                    placeholder={toPersianDigits(REBOOK_DEFAULT_DAYS)}
                  />
                </Field>
                </div>
              )}
            </div>
            {draftError && <p className="text-sm font-medium text-app-danger">{draftError}</p>}
          </div>
        )}
      </Sheet>

      {/* Categories */}
      <Sheet open={categoriesOpen} onClose={() => setCategoriesOpen(false)} title="دسته‌بندی‌ها">
        <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
          <TextInput value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="نام دسته جدید، مثلاً ناخن" />
          <Button type="submit" icon={Plus} className="shrink-0 px-4" aria-label="افزودن دسته">
            افزودن
          </Button>
        </form>
        {categoryError && <p className="mb-3 text-sm font-medium text-app-danger">{categoryError}</p>}
        {categories.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-muted">هنوز دسته‌بندی ندارید.</p>
        ) : (
          <ListGroup>
            {categories.map((c) => (
              <div key={c.id} className="flex h-14 items-center justify-between px-4">
                <span className="font-semibold text-app-ink">
                  {c.name}
                  <span className="ms-2 text-xs font-medium text-app-muted">
                    {toPersianDigits(services.filter((s) => s.categoryId === c.id).length)} خدمت
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c)}
                  aria-label={`حذف ${c.name}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-app-muted active:bg-app-danger/10 active:text-app-danger"
                >
                  <Trash2 className="h-[18px] w-[18px]" aria-hidden />
                </button>
              </div>
            ))}
          </ListGroup>
        )}
      </Sheet>
    </>
  );
}
