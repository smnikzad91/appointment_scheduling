"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApiAccessToken } from "@/components/dashboard-shared/useApiAccessToken";
import {
  listMyCategories,
  createCategory,
  deleteCategory,
  listMyServices,
  createService,
  updateService,
  deleteService,
  type OwnerCategory,
  type OwnerService,
} from "@/lib/api/ownerSalon";
import { formatToman, toPersianDigits } from "@/lib/persian";

export default function SalonServicesPage() {
  const token = useApiAccessToken();
  const [categories, setCategories] = useState<OwnerCategory[] | null>(null);
  const [services, setServices] = useState<OwnerService[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newService, setNewService] = useState({ name: "", categoryId: "", durationMinutes: "", priceToman: "" });

  function reload() {
    if (!token) return;
    Promise.all([listMyCategories(token), listMyServices(token)])
      .then(([c, s]) => {
        setCategories(c);
        setServices(s);
      })
      .catch(() => setError("خطا در دریافت اطلاعات"));
  }

  useEffect(reload, [token]);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newCategoryName.trim()) return;
    await createCategory(token, { name: newCategoryName.trim(), order: categories?.length ?? 0 });
    setNewCategoryName("");
    reload();
  }

  async function handleDeleteCategory(id: string) {
    if (!token) return;
    await deleteCategory(token, id);
    reload();
  }

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const duration = Number(newService.durationMinutes);
    const price = Number(newService.priceToman);
    if (!newService.name.trim() || !duration || !price) {
      setError("لطفاً همه فیلدهای خدمت را کامل کنید");
      return;
    }
    await createService(token, {
      name: newService.name.trim(),
      categoryId: newService.categoryId || undefined,
      durationMinutes: duration,
      priceToman: price,
    });
    setNewService({ name: "", categoryId: "", durationMinutes: "", priceToman: "" });
    setError(null);
    reload();
  }

  async function handleToggleActive(service: OwnerService) {
    if (!token) return;
    await updateService(token, service.id, { active: !service.active });
    reload();
  }

  async function handleDeleteService(id: string) {
    if (!token) return;
    await deleteService(token, id);
    reload();
  }

  if (!categories || !services) return <p className="text-sm text-gray-500">در حال بارگذاری...</p>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-1 text-xl font-bold text-gray-900 dark:text-white">خدمات</h1>
        <p className="text-sm text-gray-500">دسته‌بندی‌ها و خدمات سالن خود را مدیریت کنید.</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">دسته‌بندی‌ها</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {c.name}
              <button type="button" onClick={() => handleDeleteCategory(c.id)} aria-label={`حذف ${c.name}`}>
                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-rose-500" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <form onSubmit={handleAddCategory} className="mt-3 flex max-w-sm gap-2">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="نام دسته جدید"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button type="submit" className="rounded-lg bg-gray-900 px-3 py-2 text-white dark:bg-gray-100 dark:text-gray-900">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-300">خدمات</h2>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2 text-start font-medium">نام</th>
                <th className="px-4 py-2 text-start font-medium">مدت</th>
                <th className="px-4 py-2 text-start font-medium">قیمت</th>
                <th className="px-4 py-2 text-start font-medium">فعال</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5">{toPersianDigits(s.durationMinutes)} دقیقه</td>
                  <td className="px-4 py-2.5">{formatToman(s.priceToman)}</td>
                  <td className="px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(s)}
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        s.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.active ? "فعال" : "غیرفعال"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-end">
                    <button type="button" onClick={() => handleDeleteService(s.id)} aria-label="حذف خدمت">
                      <Trash2 className="h-4 w-4 text-gray-400 hover:text-rose-500" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    هنوز خدمتی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleAddService} className="mt-4 grid max-w-2xl gap-3 sm:grid-cols-5">
          <input
            value={newService.name}
            onChange={(e) => setNewService((f) => ({ ...f, name: e.target.value }))}
            placeholder="نام خدمت"
            className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <select
            value={newService.categoryId}
            onChange={(e) => setNewService((f) => ({ ...f, categoryId: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">بدون دسته</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={newService.durationMinutes}
            onChange={(e) => setNewService((f) => ({ ...f, durationMinutes: e.target.value }))}
            placeholder="مدت (دقیقه)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <input
            type="number"
            value={newService.priceToman}
            onChange={(e) => setNewService((f) => ({ ...f, priceToman: e.target.value }))}
            placeholder="قیمت (تومان)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="submit"
            className="col-span-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 sm:col-span-1"
          >
            افزودن خدمت
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
      </section>
    </div>
  );
}
