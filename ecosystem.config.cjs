// pm2 production config for dev-iot.ir. Build first — `npm run deploy` does build + migrate + reload:
//
//   npm run deploy                               # build both apps, migrate, (re)start under pm2
//   pm2 startOrReload ecosystem.config.cjs       # restart only, no rebuild
//   pm2 logs salon-web-prod | salon-api-prod
//
// Both bind to 127.0.0.1 — nginx (/etc/nginx/sites-available/dev-iot.ir) is the only way in:
//   https://dev-iot.ir/          → salon-web-prod (3010)
//   https://dev-iot.ir/backend/  → salon-api-prod (3011)
// Secrets stay in the apps' .env files (apps/api/.env, apps/web/.env + .env.production); only
// ports and hosts are set here, and these win over the .env files.
//
// Build folders: `npm run deploy` (scripts/deploy.sh) builds into dist-a|dist-b and .next-a|.next-b
// alternately and records the live one in apps/api/.dist-live and apps/web/.next-live, read here on
// every (re)load. Before the first such deploy they don't exist and the old dist / .next are used.
//
// Script paths must stay fixed: `pm2 reload`/`startOrReload` never apply a changed `script` to a
// process that already exists (only env, via --update-env). So the api runs apps/api/start.cjs,
// which loads $API_DIST/main.js, and the web picks its folder from NEXT_DIST_DIR. deploy.sh still
// recreates a process whose running script differs from this file, and verifies both afterwards.

const { readFileSync } = require("fs");
const { join } = require("path");

function live(file, fallback) {
  try {
    return readFileSync(join(__dirname, file), "utf8").trim() || fallback;
  } catch {
    return fallback;
  }
}

const apiDist = live("apps/api/.dist-live", "dist");
const webDist = live("apps/web/.next-live", ".next");

// Zero-downtime reloads: both apps run in pm2 cluster mode with INSTANCES processes sharing the
// port, and `pm2 reload` (what startOrReload does for a running app) replaces them one at a time,
// stopping an old one only after its replacement is up. The api signals that itself
// (process.send("ready") after app.listen, wait_ready); `next start` has no such hook, so for the
// web pm2 waits for the new worker to start listening (listen_timeout). Background jobs (SMS
// reminders) run in api instance 0 only (apps/api src/sms/job-runner.ts).
//
// Memory: ~4 Node processes. max_memory_restart restarts an instance that grows past it (a rolling
// restart of just that one), so the worst case stays near 2×500M + 2×900M.
const INSTANCES = 2;

module.exports = {
  apps: [
    {
      name: "salon-api-prod",
      cwd: "./apps/api",
      script: "start.cjs",
      exec_mode: "cluster",
      instances: INSTANCES,
      // start.cjs loads ${API_DIST}/main.js.
      env: { NODE_ENV: "production", PORT: "3011", HOST: "127.0.0.1", API_DIST: apiDist },
      wait_ready: true,
      listen_timeout: 30_000, // give up waiting for "ready" after this (the reload then continues)
      kill_timeout: 8_000, // let in-flight requests finish before SIGKILL
      max_memory_restart: "500M",
      time: true,
    },
    {
      name: "salon-web-prod",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      exec_mode: "cluster",
      instances: INSTANCES,
      // next.config reads distDir from NEXT_DIST_DIR.
      env: { NODE_ENV: "production", NEXT_DIST_DIR: webDist },
      listen_timeout: 30_000,
      kill_timeout: 8_000,
      max_memory_restart: "900M",
      time: true,
    },
  ],
};
