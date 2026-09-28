"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  GALLERY_LIMIT,
  addGalleryImage,
  deleteGalleryImage,
  listGallery,
  updateGalleryImage,
  type GalleryItem,
  type GalleryScope,
} from "@/lib/api/gallery";
import { persianApiError } from "@/lib/api/errorMessages";
import { releaseUploads, uploadImage } from "@/lib/uploadImage";
import { toPersianDigits } from "@/lib/persian";
import Sheet from "./Sheet";
import { Button, ErrorBanner, Field, TextInput, cx } from "./ui";
import PickerSelect from "./PickerSelect";

interface Pending {
  key: string;
  preview: string; // object URL shown while uploading
}

/**
 * Artwork gallery editor. scope="salon" (owner): the whole salon gallery, with the option to
 * credit each piece to a stylist. scope="stylist": the signed-in stylist's own portfolio.
 */
export default function GalleryManager({
  token,
  scope,
  stylists,
}: {
  token: string;
  scope: GalleryScope;
  /** Owner mode: the salon's stylists, for crediting pieces. */
  stylists?: { id: string; displayName: string }[];
}) {
  const limit = GALLERY_LIMIT[scope];
  const folder = scope === "salon" ? "salons" : "stylists";
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<GalleryItem | null>(null);
  const [caption, setCaption] = useState("");
  const [creditId, setCreditId] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const reload = useCallback(() => {
    listGallery(token, scope)
      .then((list) => {
        setError(null);
        setItems(list);
      })
      .catch(() => setError("دریافت نمونه کارها انجام نشد"));
  }, [token, scope]);

  useEffect(reload, [reload]);

  const count = (items?.length ?? 0) + pending.length;
  const room = Math.max(0, limit - count);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, room);
    e.target.value = "";
    if (files.length === 0) return;
    setError(null);
    const batch = files.map((file, i) => ({ file, key: `${Date.now()}-${i}`, preview: URL.createObjectURL(file) }));
    setPending((p) => [...batch.map(({ key, preview }) => ({ key, preview })), ...p]);

    let failed = 0;
    // One at a time: phones on mobile data shouldn't push several large uploads in parallel.
    for (const { file, key, preview } of batch) {
      let url: string | null = null;
      try {
        url = await uploadImage(file, folder);
        const item = await addGalleryImage(token, scope, { url });
        setItems((list) => (list ? [item, ...list] : [item]));
      } catch (err) {
        releaseUploads([url]); // uploaded but not saved (e.g. gallery full)
        failed++;
        if (failed === 1) setError(persianApiError(err, "آپلود برخی عکس‌ها انجام نشد"));
      } finally {
        setPending((p) => p.filter((x) => x.key !== key));
        URL.revokeObjectURL(preview);
      }
    }
  }

  function openItem(item: GalleryItem) {
    setSelected(item);
    setCaption(item.caption ?? "");
    setCreditId(item.stylistId ?? "");
    setConfirmDelete(false);
    setSheetError(null);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSheetError(null);
    try {
      const patch: { caption?: string | null; stylistId?: string | null } = { caption: caption.trim() || null };
      if (scope === "salon") patch.stylistId = creditId || null;
      const updated = await updateGalleryImage(token, selected.id, patch);
      setItems((list) => list?.map((x) => (x.id === updated.id ? updated : x)) ?? list);
      setSelected(null);
    } catch (err) {
      setSheetError(persianApiError(err, "ذخیره تغییرات انجام نشد"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setSheetError(null);
    try {
      await deleteGalleryImage(token, selected.id);
      releaseUploads([selected.url]);
      setItems((list) => list?.filter((x) => x.id !== selected.id) ?? list);
      setSelected(null);
    } catch (err) {
      setSheetError(persianApiError(err, "حذف عکس انجام نشد"));
    } finally {
      setDeleting(false);
    }
  }

  const dirty =
    selected !== null && ((caption.trim() || null) !== (selected.caption ?? null) || (scope === "salon" && (creditId || null) !== selected.stylistId));

  if (!items) {
    return error ? (
      <ErrorBanner onRetry={reload}>{error}</ErrorBanner>
    ) : (
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse rounded-2xl bg-app-card-2" />
        ))}
      </div>
    );
  }

  return (
    <>
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <div className="grid grid-cols-3 gap-2">
        {room > 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-app-accent/40 bg-app-accent-soft/60 text-app-accent active:scale-95"
          >
            <ImagePlus className="h-6 w-6" aria-hidden />
            <span className="text-xs font-bold">افزودن</span>
          </button>
        )}

        {pending.map((p) => (
          <div key={p.key} className="relative aspect-square overflow-hidden rounded-2xl bg-app-card-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="h-full w-full object-cover opacity-50" />
            <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-app-accent" aria-label="در حال آپلود" />
          </div>
        ))}

        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openItem(item)}
            className="relative aspect-square overflow-hidden rounded-2xl bg-app-card-2 active:scale-95"
            aria-label={item.caption ?? "نمونه کار"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={item.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
            {scope === "salon" && item.stylist && (
              <span className="absolute inset-x-1.5 bottom-1.5 truncate rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                {item.stylist.displayName}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-2 px-1 text-xs text-app-muted">
        {toPersianDigits(count)} از {toPersianDigits(limit)} عکس
        {room === 0 && " — برای افزودن، ابتدا چند عکس را حذف کنید"}
      </p>

      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFiles} tabIndex={-1} aria-hidden />

      <Sheet
        open={selected !== null}
        onClose={() => !saving && !deleting && setSelected(null)}
        title="نمونه کار"
        footer={
          dirty ? (
            <Button block busy={saving} disabled={deleting} onClick={handleSave}>
              ذخیره تغییرات
            </Button>
          ) : undefined
        }
      >
        {selected && (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-3xl bg-black/90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.url} alt={selected.caption ?? ""} className="mx-auto max-h-[45dvh] w-auto object-contain" />
            </div>
            <Field label="توضیح (اختیاری)">
              <TextInput value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} placeholder="مثلاً بالیاژ عسلی روی موی بلند" />
            </Field>
            {scope === "salon" && stylists && stylists.length > 0 && (
              <Field label="کار کدام آرایشگر است؟">
                <PickerSelect
                  title="کار کدام آرایشگر است؟"
                  value={creditId}
                  onChange={setCreditId}
                  options={[{ value: "", label: "کار سالن (بدون نام آرایشگر)" }, ...stylists.map((s) => ({ value: s.id, label: s.displayName }))]}
                />
              </Field>
            )}
            {sheetError && <p className="rounded-2xl bg-app-danger/10 px-4 py-3 text-sm font-medium text-app-danger">{sheetError}</p>}
            <Button variant="danger" block icon={Trash2} busy={deleting} disabled={saving} onClick={handleDelete} className={cx(confirmDelete && "ring-2 ring-app-danger/40")}>
              {confirmDelete ? "بله، این عکس حذف شود" : "حذف عکس"}
            </Button>
          </div>
        )}
      </Sheet>
    </>
  );
}
