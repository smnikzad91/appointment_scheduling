// Reads what an uploaded APK says about itself, from the file on disk, without loading it into
// memory and without the Android SDK: the binary AndroidManifest.xml (package, versionCode,
// versionName) and the APK Signature Scheme v2/v3 block (the signing certificate's SHA-256).
// No imports beyond node:, so node --test runs apk.test.ts directly.

import { open, type FileHandle } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export interface ApkInfo {
  packageName: string;
  versionCode: number;
  versionName: string;
  /** SHA-256 of the v2/v3 signing certificate, "AB:CD:…" (keytool / assetlinks format); null if only v1-signed or unsigned */
  certSha256: string | null;
}

export class ApkError extends Error {}

const EOCD_SIG = 0x06054b50;
const CD_SIG = 0x02014b50;
const LOCAL_SIG = 0x04034b50;
const SIG_BLOCK_MAGIC = "APK Sig Block 42";
const SIGNER_IDS = [0x7109871a, 0xf05368c0, 0x1b93ad61]; // v2, v3, v3.1
const MAX_MANIFEST = 4 * 1024 * 1024;

async function readAt(fh: FileHandle, position: number, length: number): Promise<Buffer> {
  const buf = Buffer.alloc(length);
  const { bytesRead } = await fh.read(buf, 0, length, position);
  return buf.subarray(0, bytesRead);
}

export async function readApkInfo(path: string): Promise<ApkInfo> {
  const fh = await open(path, "r");
  try {
    const { size } = await fh.stat();
    const head = await readAt(fh, 0, 4);
    if (head.length < 4 || head.readUInt32LE(0) !== LOCAL_SIG) throw new ApkError("not a zip");

    // End of central directory: in the last 22 + 65535 bytes
    const tailLen = Math.min(size, 22 + 65535);
    const tail = await readAt(fh, size - tailLen, tailLen);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
    if (eocd < 0) throw new ApkError("no zip directory");
    const cdSize = tail.readUInt32LE(eocd + 12);
    const cdOffset = tail.readUInt32LE(eocd + 16);
    if (cdOffset + cdSize > size) throw new ApkError("broken zip directory");

    // Central directory → the manifest's local header
    const cd = await readAt(fh, cdOffset, cdSize);
    let manifest: { method: number; compSize: number; size: number; localOffset: number } | null = null;
    for (let p = 0; p + 46 <= cd.length && cd.readUInt32LE(p) === CD_SIG; ) {
      const method = cd.readUInt16LE(p + 10);
      const compSize = cd.readUInt32LE(p + 20);
      const uncompSize = cd.readUInt32LE(p + 24);
      const nameLen = cd.readUInt16LE(p + 28);
      const extraLen = cd.readUInt16LE(p + 30);
      const commentLen = cd.readUInt16LE(p + 32);
      const localOffset = cd.readUInt32LE(p + 42);
      const name = cd.toString("utf8", p + 46, p + 46 + nameLen);
      if (name === "AndroidManifest.xml") { manifest = { method, compSize, size: uncompSize, localOffset }; break; }
      p += 46 + nameLen + extraLen + commentLen;
    }
    if (!manifest) throw new ApkError("no AndroidManifest.xml");
    if (manifest.size > MAX_MANIFEST || manifest.compSize > MAX_MANIFEST) throw new ApkError("manifest too large");
    const local = await readAt(fh, manifest.localOffset, 30);
    if (local.readUInt32LE(0) !== LOCAL_SIG) throw new ApkError("broken zip entry");
    const dataStart = manifest.localOffset + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);
    const raw = await readAt(fh, dataStart, manifest.compSize);
    const xml = manifest.method === 8 ? inflateRawSync(raw) : manifest.method === 0 ? raw : null;
    if (!xml) throw new ApkError("unsupported compression");
    const fields = parseManifest(xml);

    return { ...fields, certSha256: await readSigningCert(fh, cdOffset) };
  } finally {
    await fh.close();
  }
}

/** The APK Signing Block sits right before the central directory: […pairs][size u64][magic]. */
async function readSigningCert(fh: FileHandle, cdOffset: number): Promise<string | null> {
  if (cdOffset < 32) return null;
  const footer = await readAt(fh, cdOffset - 24, 24);
  if (footer.toString("latin1", 8, 24) !== SIG_BLOCK_MAGIC) return null;
  const blockSize = Number(footer.readBigUInt64LE(0));
  if (blockSize < 24 || blockSize > 64 * 1024 * 1024 || blockSize + 8 > cdOffset) return null;
  const block = await readAt(fh, cdOffset - blockSize - 8, blockSize + 8);
  // pairs: from offset 8 up to the footer
  for (let p = 8; p + 12 <= block.length - 24; ) {
    const len = Number(block.readBigUInt64LE(p));
    const id = block.readUInt32LE(p + 8);
    const value = block.subarray(p + 12, p + 8 + len);
    if (SIGNER_IDS.includes(id)) {
      const cert = firstCertificate(value);
      if (cert) return createHash("sha256").update(cert).digest("hex").toUpperCase().match(/../g)!.join(":");
    }
    p += 8 + len;
  }
  return null;
}

