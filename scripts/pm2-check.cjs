// Verifies the pm2 prod processes run what ecosystem.config.cjs says (`node scripts/pm2-check.cjs`,
// run by deploy.sh; exits 1 on any mismatch). Per app: online, the running script is the one in the
// config (pm_exec_path, and no other script in /proc/<pid>/cmdline), the live build-folder env var in the process
// (/proc/<pid>/environ, else pm2's copy) matches .dist-live/.next-live, and its port answers HTTP.
//
// `--scripts` only prints the apps whose running script differs from the config (or that aren't
// running), one name per line — deploy.sh recreates those, since reload never changes a script.
const { execFileSync } = require("child_process");
const { readFileSync } = require("fs");
const { resolve } = require("path");

const root = resolve(__dirname, "..");
const { apps } = require(resolve(root, "ecosystem.config.cjs"));
const checks = {
  "salon-api-prod": { envVar: "API_DIST", port: 3011 },
  "salon-web-prod": { envVar: "NEXT_DIST_DIR", port: 3010 },
};

const running = new Map(
  JSON.parse(execFileSync("pm2", ["jlist"], { encoding: "utf8", maxBuffer: 64 << 20 })).map((p) => [p.name, p]),
);
const expectedScript = (app) => resolve(root, app.cwd, app.script);

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
  for (const app of apps) {
    const p = running.get(app.name);
    if (!p || p.pm2_env.pm_exec_path !== expectedScript(app)) console.log(app.name);
  }
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
    const p = running.get(app.name);
    const fail = (msg) => errors.push(`${app.name}: ${msg}`);
    if (!p) {
      fail("not running under pm2");
      continue;
    }
    const e = p.pm2_env;
    if (e.status !== "online" || !p.pid) fail(`status ${e.status}, pid ${p.pid}`);
    const script = expectedScript(app);
    if (e.pm_exec_path !== script) fail(`pm2 runs ${e.pm_exec_path}, config says ${script}`);
    const cmd = procCmdline(p.pid);
    // pm_exec_path and the env var below are the real signals. The cmdline only adds one: a
    // *different* script file under apps/ in argv is a mismatch; pm2's container or a
    // process.title rewrite (next start → "next-server …") may hide the script, which isn't.
    const other = cmd
      ?.map((a) => resolve(e.pm_cwd ?? root, a))
      .find((a) => a.startsWith(resolve(root, "apps")) && /\.c?js$/.test(a) && a !== script);
    if (other) fail(`process runs ${other}, expected ${script}`);
    if (envVar) {
      const want = app.env[envVar];
      const got = (procEnv(p.pid) ?? e.env ?? e)[envVar];
      if (got !== want) fail(`${envVar}=${got ?? "(unset)"} in the process, live folder is ${want}`);
    }
    if (port) {
      const status = await answers(port);
      if (status === null) fail(`nothing answers on 127.0.0.1:${port}`);
      else if (status >= 500) fail(`127.0.0.1:${port}/ returned ${status}`);
    }
    if (!errors.some((m) => m.startsWith(`${app.name}:`)))
      console.log(`pm2-check: ${app.name} ok (${envVar}=${app.env[envVar]}, pid ${p.pid})`);
  }
  if (errors.length) {
    console.error(`pm2-check: FAILED\n  ${errors.join("\n  ")}`);
    process.exit(1);
  }
})();
