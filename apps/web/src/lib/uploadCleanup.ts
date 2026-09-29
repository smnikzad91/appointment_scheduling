import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";
import { prisma } from "@/lib/prisma";

// Salon/stylist/banner photos live on disk under public/uploads/<folder>/ while the DB (written by
// apps/api) only stores their URL. A file is deleted only once no row points at it any more, so
// a stale or duplicate cleanup request can never break a photo that's still in use.

const MANAGED_FOLDERS = ["salons", "stylists", "banners", "expenses"] as const;
const MANAGED_URL = /^\/uploads\/(salons|stylists|banners|expenses)\/([\w-]+\.(?:jpe?g|png|webp|gif))$/i;

function uploadsDir(folder: string) {
  return join(process.cwd(), "public", "uploads", folder);
}

/** URLs from the given list that some salon, stylist, gallery piece, user, the home banner or an expense receipt still uses. */
async function referencedUrls(urls: string[]): Promise<Set<string>> {
  if (urls.length === 0) return new Set();
  const [salons, stylists, gallery, users, banners, receipts] = await Promise.all([
    prisma.salon.findMany({
      where: { OR: [{ logoUrl: { in: urls } }, { coverImageUrl: { in: urls } }] },
      select: { logoUrl: true, coverImageUrl: true },
    }),
    prisma.stylist.findMany({
      where: { OR: [{ avatarUrl: { in: urls } }, { coverImageUrl: { in: urls } }] },
      select: { avatarUrl: true, coverImageUrl: true },
    }),
    prisma.galleryImage.findMany({ where: { url: { in: urls } }, select: { url: true } }),
    prisma.user.findMany({ where: { avatarUrl: { in: urls } }, select: { avatarUrl: true } }),
    prisma.homeBanner.findMany({ where: { imageUrl: { in: urls } }, select: { imageUrl: true } }),
    prisma.stylistExpense.findMany({ where: { receiptUrl: { in: urls } }, select: { receiptUrl: true } }),
  ]);
  return new Set(
    [
      ...salons.flatMap((s) => [s.logoUrl, s.coverImageUrl]),
      ...stylists.flatMap((s) => [s.avatarUrl, s.coverImageUrl]),
      ...gallery.map((g) => g.url),
      ...users.map((u) => u.avatarUrl),
      ...banners.map((b) => b.imageUrl),
      ...receipts.map((r) => r.receiptUrl),
    ].filter((u): u is string => !!u),
  );
}

async function removeFile(folder: string, name: string): Promise<boolean> {
  try {
    await unlink(join(uploadsDir(folder), name));
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

/**
 * Deletes the files behind `urls` that nothing references. Anything that isn't a salon/stylist
 * upload URL is ignored. Returns how many files were removed.
 */
export async function deleteUnreferencedUploads(urls: string[]): Promise<number> {
  const candidates = [...new Set(urls)].filter((u) => MANAGED_URL.test(u));
  const inUse = await referencedUrls(candidates);
  let deleted = 0;
  for (const url of candidates) {
    if (inUse.has(url)) continue;
    const [, folder, name] = url.match(MANAGED_URL)!;
    if (await removeFile(folder, name)) deleted++;
  }
  return deleted;
}

/**
 * Sweeps files nobody references and that are older than `minAgeMs` — uploads whose save failed
 * or was abandoned, and photos whose rows were removed by a cascade. The age guard keeps a
 * just-uploaded photo safe while the user is still saving it.
 */
export async function pruneOrphanedUploads(minAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const cutoff = Date.now() - minAgeMs;
  let deleted = 0;
  for (const folder of MANAGED_FOLDERS) {
    let names: string[];
    try {
      names = await readdir(uploadsDir(folder));
    } catch {
      continue; // folder not created yet
    }
    const old: string[] = [];
    for (const name of names) {
      const url = `/uploads/${folder}/${name}`;
      if (!MANAGED_URL.test(url)) continue;
      const info = await stat(join(uploadsDir(folder), name)).catch(() => null);
      if (info?.isFile() && info.mtimeMs < cutoff) old.push(url);
    }
    // Chunked so the IN (...) lists stay reasonable on a large folder.
    for (let i = 0; i < old.length; i += 200) {
      deleted += await deleteUnreferencedUploads(old.slice(i, i + 200));
    }
  }
  return deleted;
}
