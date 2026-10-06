// Test fixture: a minimal but valid APK (zip with a binary AndroidManifest.xml, unsigned) for the
// upload tests — no Android SDK on the server. Only node: imports.
import { crc32 } from "node:zlib";

function stringPool(strings: string[]): Buffer {
  const encoded = strings.map((s) => {
    const b = Buffer.alloc(2 + s.length * 2 + 2);
    b.writeUInt16LE(s.length, 0);
    b.write(s, 2, "utf16le");
    return b;
  });
  const offsets = Buffer.alloc(strings.length * 4);
  let o = 0;
  encoded.forEach((e, i) => { offsets.writeUInt32LE(o, i * 4); o += e.length; });
  let body = Buffer.concat(encoded);
  if (body.length % 4) body = Buffer.concat([body, Buffer.alloc(4 - (body.length % 4))]);
  const header = Buffer.alloc(28);
  header.writeUInt16LE(0x0001, 0);
  header.writeUInt16LE(28, 2);
  header.writeUInt32LE(28 + offsets.length + body.length, 4);
  header.writeUInt32LE(strings.length, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(0, 16); // UTF-16
  header.writeUInt32LE(28 + offsets.length, 20);
  return Buffer.concat([header, offsets, body]);
}

export function binaryManifest(pkg: string, versionCode: number, versionName: string): Buffer {
  const strings = ["versionCode", "versionName", "manifest", "package", pkg, versionName];
  const pool = stringPool(strings);
  const resMap = Buffer.alloc(16);
  resMap.writeUInt16LE(0x0180, 0); resMap.writeUInt16LE(8, 2); resMap.writeUInt32LE(16, 4);
  resMap.writeUInt32LE(0x0101021b, 8); resMap.writeUInt32LE(0x0101021c, 12);
  const attrs = [
    [0xffffffff, 3, 4, 0x03, 4], // package
    [0xffffffff, 0, 0xffffffff, 0x10, versionCode], // android:versionCode
    [0xffffffff, 1, 5, 0x03, 5], // android:versionName
  ];
  const el = Buffer.alloc(16 + 20 + attrs.length * 20);
  el.writeUInt16LE(0x0102, 0); el.writeUInt16LE(16, 2); el.writeUInt32LE(el.length, 4);
  el.writeUInt32LE(1, 8); el.writeUInt32LE(0xffffffff, 12);
  el.writeUInt32LE(0xffffffff, 16); el.writeUInt32LE(2, 20); // ns, name = "manifest"
  el.writeUInt16LE(20, 24); el.writeUInt16LE(20, 26); el.writeUInt16LE(attrs.length, 28);
  attrs.forEach(([ns, name, raw, type, data], i) => {
    const a = 36 + i * 20;
    el.writeUInt32LE(ns, a); el.writeUInt32LE(name, a + 4); el.writeUInt32LE(raw, a + 8);
    el.writeUInt16LE(8, a + 12); el.writeUInt8(0, a + 14); el.writeUInt8(type, a + 15); el.writeUInt32LE(data, a + 16);
  });
  const header = Buffer.alloc(8);
  header.writeUInt16LE(0x0003, 0); header.writeUInt16LE(8, 2); header.writeUInt32LE(8 + pool.length + resMap.length + el.length, 4);
  return Buffer.concat([header, pool, resMap, el]);
}

/** A stored (uncompressed) zip holding just AndroidManifest.xml (+ optional padding entry to make it bigger). */
export function makeTestApk(pkg: string, versionCode: number, versionName = `1.${versionCode}.0`, padding = 0): Buffer {
  const entries: [string, Buffer][] = [["AndroidManifest.xml", binaryManifest(pkg, versionCode, versionName)]];
  if (padding) entries.push(["assets/padding.bin", Buffer.alloc(padding, 7)]);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const n = Buffer.from(name);
    const crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(offset, 42);
    locals.push(lh, n, data);
    centrals.push(ch, n);
    offset += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}
