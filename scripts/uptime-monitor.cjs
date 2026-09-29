// Uptime monitor for dev-iot.ir. Run once a minute from cron (see CLAUDE.md, "Uptime alerts"):
//
//   * * * * * cd /root/projects/appointment_scheduling && node scripts/uptime-monitor.cjs >> /var/log/nobta-uptime.log 2>&1
//
// Each run checks the API (127.0.0.1:3011/health, which also checks Postgres) and the web app
// (127.0.0.1:3010/). After FAIL_THRESHOLD consecutive failures of a target it sends ONE alert; when
// the target answers again it sends one "recovered" message. Counters live in .uptime-state.json
// (gitignored). If an alert can't be delivered it's retried on the next run, never repeated after.
//
// Alerts go by SMS only. OFF unless UPTIME_ALERTS=on. Settings, in apps/api/.env:
//   UPTIME_ALERTS=on
//   UPTIME_ALERT_PHONE=09xxxxxxxxx     sent through notifycloud (SMS_API_KEY, SMS_API_URL, same file)
const { readFileSync, writeFileSync, renameSync } = require("fs");
const { join } = require("path");

const ROOT = join(__dirname, "..");
const STATE_FILE = join(ROOT, ".uptime-state.json");
const FAIL_THRESHOLD = 3;
const TIMEOUT_MS = 10_000;
const TARGETS = [
  { id: "api", name: "API", url: "http://127.0.0.1:3011/health" },
  { id: "web", name: "سایت", url: "http://127.0.0.1:3010/" },
];

/**
 * Pure alert logic. state: { [id]: { fails, alerted } }; results: { [id]: true (up) | string (why
 * it's down) }. Returns the next state (assuming every message gets delivered) and the messages.
 */
function decide(state, results, now = new Date()) {
  const next = {};
  const messages = [];
  const when = now.toISOString().replace("T", " ").slice(0, 16) + " UTC";
  for (const t of TARGETS) {
    const prev = state[t.id] ?? { fails: 0, alerted: false };
    const r = results[t.id];
    if (r === true) {
      if (prev.alerted) messages.push({ id: t.id, kind: "recovered", text: `✅ نوبتا: ${t.name} دوباره در دسترس است (${when}).` });
      next[t.id] = { fails: 0, alerted: false };
    } else {
      const fails = prev.fails + 1;
      const alert = !prev.alerted && fails >= FAIL_THRESHOLD;
      if (alert) messages.push({ id: t.id, kind: "down", text: `🔴 نوبتا: ${t.name} ${fails} دقیقه است پاسخ نمی‌دهد (${r}). ${when}` });
      next[t.id] = { fails, alerted: prev.alerted || alert };
    }
  }
  return { next, messages };
}

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual" });
    return res.status < 500 ? true : `HTTP ${res.status}`;
  } catch (err) {
    return err?.name === "TimeoutError" ? "timeout" : "no connection";
  }
}

function loadEnv() {
  for (const f of ["apps/api/.env"]) {
    try {
      process.loadEnvFile(join(ROOT, f)); // never overrides a value already set
    } catch {
      // file not there
    }
  }
}

async function sms(text) {
  const { UPTIME_ALERT_PHONE: to, SMS_API_KEY: key, SMS_API_URL: url } = process.env;
  if (!to || !key) return false;
  try {
    const res = await fetch(`${(url || "https://notifycloud.ir").replace(/\/+$/, "")}/api/v1/sms`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ number: to, text, clientSmsId: `uptime:${Date.now()}` }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  loadEnv();
  if (process.env.UPTIME_ALERTS !== "on") return; // off until configured
  if (!process.env.UPTIME_ALERT_PHONE || !process.env.SMS_API_KEY) {
    console.error(`${new Date().toISOString()} uptime: UPTIME_ALERTS=on but UPTIME_ALERT_PHONE or SMS_API_KEY is not set (apps/api/.env)`);
    return;
  }

  let state = {};
  try {
    state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    // first run
  }
  const results = {};
  await Promise.all(TARGETS.map(async (t) => (results[t.id] = await probe(t.url))));
  const { next, messages } = decide(state, results);

  for (const m of messages) {
    const sent = await sms(m.text);
    console.log(`${new Date().toISOString()} uptime: ${m.kind} ${m.id} — sms ${sent ? "sent" : "NOT sent"}`);
    if (!sent) {
      // Undelivered: keep the old flag so it's tried again next minute (still only once delivered).
      next[m.id] = { ...next[m.id], alerted: state[m.id]?.alerted ?? false };
    }
  }
  writeFileSync(`${STATE_FILE}.tmp`, JSON.stringify(next));
  renameSync(`${STATE_FILE}.tmp`, STATE_FILE);
}

module.exports = { decide, TARGETS, FAIL_THRESHOLD };
if (require.main === module) main().catch((err) => console.error(`${new Date().toISOString()} uptime: ${err?.stack ?? err}`));
