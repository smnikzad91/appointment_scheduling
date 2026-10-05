import { hostname } from "node:os";
import { writeFileSync } from "node:fs";
import { Modem, parseStoredMessages } from "./modem.mjs";
import { decodePdu } from "./pdu.mjs";
import { addPart } from "./assemble.mjs";
import { createStore } from "./store.mjs";
import { signedHeaders } from "./sign.mjs";

// nobatet bank-SMS agent (BeagleBone Black + SIM800C): every SMS the SIM receives is decoded,
// queued on disk, and forwarded signed to the platform (POST /api/bank-sms/messages), which
// matches deposits to wallet top-ups. An SMS is deleted from the SIM only after the server
// accepted it, so nothing is lost when the internet or the server is down. See README.md.

const cfg = {
  device: process.env.SERIAL_DEVICE ?? "/dev/ttyS1",
  baud: Number(process.env.SERIAL_BAUD ?? 115200),
  server: (process.env.SERVER_URL ?? "https://nobatet.app").replace(/\/$/, ""),
  secret: process.env.DEVICE_SECRET ?? "",
  deviceId: process.env.DEVICE_ID ?? hostname(),
  dataDir: process.env.DATA_DIR ?? "/var/lib/bank-sms-agent",
  heartbeatMs: Number(process.env.HEARTBEAT_MS ?? 5 * 60_000),
  sweepMs: Number(process.env.SWEEP_MS ?? 60_000),
  pwrkeyGpio: process.env.PWRKEY_GPIO ?? "",
};
if (!cfg.secret) {
  console.error("DEVICE_SECRET is not set (same value as BANK_SMS_DEVICE_SECRET on the server)");
  process.exit(2);
}

const log = (...a) => console.log(new Date().toISOString(), ...a);
const store = createStore(cfg.dataDir);
const modem = new Modem(cfg.device, cfg.baud);
let parts = store.loadParts();
let timeouts = 0;

async function at(command, timeoutMs) {
  try {
    const lines = await modem.command(command, timeoutMs);
    timeouts = 0;
    return lines;
  } catch (err) {
    if (err.timeout && ++timeouts >= 3) await resetModem("3 commands timed out");
    throw err;
  }
}

async function init() {
  for (let attempt = 1; ; attempt++) {
    try {
      await at("AT", 2000);
      break;
    } catch {
      if (attempt >= 10) throw new Error("the modem doesn't answer AT");
      await sleep(1000);
    }
  }
  await at("ATE0");
  await at("AT+CMEE=2");
  await at("AT+CMGF=0"); // PDU mode: multi-part and Persian (UCS2) SMS decode reliably
  await at('AT+CPMS="SM","SM","SM"').catch(() => {});
  await at("AT+CNMI=2,1,0,0,0"); // store new SMS on the SIM and tell us with +CMTI
  log("modem ready on", cfg.device);
}

/** Decode one stored SMS, assemble parts, queue complete messages. */
function handleStored(index, pdu) {
  let decoded;
  try {
    decoded = decodePdu(pdu);
  } catch (err) {
    log(`slot ${index}: not an incoming SMS (${err.message}), deleting`);
    at(`AT+CMGD=${index}`).catch(() => {});
    return;
  }
  const ready = addPart(parts, decoded, index);
  store.saveParts(parts);
  for (const m of ready) log("queued SMS from", m.sender, "id", store.enqueue(m));
}

async function readIndex(index) {
  const lines = await at(`AT+CMGR=${index}`, 10_000);
  for (const m of parseStoredMessages(lines, index)) handleStored(m.index, m.pdu);
  flush();
}

/** Every message on the SIM (catches any +CMTI missed while restarting). */
async function sweep() {
  const lines = await at("AT+CMGL=4", 30_000);
  for (const m of parseStoredMessages(lines)) handleStored(m.index, m.pdu);
  flush();
}

let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    for (const m of store.pending()) {
      const body = JSON.stringify({ deviceId: cfg.deviceId, sender: m.sender, body: m.body, receivedAt: m.receivedAt });
      const res = await fetch(`${cfg.server}/api/bank-sms/messages`, { method: "POST", headers: signedHeaders(cfg.secret, body), body, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        log(`server refused ${m.id}: ${res.status}${res.status === 401 ? " (check DEVICE_SECRET and the clock)" : ""}`);
        break;
      }
      const result = await res.json().catch(() => ({}));
      log(`sent ${m.id}: ${result.duplicate ? "duplicate" : result.status}`);
      for (const i of m.indexes) await at(`AT+CMGD=${i}`).catch((e) => log("delete failed", e.message));
      store.done(m.id);
    }
  } catch (err) {
    log("send failed, will retry:", err.message);
  } finally {
    flushing = false;
  }
}

async function heartbeat() {
  const info = { queued: store.pending().length, waitingParts: Object.keys(parts).length, uptimeS: Math.round(process.uptime()) };
  let signal = null;
  try {
    const csq = /\+CSQ:\s*(\d+)/.exec((await at("AT+CSQ")).join(" "));
    signal = csq && csq[1] !== "99" ? Number(csq[1]) : null;
    const creg = /\+CREG:\s*\d,(\d)/.exec((await at("AT+CREG?")).join(" "));
    info.registered = creg ? ["1", "5"].includes(creg[1]) : null;
    const cpms = /\+CPMS:\s*"\w+",(\d+),(\d+)/.exec((await at("AT+CPMS?")).join(" "));
    if (cpms) info.sim = `${cpms[1]}/${cpms[2]}`;
  } catch (err) {
    info.modemError = err.message;
  }
  const body = JSON.stringify({ deviceId: cfg.deviceId, signal, info });
  await fetch(`${cfg.server}/api/bank-sms/heartbeat`, { method: "POST", headers: signedHeaders(cfg.secret, body), body, signal: AbortSignal.timeout(20_000) }).catch((e) => log("heartbeat failed:", e.message));
}

/** A hung modem: pulse PWRKEY (if wired) and let systemd restart us. */
async function resetModem(reason) {
  log("resetting modem:", reason);
  if (cfg.pwrkeyGpio) {
    try {
      const g = `/sys/class/gpio/gpio${cfg.pwrkeyGpio}/value`;
      writeFileSync(g, "1");
      await sleep(1500);
      writeFileSync(g, "0");
    } catch (e) {
      log("PWRKEY pulse failed:", e.message);
    }
  }
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  modem.open();
  modem.on("error", (err) => {
    log("serial error:", err.message);
    process.exit(1);
  });
  modem.on("sms", (index) => readIndex(index).catch((e) => log("read failed:", e.message)));
  await init();
  await sweep().catch((e) => log("sweep failed:", e.message));
  await heartbeat();
  setInterval(() => sweep().catch((e) => log("sweep failed:", e.message)), cfg.sweepMs);
  setInterval(() => flush(), 15_000);
  setInterval(() => heartbeat(), cfg.heartbeatMs);
}

main().catch((err) => {
  log("fatal:", err.message);
  process.exit(1);
});
