"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { releaseUploads, uploadImage } from "@/lib/uploadImage";
import Sheet from "./Sheet";
import { Avatar, Button, Card, cx } from "./ui";
import { toastError } from "@/lib/toastError";

type Kind = "cover" | "avatar";

export interface PhotoPatch {
  coverImageUrl?: string | null;
  avatarUrl?: string | null;
}

/**
 * Cover banner + overlapping avatar/logo, each tappable to change or remove through an action
 * sheet. Used for the salon (logo) and stylists (profile photo). Uploads go through
 * uploadImage (compressed on the phone); the caller persists the result with `onSave`.
 */
export default function ProfilePhotos({
  name,
  coverUrl,
  avatarUrl,
  avatarLabel,
  avatarShape = "circle",
  folder,
  onSave,
  hint = "برای افزودن، تغییر یا حذف، روی عکس‌ها بزنید",
}: {
  name: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  /** e.g. "لوگو" or "عکس پروفایل" */
  avatarLabel: string;
  avatarShape?: "circle" | "square";
  folder: "salons" | "stylists";
  onSave: (patch: PhotoPatch) => Promise<void>;
  hint?: string;
}) {
  const [open, setOpen] = useState<Kind | null>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const current = open === "cover" ? coverUrl : avatarUrl;
  const label = open === "cover" ? "عکس کاور" : avatarLabel;
  const field = open === "cover" ? "coverImageUrl" : "avatarUrl";

  function show(kind: Kind) {
    setConfirmDelete(false);
    setOpen(kind);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !open) return;
    setBusy("upload");
    const previous = current;
    let url: string | null = null;
    try {
      url = await uploadImage(file, folder);
      await onSave({ [field]: url });
      releaseUploads([previous]);
      setOpen(null);
    } catch {
      releaseUploads([url]); // uploaded but not saved
      toastError("آپلود عکس انجام نشد، دوباره تلاش کنید");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy("delete");
    const previous = current;
    try {
      await onSave({ [field]: null });
      releaseUploads([previous]);
      setOpen(null);
    } catch {
      toastError("حذف عکس انجام نشد، دوباره تلاش کنید");
    } finally {
      setBusy(null);
    }
  }

  const avatarRadius = avatarShape === "square" ? "rounded-[22px]" : "rounded-full";

  return (
    <>
      <Card className="overflow-hidden p-0">
        <button type="button" onClick={() => show("cover")} className="relative block h-36 w-full bg-app-card-2 active:opacity-90" aria-label="عکس کاور">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center gap-2 text-sm font-semibold text-app-muted">
              <ImagePlus className="h-5 w-5" aria-hidden />
              افزودن عکس کاور
            </span>
          )}
          <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
            <Camera className="h-3.5 w-3.5" aria-hidden />
            کاور
          </span>
        </button>
        <div className="flex items-end gap-3 px-4 pb-4">
          <button type="button" onClick={() => show("avatar")} aria-label={avatarLabel} className="relative -mt-9 shrink-0 active:scale-95">
            <span className={cx("block border-4 border-app-card", avatarRadius)}>
              <Avatar name={name} src={avatarUrl} size={72} shape={avatarShape} />
            </span>
            <span className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-app-card bg-app-accent text-app-accent-ink">
              <Camera className="h-4 w-4" aria-hidden />
            </span>
          </button>
          <div className="min-w-0 pb-1">
            <p className="truncate font-black text-app-ink">{name}</p>
            <p className="text-xs text-app-muted">{hint}</p>
          </div>
        </div>
      </Card>

      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={handleFile} tabIndex={-1} aria-hidden />

      <Sheet open={open !== null} onClose={() => busy === null && setOpen(null)} title={label}>
        <div className="mb-5 flex justify-center">
          {open === "cover" ? (
            <div className="h-40 w-full overflow-hidden rounded-3xl bg-app-card-2">
              {current ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current} alt={label} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full items-center justify-center text-sm text-app-muted">هنوز عکس کاوری ندارید</span>
              )}
            </div>
          ) : (
            <Avatar name={name} src={current} size={128} shape={avatarShape} />
          )}
        </div>


        <div className="flex flex-col gap-2.5">
          <Button block icon={ImagePlus} busy={busy === "upload"} disabled={busy !== null} onClick={() => fileRef.current?.click()}>
            {current ? "انتخاب عکس جدید" : "افزودن عکس"}
          </Button>
          {current && (
            <Button block variant="danger" icon={Trash2} busy={busy === "delete"} disabled={busy !== null} onClick={handleDelete}>
              {confirmDelete ? "بله، حذف شود" : "حذف عکس"}
            </Button>
          )}
        </div>
        {open === "cover" && (
          <p className="mt-3 text-center text-xs leading-6 text-app-muted">بهترین نتیجه با عکس افقی؛ بالای صفحه نمایش داده می‌شود.</p>
        )}
      </Sheet>
    </>
  );
}
