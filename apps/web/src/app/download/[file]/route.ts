import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { join, resolve } from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { recordVisit } from "@/lib/analytics/record";

// The Android app's APKs (the `direct` build; the store builds update through Bazaar/Myket) for the
// in-app updater and anyone downloading from the site. They live outside the repo in APK_DIR
// (e.g. /var/lib/nobatet/apk), copied there by scripts/publish-apk.sh and listed in
// public/app-version.json (downloadUrl + apkSha256) — see apps/android/RELEASING.md.
// Range requests let Android's DownloadManager resume an interrupted download.

const NAME = /^nobatet-\d+\.apk$/;
const APK_TYPE = "application/vnd.android.package-archive";

function notFound() {
  return new NextResponse(null, { status: 404 });
}

/** Single byte range from a `Range` header → [start, end] inclusive; null = serve the whole file; "bad" = 416. */
function parseRange(header: string | null, size: number): [number, number] | null | "bad" {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null; // multiple ranges / other units: ignoring Range is allowed — send it all
  const [, a, b] = m;
  if (a === "" && b === "") return "bad";
  let start: number;
  let end: number;
  if (a === "") {
    // suffix: the last b bytes
    const n = Number(b);
    if (n === 0) return "bad";
    start = Math.max(0, size - n);
    end = size - 1;
  } else {
    start = Number(a);
    end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  }
  if (start >= size || start > end) return "bad";
  return [start, end];
}

async function serve(req: Request, ctx: RouteContext<"/download/[file]">, head: boolean) {
  const { file } = await ctx.params;
  const dir = process.env.APK_DIR;
  // Only nobatet-<versionCode>.apk: no "../", no other files from the folder.
  if (!dir || !NAME.test(file)) return notFound();
  const path = join(resolve(dir), file);
  let size: number;
  let mtime: number;
  try {
    const s = await stat(path);
    if (!s.isFile()) return notFound();
    size = s.size;
    mtime = s.mtimeMs;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return notFound();
    throw err;
  }

  const etag = `"${size.toString(16)}-${Math.floor(mtime).toString(16)}"`;
  const headers: Record<string, string> = {
    "Content-Type": APK_TYPE,
    "Accept-Ranges": "bytes",
    ETag: etag,
    "Last-Modified": new Date(mtime).toUTCString(),
    // A published file is never replaced (each build has its own name), but keep CDN copies short-lived anyway.
    "Cache-Control": "public, max-age=3600",
    "Content-Disposition": `attachment; filename="${file}"`,
  };

  // A resumed download whose file changed since (If-Match from DownloadManager) must start over.
  const ifMatch = req.headers.get("if-match");
  if (ifMatch && ifMatch !== "*" && !ifMatch.split(",").some((t) => t.trim() === etag)) {
    return new NextResponse(null, { status: 412, headers: { ETag: etag } });
  }
  const ifRange = req.headers.get("if-range");
  let range = parseRange(req.headers.get("range"), size);
  if (range && ifRange && ifRange !== etag) range = null; // changed: send the whole file
  if (range === "bad") {
    return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" } });
  }

  const [start, end] = range ?? [0, size - 1];
  const length = size === 0 ? 0 : end - start + 1;
  headers["Content-Length"] = String(length);
  if (range) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  const status = range ? 206 : 200;
  if (head || length === 0) return new NextResponse(null, { status, headers });

  // Analytics: a new download (not a resumed range) — the app's updater downloads through Android's
  // DownloadManager, anyone else from the website. Not awaited.
  if (start === 0) {
    const ua = req.headers.get("user-agent") ?? "";
    const fromApp = /AndroidDownloadManager|Dalvik/i.test(ua);
    void recordVisit({ kind: "DOWNLOAD", path: `/download/${file}`, referrerType: fromApp ? "app" : "website", headers: req.headers });
  }

  const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>;
  return new NextResponse(body, { status, headers });
}

export function GET(req: Request, ctx: RouteContext<"/download/[file]">) {
  return serve(req, ctx, false);
}

export function HEAD(req: Request, ctx: RouteContext<"/download/[file]">) {
  return serve(req, ctx, true);
}
