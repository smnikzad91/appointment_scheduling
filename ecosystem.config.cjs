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

module.exports = {
  apps: [
    {
      name: "salon-api-prod",
      cwd: "./apps/api",
      script: "dist/main.js",
      env: { NODE_ENV: "production", PORT: "3011", HOST: "127.0.0.1" },
      max_memory_restart: "600M",
      time: true,
    },
    {
      name: "salon-web-prod",
      cwd: "./apps/web",
      script: "../../node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      time: true,
    },
  ],
};
