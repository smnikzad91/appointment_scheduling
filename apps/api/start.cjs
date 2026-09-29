// pm2 entry point for salon-api-prod (ecosystem.config.cjs). The script path pm2 runs must never
// change: `pm2 reload`/`startOrReload` keep an existing process's old script even when the config
// names a new one. So this fixed launcher picks the build folder at every (re)start instead —
// API_DIST (set by ecosystem.config.cjs from .dist-live), else .dist-live, else dist — and loads
// its main.js. The build is ESM ("type": "module"), hence the dynamic import().
const { readFileSync } = require("fs");
const { join } = require("path");
const { pathToFileURL } = require("url");

function liveDist() {
  if (process.env.API_DIST) return process.env.API_DIST;
  try {
    return readFileSync(join(__dirname, ".dist-live"), "utf8").trim() || "dist";
  } catch {
    return "dist";
  }
}

const dist = liveDist();
console.log(`salon-api: starting ${dist}/main.js`);
import(pathToFileURL(join(__dirname, dist, "main.js")).href).catch((err) => {
  console.error(err);
  process.exit(1);
});
