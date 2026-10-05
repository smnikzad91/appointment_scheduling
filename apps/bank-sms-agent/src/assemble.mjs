// Multi-part SMS: parts are kept (with the SIM slots they occupy) until all have arrived, then
// joined in order. A part waiting longer than STALE_MS is sent alone (marked), never lost.

export const STALE_MS = 24 * 60 * 60_000;

/**
 * parts: { [key]: { sender, receivedAt, total, seen: { [seq]: { text, index } }, firstSeen } }
 * Returns the complete messages ready to send ({ sender, body, receivedAt, indexes }) and the parts still waiting.
 */
export function addPart(parts, decoded, index, now = Date.now()) {
  const ready = [];
  if (!decoded.concat) {
    ready.push({ sender: decoded.sender, body: decoded.text, receivedAt: decoded.receivedAt, indexes: [index] });
  } else {
    const { ref, total, seq } = decoded.concat;
    const key = `${decoded.sender}|${ref}|${total}`;
    const entry = (parts[key] ??= { sender: decoded.sender, receivedAt: decoded.receivedAt, total, seen: {}, firstSeen: now });
    entry.seen[seq] = { text: decoded.text, index };
    if (decoded.receivedAt < entry.receivedAt) entry.receivedAt = decoded.receivedAt;
  }
  for (const [key, e] of Object.entries(parts)) {
    const seqs = Object.keys(e.seen).map(Number).sort((a, b) => a - b);
    const complete = seqs.length === e.total;
    if (complete || now - e.firstSeen > STALE_MS) {
      ready.push({
        sender: e.sender,
        body: seqs.map((s) => e.seen[s].text).join("") + (complete ? "" : " [ناقص]"),
        receivedAt: e.receivedAt,
        indexes: seqs.map((s) => e.seen[s].index),
      });
      delete parts[key];
    }
  }
  return ready;
}
