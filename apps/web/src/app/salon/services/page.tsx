"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BellOff, BellRing, ChevronLeft, Clock, FolderCog, FolderPlus, Plus, Scissors, Trash2 } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  listMyCategories,
  createCategory,
  deleteCategory,
  updateCategory,
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
import { toastError } from "@/lib/toastError";

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
  const [saving, setSaving] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  // The category being renamed in the categories sheet (it switches to an edit view).
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [categoryBusy, setCategoryBusy] = useState(false);
  // «+ دسته جدید» inside the service sheet: a name being typed (null = closed).
  const [inlineCategory, setInlineCategory] = useState<string | null>(null);

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
    setDraft({ ...EMPTY_DRAFT, categoryId: filter !== "all" && filter !== "none" ? filter : "" });
  }

  function openEdit(service: OwnerService) {
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
      toastError("نام، مدت و قیمت خدمت را کامل کنید");
      return;
    }
    const rebookDays = Number(normalizeDigits(draft.rebookDays));
    if (draft.rebookEnabled && !(rebookDays >= 1 && rebookDays <= REBOOK_MAX_DAYS)) {
      toastError(`فاصله یادآوری باید بین ۱ تا ${toPersianDigits(REBOOK_MAX_DAYS)} روز باشد`);
      return;
    }
    const rebook = {
      rebookReminderEnabled: draft.rebookEnabled,
      ...(rebookDays >= 1 && rebookDays <= REBOOK_MAX_DAYS && { rebookReminderDays: rebookDays }),
    };
    setSaving(true);
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
      toastError("ذخیره خدمت انجام نشد، دوباره تلاش کنید");
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
      toastError("تغییر وضعیت خدمت انجام نشد");
      reload();
    } finally {
      setPendingActive((ids) => {
        const next = new Set(ids);
        next.delete(service.id);
        return next;
      });
    }
  }

  /** Creates a category at the end of the list; returns it (null on failure, already reported). */
  async function addCategory(name: string): Promise<OwnerCategory | null> {
    if (!token || !name.trim()) return null;
    const order = Math.max(-1, ...(categories ?? []).map((c) => c.order)) + 1;
    try {
      const created = await createCategory(token, { name: name.trim(), order });
      setCategories((list) => (list ? [...list, created] : list));
      return created;
    } catch {
      toastError("افزودن دسته‌بندی انجام نشد");
      return null;
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (await addCategory(newCategoryName)) setNewCategoryName("");
  }

  /** «+ دسته جدید» in the service sheet: create it and pick it for this service. */
  async function handleInlineCategory() {
    if (inlineCategory === null || !draft) return;
    const created = await addCategory(inlineCategory);
    if (created) {
      setDraft((d) => (d ? { ...d, categoryId: created.id } : d));
      setInlineCategory(null);
    }
  }

  async function handleRenameCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !editingCategory) return;
    const name = editingCategory.name.trim();
    if (!name) return toastError("نام دسته را بنویسید");
    setCategoryBusy(true);
    try {
      const saved = await updateCategory(token, editingCategory.id, { name });
      setCategories((list) => list?.map((c) => (c.id === saved.id ? saved : c)) ?? list);
      setEditingCategory(null);
    } catch {
      toastError("ذخیره دسته‌بندی انجام نشد");
    } finally {
      setCategoryBusy(false);
    }
  }

  /** Swap a category with its neighbour; orders are rewritten 0..n so older equal values sort out too. */
  async function moveCategory(index: number, delta: -1 | 1) {
    if (!token || !categories || categoryBusy) return;
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const target = index + delta;
    if (target < 0 || target >= sorted.length) return;
    [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
    const next = sorted.map((c, order) => ({ ...c, order }));
    const changed = next.filter((c) => categories.find((o) => o.id === c.id)?.order !== c.order);
    setCategories(next);
    setCategoryBusy(true);
    try {
      await Promise.all(changed.map((c) => updateCategory(token, c.id, { order: c.order })));
    } catch {
      toastError("تغییر ترتیب انجام نشد");
      reload();
    } finally {
      setCategoryBusy(false);
    }
  }

  async function handleDeleteCategory(category: { id: string; name: string }) {
    if (!token || !confirm(`دسته «${category.name}» حذف شود؟ خدمات آن بدون دسته می‌مانند و همچنان قابل رزرو هستند.`)) return;
    setCategoryBusy(true);
    try {
      await deleteCategory(token, category.id);
      if (filter === category.id) setFilter("all");
      setEditingCategory(null);
      reload();
    } catch {
      toastError("حذف دسته‌بندی انجام نشد");
    } finally {
      setCategoryBusy(false);
    }
  }

  if (!categories || !services) {
    return error ? <ErrorBanner onRetry={reload}>{error}</ErrorBanner> : <ListSkeleton />;
  }

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name;
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
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
              ...sortedCategories.map((c) => ({ value: c.id, label: c.name, count: services.filter((s) => s.categoryId === c.id).length })),
              ...(hasUncategorized ? [{ value: "none", label: "بدون دسته" }] : []),
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => setCategoriesOpen(true)}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-app-accent-soft px-3.5 text-sm font-bold text-app-accent active:scale-95"
        >
          <FolderCog className="h-[18px] w-[18px]" aria-hidden />
          دسته‌بندی‌ها
        </button>
      </div>

      {error && <ErrorBanner onRetry={reload}>{error}</ErrorBanner>}

      {visible.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="هنوز خدمتی اینجا نیست"
          hint="خدماتی که ارائه می‌دهید را با مدت و قیمت اضافه کنید تا مشتری‌ها بتوانند رزرو کنند."
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
        onClose={() => {
          setDraft(null);
          setInlineCategory(null);
        }}
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
            <Field label="دسته‌بندی (اختیاری)" hint="خدمت بدون دسته هم در صفحه رزرو نمایش داده می‌شود.">
              {inlineCategory === null ? (
                <div className="flex gap-2">
                  <PickerSelect
                    title="دسته‌بندی"
                    value={draft.categoryId}
                    onChange={(categoryId) => setDraft({ ...draft, categoryId })}
                    options={[{ value: "", label: "بدون دسته" }, ...sortedCategories.map((c) => ({ value: c.id, label: c.name }))]}
                    className="min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setInlineCategory("")}
                    className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-app-accent-soft px-3.5 text-sm font-bold text-app-accent active:scale-95"
                  >
                    <FolderPlus className="h-[18px] w-[18px]" aria-hidden />
                    دسته جدید
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <TextInput
                    autoFocus
                    value={inlineCategory}
                    onChange={(e) => setInlineCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleInlineCategory();
                      }
                    }}
                    placeholder="نام دسته، مثلاً ناخن"
                    maxLength={40}
                  />
                  <Button className="shrink-0 px-4" disabled={!inlineCategory.trim()} onClick={handleInlineCategory}>
                    افزودن
                  </Button>
                  <Button variant="ghost" className="shrink-0 px-3" onClick={() => setInlineCategory(null)} aria-label="انصراف">
                    انصراف
                  </Button>
                </div>
              )}
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
          </div>
        )}
      </Sheet>

      {/* Categories: add, rename (tap a row), reorder, delete */}
      <Sheet
        open={categoriesOpen}
        onClose={() => {
          setCategoriesOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? "ویرایش دسته" : "دسته‌بندی‌ها"}
      >
        {editingCategory ? (
          <form onSubmit={handleRenameCategory} className="flex flex-col gap-4">
            <button type="button" onClick={() => setEditingCategory(null)} className="flex items-center gap-1 self-start text-sm font-bold text-app-accent">
              <ArrowRight className="h-4 w-4" aria-hidden />
              همه دسته‌ها
            </button>
            <Field label="نام دسته">
              <TextInput
                autoFocus
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                maxLength={40}
              />
            </Field>
            <Button type="submit" block busy={categoryBusy}>
              ذخیره نام
            </Button>
            <Button
              variant="danger"
              block
              icon={Trash2}
              disabled={categoryBusy}
              onClick={() => handleDeleteCategory(editingCategory)}
            >
              حذف دسته
            </Button>
          </form>
        ) : (
          <>
            <p className="mb-3 text-xs leading-6 text-app-muted">
              دسته‌بندی اختیاری است و فقط خدمات را در صفحه رزرو گروه‌بندی می‌کند؛ خدمات بدون دسته زیر «سایر خدمات» نمایش داده می‌شوند.
            </p>
            <form onSubmit={handleAddCategory} className="mb-4 flex gap-2">
              <TextInput value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="نام دسته جدید، مثلاً ناخن" maxLength={40} />
              <Button type="submit" icon={Plus} className="shrink-0 px-4" disabled={!newCategoryName.trim()}>
                افزودن
              </Button>
            </form>
            {sortedCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-app-muted">هنوز دسته‌بندی ندارید.</p>
            ) : (
              <ListGroup>
                {sortedCategories.map((c, i) => (
                  <div key={c.id} className="flex h-14 items-center gap-1 pe-1 ps-4">
                    <button
                      type="button"
                      onClick={() => setEditingCategory({ id: c.id, name: c.name })}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start active:opacity-70"
                      aria-label={`ویرایش ${c.name}`}
                    >
                      <span className="truncate font-semibold text-app-ink">{c.name}</span>
                      <span className="shrink-0 text-xs font-medium text-app-muted">
                        {toPersianDigits(services.filter((s) => s.categoryId === c.id).length)} خدمت
                      </span>
                      <ChevronLeft className="ms-auto h-4 w-4 shrink-0 text-app-muted" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(i, -1)}
                      disabled={i === 0 || categoryBusy}
                      aria-label={`بردن ${c.name} به بالا`}
                      className="flex h-10 w-9 items-center justify-center rounded-full text-app-muted active:bg-app-card-2 disabled:opacity-25"
                    >
                      <ArrowUp className="h-[18px] w-[18px]" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveCategory(i, 1)}
                      disabled={i === sortedCategories.length - 1 || categoryBusy}
                      aria-label={`بردن ${c.name} به پایین`}
                      className="flex h-10 w-9 items-center justify-center rounded-full text-app-muted active:bg-app-card-2 disabled:opacity-25"
                    >
                      <ArrowDown className="h-[18px] w-[18px]" aria-hidden />
                    </button>
                  </div>
                ))}
              </ListGroup>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
