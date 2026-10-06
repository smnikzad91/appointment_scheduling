import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readApkInfo, ApkError } from "./apk.ts";

// A real, signed Android APK on this server (devtrader's app) when available: checks the zip,
// binary manifest and v2/v3 signing-block readers against known values (the fingerprint was
// confirmed with `openssl x509 -fingerprint -sha256`).
const REAL = "/root/projects/tradebot/storage/apks/1789810450285-851635335.apk";

test("reads package, version and signing certificate from a real APK", { skip: !existsSync(REAL) }, async () => {
  const info = await readApkInfo(REAL);
  assert.equal(info.packageName, "ir.devtrader.investor");
  assert.equal(info.versionCode, 14);
  assert.equal(info.versionName, "1.13");
  assert.equal(info.certSha256, "32:D5:E3:12:03:01:32:E6:CF:24:E7:0E:7E:C1:71:D3:09:CA:FA:74:02:2D:03:07:84:C0:A2:23:DE:46:73:7F");
});

test("rejects files that aren't APKs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "apk-"));
  const notZip = join(dir, "a.apk");
  writeFileSync(notZip, "hello, not a zip");
  await assert.rejects(readApkInfo(notZip), ApkError);
  // a zip without AndroidManifest.xml: minimal empty zip (just the end-of-directory record) behind a local-header magic
  const emptyZip = join(dir, "b.apk");
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  writeFileSync(emptyZip, Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), eocd]));
  await assert.rejects(readApkInfo(emptyZip), ApkError);
});

test("reads the generated test APK (the upload tests' fixture)", async () => {
  const { makeTestApk } = await import("./testApk.ts");
  const dir = mkdtempSync(join(tmpdir(), "apk-"));
  const file = join(dir, "t.apk");
  writeFileSync(file, makeTestApk("app.nobatet", 42, "0.2.0"));
  assert.deepEqual(await readApkInfo(file), { packageName: "app.nobatet", versionCode: 42, versionName: "0.2.0", certSha256: null });
});
