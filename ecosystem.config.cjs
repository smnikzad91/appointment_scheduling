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

module.exports = {
  apps: [
    {
      name: "salon-api-prod",
      cwd: "./apps/api",
      script: "start.cjs",
      // start.cjs loads ${API_DIST}/main.js.
      env: { NODE_ENV: "production", PORT: "3011", HOST: "127.0.0.1", API_DIST: apiDist },
      max_memory_restart: "600M",
      time: true,
    },
    {
      name: "salon-web-prod",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      // next.config reads distDir from NEXT_DIST_DIR.
      env: { NODE_ENV: "production", NEXT_DIST_DIR: webDist },
      max_memory_restart: "1G",
      time: true,
    },
  ],
};
