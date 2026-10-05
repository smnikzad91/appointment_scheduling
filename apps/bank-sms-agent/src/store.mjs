import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

// Local persistence on the board (DATA_DIR): the outbox (one JSON file per SMS not yet accepted by
// the server, named by its hash, so a re-read SMS doesn't queue twice) and the waiting parts of
// multi-part SMS. Writes are atomic (temp file + rename) so a power cut never leaves half a file.

export function createStore(dir) {
  const outbox = join(dir, "outbox");
  mkdirSync(outbox, { recursive: true });
  const partsFile = join(dir, "parts.json");
  const write = (file, data) => {
    writeFileSync(file + ".tmp", JSON.stringify(data));
    renameSync(file + ".tmp", file);
  };
  return {
    loadParts() {
      try {
        return JSON.parse(readFileSync(partsFile, "utf8"));
      } catch {
        return {};
      }
    },
    saveParts(parts) {
      write(partsFile, parts);
    },
    /** Queue a complete SMS; returns its id. Already queued → same id, indexes merged. */
    enqueue(message) {
      const id = createHash("sha256").update([message.sender, message.receivedAt, message.body].join("\u0000")).digest("hex").slice(0, 32);
      const file = join(outbox, id + ".json");
      let existing = null;
      try {
        existing = JSON.parse(readFileSync(file, "utf8"));
      } catch {}
      const indexes = [...new Set([...(existing?.indexes ?? []), ...message.indexes])];
      write(file, { ...message, id, indexes, queuedAt: existing?.queuedAt ?? new Date().toISOString() });
      return id;
    },
    pending() {
      return readdirSync(outbox)
        .filter((f) => f.endsWith(".json"))
        .map((f) => {
          try {
            return JSON.parse(readFileSync(join(outbox, f), "utf8"));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
    },
    done(id) {
      try {
        unlinkSync(join(outbox, id + ".json"));
      } catch {}
    },
  };
}
