import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { rename, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Prisma } from "@appointment-scheduling/database";
import { prisma } from "@/lib/prisma";
import { readApkInfo, ApkError } from "./apk";

// Android releases (one app for every role): uploaded at /admin/app-releases, kept in APK_DIR
// (outside the repo, never under public/), downloadable and announced in /app-version.json only
// once published. The upload is streamed to disk while hashed — the server is short on RAM.

export const APP_PACKAGE = "app.nobatet";
export const MAX_APK_BYTES = 150 * 1024 * 1024;

export class ReleaseError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export function apkDir(): string {
  const dir = process.env.APK_DIR?.trim();
  if (!dir) throw new ReleaseError("APK_DIR تنظیم نشده است؛ پوشه نگهداری فایل‌های اپ را در .env سرور مشخص کنید", 500);
  return resolve(dir);
}

export const releaseFileName = (versionCode: number) => `nobatet-${versionCode}.apk`;

/** The signing certificates allowed (ANDROID_CERT_SHA256, comma-separated — same as assetlinks.json). */
export function allowedCerts(): string[] {
  return (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((f) => f.trim().toUpperCase()).filter(Boolean);
}

/** Streams an upload to a temp file in APK_DIR, hashing as it goes; deletes it if it's too big. */
async function streamToTemp(body: ReadableStream<Uint8Array>): Promise<{ path: string; sha256: string; size: number }> {
  const path = join(apkDir(), `.upload-${randomBytes(8).toString("hex")}.tmp`);
  const out = createWriteStream(path, { flags: "wx" });
  const hash = createHash("sha256");
  let size = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_APK_BYTES) throw new ReleaseError("حجم فایل بیشتر از ۱۵۰ مگابایت است", 413);
      hash.update(value);
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
    await new Promise<void>((res, rej) => out.end((err?: Error | null) => (err ? rej(err) : res())));
    return { path, sha256: hash.digest("hex"), size };
  } catch (err) {
    reader.cancel().catch(() => {});
    out.destroy();
    await rm(path, { force: true });
    throw err;
  }
}

export interface UploadResult {
  release: Awaited<ReturnType<typeof prisma.appRelease.create>>;
  /** the signature couldn't be compared (no ANDROID_CERT_SHA256 set, or no v2/v3 signature) */
  signatureWarning: string | null;
}

/** Receives an APK, checks it, keeps it as nobatet-<versionCode>.apk and records it unpublished. */
export async function uploadRelease(body: ReadableStream<Uint8Array>, createdById: string): Promise<UploadResult> {
  const tmp = await streamToTemp(body);
  try {
    let info;
    try {
      info = await readApkInfo(tmp.path);
    } catch (err) {
      if (err instanceof ApkError) throw new ReleaseError("این فایل یک اپ اندروید معتبر (APK) نیست");
      throw err;
    }
    if (info.packageName !== APP_PACKAGE) throw new ReleaseError(`این فایل اپ نوبتت نیست (بسته ${info.packageName})`);
    if (await prisma.appRelease.findUnique({ where: { versionCode: info.versionCode }, select: { id: true } })) {
      throw new ReleaseError(`نسخه ${info.versionCode} قبلاً بارگذاری شده است`, 409);
    }
    const latest = await latestPublished();
    if (latest && info.versionCode <= latest.versionCode) {
      throw new ReleaseError(`شماره نسخه (${info.versionCode}) باید از آخرین نسخه منتشرشده (${latest.versionCode}) بیشتر باشد`);
    }
    const certs = allowedCerts();
    let signatureWarning: string | null = null;
    if (!info.certSha256) {
      signatureWarning = "امضای v2/v3 در فایل پیدا نشد؛ امضای فایل بررسی نشد";
    } else if (certs.length === 0) {
      signatureWarning = `ANDROID_CERT_SHA256 روی سرور تنظیم نشده؛ امضای فایل با نسخه‌های قبلی مقایسه نشد (امضای این فایل: ${info.certSha256})`;
    } else if (!certs.includes(info.certSha256)) {
      throw new ReleaseError("امضای فایل با نسخه منتشرشده یکی نیست؛ نصب روی گوشی کاربران انجام نمی‌شود");
    }

    const fileName = releaseFileName(info.versionCode);
    let release;
    try {
      release = await prisma.appRelease.create({
        data: { versionCode: info.versionCode, versionName: info.versionName, fileName, sha256: tmp.sha256, size: tmp.size, certSha256: info.certSha256, createdById },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw new ReleaseError(`نسخه ${info.versionCode} قبلاً بارگذاری شده است`, 409);
      throw err;
    }
    try {
      await rename(tmp.path, join(apkDir(), fileName));
    } catch (err) {
      await prisma.appRelease.delete({ where: { id: release.id } }).catch(() => {});
      throw err;
    }
    return { release, signatureWarning };
  } finally {
    await rm(tmp.path, { force: true }); // no-op once renamed
  }
}

export function latestPublished() {
  return prisma.appRelease.findFirst({ where: { published: true }, orderBy: { versionCode: "desc" } });
}

async function fileSha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer);
  return hash.digest("hex");
}

