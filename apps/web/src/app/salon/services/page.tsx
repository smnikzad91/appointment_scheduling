"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, FolderCog, Plus, Scissors, Trash2 } from "lucide-react";
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
  Select,
  TextInput,
  Toggle,
  cx,
  riseStyle,
} from "@/components/app/ui";

interface ServiceDraft {
  id: string | null; // null = new service
  name: string;
  categoryId: string;
  durationMinutes: string;
  priceToman: string;
}

const EMPTY_DRAFT: ServiceDraft = { id: null, name: "", categoryId: "", durationMinutes: "", priceToman: "" };

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

  const reload = useCallback(() => {
    if (!token) return;
    Promise.all([listMyCategories(token), listMyServices(token)])
      .then(([c, s]) => {
        setCategories(c);
        setServices(s);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }, [token]);

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
    setSaving(true);
    setDraftError(null);
    try {
      if (draft.id) {
        await updateService(token, draft.id, {
          name: draft.name.trim(),
          categoryId: draft.categoryId || null,
          durationMinutes: duration,
          priceToman: price,
        });
      } else {
        await createService(token, {
          name: draft.name.trim(),
          categoryId: draft.categoryId || undefined,
          durationMinutes: duration,
          priceToman: price,
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
    if (!token) return;
    setError(null);
    // Optimistic — the switch should feel instant.
    setServices((list) => list?.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s)) ?? list);
    try {
      await updateService(token, service.id, { active: !service.active });
    } catch {
      setError("تغییر وضعیت خدمت انجام نشد");
      reload();
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
                  <span aria-hidden>·</span>
                  <span className="font-semibold text-app-ink/80">{formatToman(service.priceToman)}</span>
                </p>
                {filter === "all" && categoryName(service.categoryId) && (
                  <span className="mt-2 inline-block rounded-full bg-app-card-2 px-2.5 py-0.5 text-[11px] font-semibold text-app-muted">
                    {categoryName(service.categoryId)}
                  </span>
                )}
              </button>
              <Toggle checked={service.active} onChange={() => handleToggleActive(service)} label={`فعال بودن ${service.name}`} />
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
              <Select value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })}>
                <option value="">بدون دسته</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
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
