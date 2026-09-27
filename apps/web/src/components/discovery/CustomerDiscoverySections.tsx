"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Heart, Search, Trash2 } from "lucide-react";
import { leaveWaitlist, listFavorites, listMyWaitlist, type SalonCard, type WaitlistEntry } from "@/lib/api/discovery";
import { useFavoriteIds } from "@/lib/favorites";
import { toPersianDigits } from "@/lib/persian";
import { formatJalaliFull, dateKeyToDate } from "@/lib/jalali";
import { SectionTitle, cx } from "@/components/app/ui";
import SalonResultCard from "./SalonResultCard";

/** Customer home: saved salons (hearts) and days they're waiting on. */
export default function CustomerDiscoverySections({ token }: { token: string | null }) {
  const [favorites, setFavorites] = useState<SalonCard[] | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[] | null>(null);
  const { ids, ready } = useFavoriteIds(token);

  useEffect(() => {
    if (!token) return;
    listFavorites(token).then(setFavorites).catch(() => setFavorites([]));
    listMyWaitlist(token).then(setWaitlist).catch(() => setWaitlist([]));
  }, [token]);

  // Un-hearting a card here hides it right away (the shared store already knows).
  const shownFavorites = favorites?.filter((f) => !ready || ids.has(f.id)) ?? null;

  async function remove(entry: WaitlistEntry) {
    if (!token) return;
    setWaitlist((w) => w?.filter((x) => x.id !== entry.id) ?? w);
    await leaveWaitlist(token, entry.id).catch(() => setWaitlist((w) => (w ? [...w, entry] : w)));
  }

  return (
    <>
      {waitlist && waitlist.length > 0 && (
        <>
          <SectionTitle>در انتظار وقت خالی</SectionTitle>
          <div className="flex flex-col gap-2">
            {waitlist.map((w) => (
              <div key={w.id} className="flex items-center gap-3 rounded-3xl border border-app-line bg-app-card p-3.5 shadow-app">
                <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", w.notifiedAt ? "bg-app-done/12 text-app-done" : "bg-app-card-2 text-app-muted")}>
                  <BellRing className="h-5 w-5" aria-hidden />
                </span>
                <Link href={`/s/${w.salon.slug}`} className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-app-ink">{w.salon.name}</span>
                  <span className="block truncate text-xs text-app-muted">
                    {formatJalaliFull(dateKeyToDate(w.dateKey))}
                    {w.stylist ? ` — با ${w.stylist.displayName}` : ""}
                  </span>
                  {w.notifiedAt && <span className="text-xs font-bold text-app-done">وقت خالی شد — زودتر رزرو کنید</span>}
                </Link>
                <button type="button" onClick={() => remove(w)} aria-label="لغو انتظار" className="rounded-full p-2 text-app-muted active:bg-app-card-2">
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionTitle
        action={
          <Link href="/dashboard/discover" className="text-[13px] font-bold text-app-accent">
            کشف سالن
          </Link>
        }
      >
        سالن‌های محبوب من{shownFavorites && shownFavorites.length > 0 ? ` (${toPersianDigits(shownFavorites.length)})` : ""}
      </SectionTitle>
      {shownFavorites === null ? (
        <div className="h-28 animate-pulse rounded-3xl bg-app-card-2" />
      ) : shownFavorites.length === 0 ? (
        <Link href="/dashboard/discover" className="flex items-center gap-3 rounded-3xl border border-dashed border-app-line p-4 active:bg-app-card-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent-soft text-app-accent">
            <Heart className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block font-bold text-app-ink">هنوز سالنی ذخیره نکرده‌اید</span>
            <span className="block text-xs leading-5 text-app-muted">سالن‌ها را جستجو کنید و با قلب ذخیره کنید تا دفعه بعد سریع پیدایشان کنید.</span>
          </span>
          <Search className="h-5 w-5 text-app-muted" aria-hidden />
        </Link>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shownFavorites.map((s) => (
            <SalonResultCard key={s.id} salon={s} />
          ))}
        </div>
      )}
    </>
  );
}