/** Publish requires the file to still be there, unchanged. */
export async function publishRelease(id: string) {
  const r = await prisma.appRelease.findUnique({ where: { id } });
  if (!r) throw new ReleaseError("نسخه پیدا نشد", 404);
  const path = join(apkDir(), r.fileName);
  try {
    await stat(path);
  } catch {
    throw new ReleaseError("فایل این نسخه روی سرور پیدا نشد", 409);
  }
  if ((await fileSha256(path)) !== r.sha256) throw new ReleaseError("فایل این نسخه تغییر کرده است (SHA-256 یکی نیست)؛ دوباره بارگذاری کنید", 409);
  return prisma.appRelease.update({ where: { id }, data: { published: true, publishedAt: new Date() } });
}

/** Only an unpublished release can be deleted: the row and its file. */
export async function deleteRelease(id: string) {
  const r = await prisma.appRelease.findUnique({ where: { id } });
  if (!r) throw new ReleaseError("نسخه پیدا نشد", 404);
  if (r.published) throw new ReleaseError("نسخه منتشرشده حذف نمی‌شود؛ اول آن را از انتشار خارج کنید", 409);
  await prisma.appRelease.delete({ where: { id } });
  await rm(join(apkDir(), r.fileName), { force: true });
}

// Same shape the app already parses; with no published release, the old static values (no dialog).
export const DEFAULT_VERSION_INFO = {
  latestVersionCode: 1,
  latestVersionName: "0.1.0",
  minVersionCode: 1,
  downloadUrl: "https://nobatet.app/",
  notes: "نسخه اول اپ نوبتت",
};

export async function versionInfo(siteUrl: string) {
  const [latest, mandatory] = await Promise.all([
    latestPublished(),
    prisma.appRelease.findFirst({ where: { published: true, mandatory: true }, orderBy: { versionCode: "desc" }, select: { versionCode: true } }),
  ]);
  if (!latest) return DEFAULT_VERSION_INFO;
  return {
    latestVersionCode: latest.versionCode,
    latestVersionName: latest.versionName,
    minVersionCode: mandatory?.versionCode ?? 1,
    downloadUrl: `${siteUrl.replace(/\/$/, "")}/download/${latest.fileName}`,
    apkSha256: latest.sha256,
    apkSize: latest.size,
    notes: latest.notes,
  };
}

export async function storeLinks() {
  return (
    (await prisma.appStoreLinks.findUnique({ where: { id: "singleton" } })) ?? {
      id: "singleton",
      bazaarUrl: null,
      bazaarComingSoon: true,
      myketUrl: null,
      myketComingSoon: true,
      updatedAt: new Date(0),
    }
  );
}
