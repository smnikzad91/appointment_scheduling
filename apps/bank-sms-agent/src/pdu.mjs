// SMS-DELIVER PDU decoder (3GPP TS 23.040) for the SIM800C in PDU mode (AT+CMGF=0): sender
// (number or alphanumeric like "BankMellat"), service-centre timestamp, text in GSM 7-bit / UCS2
// (Persian) / 8-bit, and the concatenation header of multi-part SMS (bank SMS are often 2–3 parts).

const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = { 0x0a: "\f", 0x14: "^", 0x28: "{", 0x29: "}", 0x2f: "\\", 0x3c: "[", 0x3d: "~", 0x3e: "]", 0x40: "|", 0x65: "€" };

/** Unpacks `count` 7-bit septets starting `skipBits` into `bytes`. */
export function unpackSeptets(bytes, count, skipBits = 0) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const bit = skipBits + i * 7;
    const byte = bit >> 3;
    const shift = bit & 7;
    let v = (bytes[byte] ?? 0) >> shift;
    if (shift > 1) v |= (bytes[byte + 1] ?? 0) << (8 - shift);
    out.push(v & 0x7f);
  }
  return out;
}

export function gsm7ToString(septets) {
  let s = "";
  for (let i = 0; i < septets.length; i++) {
    const c = septets[i];
    if (c === 0x1b && i + 1 < septets.length) {
      s += GSM7_EXT[septets[++i]] ?? " ";
    } else s += GSM7[c] ?? "?";
  }
  return s;
}

function ucs2ToString(bytes) {
  const swapped = Buffer.alloc(bytes.length - (bytes.length % 2));
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    swapped[i] = bytes[i + 1];
    swapped[i + 1] = bytes[i];
  }
  return swapped.toString("utf16le");
}

const bcd = (b) => (b & 0x0f) * 10 + (b >> 4);

/** The service-centre timestamp → ISO string with its time zone (quarter hours). */
function decodeTimestamp(b) {
  const [y, mo, d, h, mi, s, tzByte] = b;
  const quarters = (tzByte & 0x07) * 10 + (tzByte >> 4);
  const sign = tzByte & 0x08 ? -1 : 1;
  const offsetMin = sign * quarters * 15;
  const utc = Date.UTC(2000 + bcd(y), bcd(mo) - 1, bcd(d), bcd(h), bcd(mi), bcd(s)) - offsetMin * 60_000;
  return new Date(utc).toISOString();
}

function decodeAddress(bytes, pos) {
  const digits = bytes[pos];
  const toa = bytes[pos + 1];
  const octets = Math.ceil(digits / 2);
  const data = bytes.subarray(pos + 2, pos + 2 + octets);
  let address;
  if ((toa & 0x70) === 0x50) {
    // alphanumeric (GSM 7-bit packed): the length counts semi-octets, but networks round it either
    // way (10 chars = 70 bits → 18 or 17), so read every septet the octets hold; zero-bit padding
    // decodes as trailing "@", which is dropped
    address = gsm7ToString(unpackSeptets(data, Math.floor((octets * 8) / 7))).replace(/@+$/, "").trim();
  } else {
    address = "";
    for (const b of data) address += (b & 0x0f).toString(16) + (b >> 4).toString(16);
    address = address.slice(0, digits).replace(/f/gi, "");
    if ((toa & 0x70) === 0x10) address = "+" + address;
  }
  return { address, next: pos + 2 + octets };
}

function alphabetOf(dcs) {
  const group = dcs & 0xf0;
  if (group === 0xf0) return dcs & 0x04 ? "8bit" : "gsm7";
  if ((dcs & 0xc0) === 0x00 || (dcs & 0xc0) === 0x40) {
    const a = (dcs >> 2) & 0x03;
    return a === 2 ? "ucs2" : a === 1 ? "8bit" : "gsm7";
  }
  return "gsm7";
}

/**
 * Decodes one SMS-DELIVER PDU (hex, with the SMSC prefix as the modem gives it).
 * concat = { ref, total, seq } for a part of a multi-part SMS, else null.
 */
export function decodePdu(hex) {
  const b = Buffer.from(hex.trim(), "hex");
  let p = b[0] + 1; // skip SMSC
  const first = b[p++];
  if ((first & 0x03) !== 0x00) throw new Error("not an SMS-DELIVER");
  const udhi = (first & 0x40) !== 0;
  const { address: sender, next } = decodeAddress(b, p);
  p = next;
  p++; // PID
  const dcs = b[p++];
  const receivedAt = decodeTimestamp(b.subarray(p, p + 7));
  p += 7;
  const udl = b[p++];
  const ud = b.subarray(p);
  const alphabet = alphabetOf(dcs);

  let concat = null;
  let headerOctets = 0;
  if (udhi) {
    const udhl = ud[0];
    headerOctets = udhl + 1;
    let i = 1;
    while (i < headerOctets) {
      const iei = ud[i];
      const len = ud[i + 1];
      const v = ud.subarray(i + 2, i + 2 + len);
      if (iei === 0x00 && len === 3) concat = { ref: v[0], total: v[1], seq: v[2] };
      if (iei === 0x08 && len === 4) concat = { ref: (v[0] << 8) | v[1], total: v[2], seq: v[3] };
      i += 2 + len;
    }
  }

  let text;
  if (alphabet === "gsm7") {
    const skipSeptets = Math.ceil((headerOctets * 8) / 7);
    text = gsm7ToString(unpackSeptets(ud, udl - skipSeptets, skipSeptets * 7));
  } else {
    const body = ud.subarray(headerOctets, udl);
    text = alphabet === "ucs2" ? ucs2ToString(body) : body.toString("latin1");
  }
  return { sender, receivedAt, text, concat, alphabet };
}
