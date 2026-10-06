import { notFound, redirect } from "next/navigation";
import { salonApiFetch } from "@/lib/api/salonApiClient";

/**
 * Short booking links from the share kit: nobatet.app/book/@<handle> (the @ is optional). A salon's
 * handle — or its slug, until it picks one — opens its page with the booking sheet; a stylist's
 * opens it with that stylist chosen. Resolved by apps/api `GET /book/:handle`.
 */
export const dynamic = "force-dynamic";

export default async function BookByHandlePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let raw = handle;
  try {
    raw = decodeURIComponent(handle);
  } catch {
    notFound();
  }
  const clean = raw.trim().replace(/^@+/, "").toLowerCase();
  if (!/^[a-z0-9._-]{1,60}$/.test(clean)) notFound();

  let target: { slug: string; stylistId: string | null } | null = null;
  try {
    target = await salonApiFetch<{ slug: string; stylistId: string | null }>(`/book/${encodeURIComponent(clean)}`, { cache: "no-store" });
  } catch {
    target = null;
  }
  if (!target) notFound();
  redirect(`/s/${encodeURIComponent(target.slug)}?book=1${target.stylistId ? `&stylist=${encodeURIComponent(target.stylistId)}` : ""}`);
}