/** signers (len-prefixed seq) → signer → signedData → [digests][certificates] → first DER cert */
function firstCertificate(value: Buffer): Buffer | null {
  try {
    const lp = (buf: Buffer, at: number) => ({ len: buf.readUInt32LE(at), start: at + 4 });
    const signers = lp(value, 0);
    const signer = lp(value, signers.start);
    const signedData = lp(value, signer.start);
    const sd = value.subarray(signedData.start, signedData.start + signedData.len);
    const digests = lp(sd, 0);
    const certs = lp(sd, digests.start + digests.len);
    const cert = lp(sd, certs.start);
    return cert.len > 0 ? sd.subarray(cert.start, cert.start + cert.len) : null;
  } catch {
    return null;
  }
}

// ── Android binary XML (AXML) ────────────────────────────────────────────────────────────────
const RES_STRING_POOL = 0x0001;
const RES_XML = 0x0003;
const RES_XML_START_ELEMENT = 0x0102;
const RES_XML_RESOURCE_MAP = 0x0180;
const ATTR_VERSION_CODE = 0x0101021b;
const ATTR_VERSION_NAME = 0x0101021c;
const TYPE_STRING = 0x03;

export function parseManifest(xml: Buffer): { packageName: string; versionCode: number; versionName: string } {
  if (xml.length < 8 || xml.readUInt16LE(0) !== RES_XML) throw new ApkError("not a binary manifest");
  let strings: string[] = [];
  let resMap: number[] = [];
  for (let p = xml.readUInt16LE(2); p + 8 <= xml.length; ) {
    const type = xml.readUInt16LE(p);
    const headerSize = xml.readUInt16LE(p + 2);
    const size = xml.readUInt32LE(p + 4);
    if (size < 8) break;
    if (type === RES_STRING_POOL) strings = readStringPool(xml.subarray(p, p + size));
    else if (type === RES_XML_RESOURCE_MAP) {
      resMap = [];
      for (let i = p + headerSize; i + 4 <= p + size; i += 4) resMap.push(xml.readUInt32LE(i));
    } else if (type === RES_XML_START_ELEMENT) {
      const ext = p + headerSize;
      const name = strings[xml.readUInt32LE(ext + 4)];
      if (name === "manifest") {
        const attrStart = xml.readUInt16LE(ext + 8);
        const attrSize = xml.readUInt16LE(ext + 10);
        const count = xml.readUInt16LE(ext + 12);
        const out: { packageName?: string; versionCode?: number; versionName?: string } = {};
        for (let i = 0; i < count; i++) {
          const a = ext + attrStart + i * attrSize;
          const nameIdx = xml.readUInt32LE(a + 4);
          const rawIdx = xml.readUInt32LE(a + 8);
          const dataType = xml.readUInt8(a + 15);
          const data = xml.readUInt32LE(a + 16);
          const attr = strings[nameIdx];
          const resId = resMap[nameIdx];
          const str = rawIdx !== 0xffffffff ? strings[rawIdx] : dataType === TYPE_STRING ? strings[data] : undefined;
          if (attr === "package") out.packageName = str;
          else if (resId === ATTR_VERSION_CODE || attr === "versionCode") out.versionCode = str !== undefined ? Number(str) : data;
          else if (resId === ATTR_VERSION_NAME || attr === "versionName") out.versionName = str ?? String(data);
        }
        if (!out.packageName || !Number.isInteger(out.versionCode) || !out.versionCode) throw new ApkError("manifest without package / versionCode");
        return { packageName: out.packageName, versionCode: out.versionCode!, versionName: out.versionName ?? String(out.versionCode) };
      }
    }
    p += size;
  }
  throw new ApkError("no <manifest> element");
}

function readStringPool(chunk: Buffer): string[] {
  const headerSize = chunk.readUInt16LE(2);
  const count = chunk.readUInt32LE(8);
  const flags = chunk.readUInt32LE(16);
  const stringsStart = chunk.readUInt32LE(20);
  const utf8 = (flags & (1 << 8)) !== 0;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let p = stringsStart + chunk.readUInt32LE(headerSize + i * 4);
    if (utf8) {
      // two lengths (chars, bytes), each 1 or 2 bytes
      p += chunk[p] & 0x80 ? 2 : 1;
      let len = chunk[p];
      if (len & 0x80) { len = ((len & 0x7f) << 8) | chunk[p + 1]; p += 2; } else p += 1;
      out.push(chunk.toString("utf8", p, p + len));
    } else {
      let len = chunk.readUInt16LE(p);
      if (len & 0x8000) { len = ((len & 0x7fff) << 16) | chunk.readUInt16LE(p + 2); p += 4; } else p += 2;
      out.push(chunk.toString("utf16le", p, p + len * 2));
    }
  }
  return out;
}
