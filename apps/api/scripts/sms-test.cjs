// `npm run sms:test -w api -- 09xxxxxxxxx ["text"]`: runs send-test-sms.js from the build the live
// API uses (the folder named in .dist-live — dist-a or dist-b, see scripts/deploy.sh — else dist/
// on a machine without A/B deploys). It never builds: `nest build` would wipe dist/, and a build
// into dist-a/dist-b is deploy.sh's job only. Run `npm run deploy` (or `npm run build` locally)
// first if the script isn't there yet.
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const root = join(__dirname, "..");
let folder = "dist";
try {
  folder = readFileSync(join(root, ".dist-live"), "utf8").trim() || "dist";
} catch {
  // no A/B deploys here
}
const script = join(root, folder, "scripts", "send-test-sms.js");
if (!existsSync(script)) {
  console.error(`${folder}/scripts/send-test-sms.js not found — build the api first (npm run deploy on the server, npm run build locally).`);
  process.exit(1);
}
const { status } = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
process.exit(status ?? 1);
