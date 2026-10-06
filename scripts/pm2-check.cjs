// Verifies the pm2 prod processes run what ecosystem.config.cjs says (`node scripts/pm2-check.cjs`,
// run by deploy.sh; exits 1 on any mismatch). Per app: the exec mode and number of instances from
// the config (cluster mode, see ecosystem.config.cjs), and for every instance: online, the running
// script is the one in the config (pm_exec_path, and no other script in /proc/<pid>/cmdline), and
// the live build-folder env var in the process (/proc/<pid>/environ, else pm2's copy) matches
// .dist-live/.next-live. Then its port answers HTTP.
//
// `--scripts` only prints the apps pm2 can't reload into the config — not running, a different
// script, fork instead of cluster mode, or the wrong instance count — one name per line; deploy.sh
// recreates those.
const { execFileSync } = require("child_process");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const root = resolve(__dirname, "..");
const { apps } = require(resolve(root, "ecosystem.config.cjs"));
const checks = {
  "salon-api-prod": { envVar: "API_DIST", port: 3011 },
  "salon-web-prod": { envVar: "NEXT_DIST_DIR", port: 3010 },
};

// Cluster mode: one jlist entry per instance, all with the app's name.
const running = new Map();
for (const p of JSON.parse(execFileSync("pm2", ["jlist"], { encoding: "utf8", maxBuffer: 64 << 20 }))) {
  running.set(p.name, [...(running.get(p.name) ?? []), p]);
}
const expectedScript = (app) => resolve(root, app.cwd, app.script);
const expectedMode = (app) => (app.exec_mode === "cluster" ? "cluster_mode" : "fork_mode");
const expectedCount = (app) => (app.exec_mode === "cluster" ? Number(app.instances ?? 1) : 1);

/**
 * Why pm2 can't just reload this app into what the config says, or null. A reload never changes
 * the script, the exec mode (fork ⇄ cluster) or — reliably — the instance count, so deploy.sh
 * recreates an app for any of these (a few seconds' downtime for that app, once).
 */
function needsRecreate(app) {
  const procs = running.get(app.name) ?? [];
  if (procs.length === 0) return "not running";
  if (procs.some((p) => p.pm2_env.pm_exec_path !== expectedScript(app))) return "different script";
  if (procs.some((p) => p.pm2_env.exec_mode !== expectedMode(app))) return `not in ${expectedMode(app)}`;
  if (procs.length !== expectedCount(app)) return `${procs.length} instance(s), config wants ${expectedCount(app)}`;
  return null;
}

function procEnv(pid) {
  try {
    return Object.fromEntries(
      readFileSync(`/proc/${pid}/environ`, "utf8")
        .split("\0")
        .filter(Boolean)
        .map((kv) => [kv.slice(0, kv.indexOf("=")), kv.slice(kv.indexOf("=") + 1)]),
    );
  } catch {
    return null;
  }
}

// pm2 rewrites the process title, after which cmdline is one space-padded string
// ("node /root/…/apps/api/start.cjs      ") instead of NUL-separated arguments, so split on both.
function procCmdline(pid) {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").split(/[\0\s]+/).filter(Boolean);
  } catch {
    return null;
  }
}

if (process.argv.includes("--scripts")) {
  for (const app of apps) if (needsRecreate(app)) console.log(app.name);
  process.exit(0);
}

async function answers(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(10_000) });
    return res.status;
  } catch {
    return null;
  }
}

(async () => {
  const errors = [];
  for (const app of apps) {
    const { envVar, port } = checks[app.name] ?? {};
    const procs = running.get(app.name) ?? [];
    const fail = (msg) => errors.push(`${app.name}: ${msg}`);
    if (procs.length === 0) {
      fail("not running under pm2");
      continue;
    }
    const layout = needsRecreate(app);
    if (layout) fail(layout);
    const script = expectedScript(app);
    for (const p of procs) {
      const e = p.pm2_env;
      const who = `instance ${e.NODE_APP_INSTANCE ?? e.pm_id} (pid ${p.pid})`;
      if (e.status !== "online" || !p.pid) fail(`${who}: status ${e.status}`);
      if (e.pm_exec_path !== script) fail(`${who}: pm2 runs ${e.pm_exec_path}, config says ${script}`);
      // pm_exec_path and the env var below are the real signals. The cmdline only adds one: a
      // *different* script file under apps/ in argv is a mismatch. In cluster mode argv is pm2's
      // ProcessContainer (outside apps/), and a process.title rewrite may hide the script — fine.
      const other = procCmdline(p.pid)
        ?.map((a) => resolve(e.pm_cwd ?? root, a))
        .find((a) => a.startsWith(resolve(root, "apps")) && /\.c?js$/.test(a) && a !== script);
      if (other) fail(`${who}: runs ${other}, expected ${script}`);
      if (envVar) {
        const want = app.env[envVar];
        // Fork mode: the process's real environment (/proc/<pid>/environ). Cluster mode: pm2 hands
        // the worker its env after exec, so /proc only has the daemon's — use pm2's copy then.
        const got = procEnv(p.pid)?.[envVar] ?? e.env?.[envVar] ?? e[envVar];
        if (got !== want) fail(`${who}: ${envVar}=${got ?? "(unset)"} in the process, live folder is ${want}`);
      }
    }
    if (port) {
      const status = await answers(port);
      if (status === null) fail(`nothing answers on 127.0.0.1:${port}`);
      else if (status >= 500) fail(`127.0.0.1:${port}/ returned ${status}`);
    }
    if (!errors.some((m) => m.startsWith(`${app.name}:`)))
      console.log(`pm2-check: ${app.name} ok (${envVar}=${app.env[envVar]}, ${procs.length} × ${expectedMode(app)}, pids ${procs.map((p) => p.pid).join(",")})`);
  }
  if (errors.length) {
    console.error(`pm2-check: FAILED\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
})();
