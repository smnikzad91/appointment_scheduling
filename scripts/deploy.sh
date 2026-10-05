#!/usr/bin/env bash
# Production deploy for dev-iot.ir (`npm run deploy`): build both apps, migrate, then switch pm2
# over — without touching what's live until everything has succeeded.
#
# The running apps serve from one of two build folders each (api: dist-a | dist-b, web:
# .next-a | .next-b); the live name is kept in apps/api/.dist-live and apps/web/.next-live, which
# ecosystem.config.cjs reads. Every deploy builds into the *other* folder, so `nest`/`next build`
# never deletes or rewrites files the running processes are using. Only after both builds and the
# migration succeed are the live files flipped and pm2 reloaded. Any failure (set -e) stops here
# and leaves the site exactly as it was. The previous build stays on disk: to roll back, write the
# old folder name back into the live file, run `pm2 startOrReload ecosystem.config.cjs --update-env`,
# then `node scripts/pm2-check.cjs`.
#
# pm2 never applies a changed `script` on reload, so script paths are fixed (the api runs
# apps/api/start.cjs, which loads $API_DIST/main.js) and the folder is passed as env, which
# --update-env does apply. Any process whose running script still differs from the config is
# recreated (a few seconds' downtime for that app), and the result is verified at the end.
set -euo pipefail
cd "$(dirname "$0")/.."

other() { [ "$1" = "$2" ] && echo "$3" || echo "$2"; }
api_live=$(cat apps/api/.dist-live 2>/dev/null || true)
web_live=$(cat apps/web/.next-live 2>/dev/null || true)
api_next=$(other "$api_live" dist-a dist-b)
web_next=$(other "$web_live" .next-a .next-b)
echo "deploy: api ${api_live:-dist} → $api_next, web ${web_live:-.next} → $web_next"

npm run generate -w @appointment-scheduling/database

# API: plain tsc into the idle folder (nest build would first delete its configured outDir, dist/).
# --incremental false: tsconfig's incremental cache (tsconfig.build.tsbuildinfo) lives outside the
# build folders, so after `rm -rf` of a folder it was built into before (a deploy retried after a
# failed migration) tsc would emit only the files it thinks changed — a build missing most modules.
rm -rf "apps/api/$api_next"
(cd apps/api && npx tsc -p tsconfig.build.json --outDir "$api_next" --incremental false)
test -f "apps/api/$api_next/main.js" && test -f "apps/api/$api_next/app.module.js"

# Web: next build writes to NEXT_DIST_DIR (next.config distDir) and cleans only that folder.
# tsconfig includes both folders' generated route types, so the live folder's stale ones would fail
# the type check after a route is deleted. They're only for tsc — `next start` never reads them.
[ -n "$web_live" ] && rm -rf "apps/web/$web_live/types" "apps/web/$web_live/dev/types"
(cd apps/web && NEXT_DIST_DIR="$web_next" npx next build --turbopack)
test -f "apps/web/$web_next/BUILD_ID"

npm run migrate:deploy -w @appointment-scheduling/database

# Switch: write the live names atomically, then reload (pm2 re-reads ecosystem.config.cjs).
echo "$api_next" > apps/api/.dist-live.tmp && mv apps/api/.dist-live.tmp apps/api/.dist-live
echo "$web_next" > apps/web/.next-live.tmp && mv apps/web/.next-live.tmp apps/web/.next-live
for app in $(node scripts/pm2-check.cjs --scripts); do
  echo "deploy: pm2 can't reload $app into ecosystem.config.cjs (script, fork/cluster mode or instance count) — recreating it"
  pm2 delete "$app" 2>/dev/null || true
  pm2 start ecosystem.config.cjs --only "$app"
done
pm2 startOrReload ecosystem.config.cjs --update-env

# Verify the processes really run the new folders; give them a moment to come up.
for i in 1 2 3 4 5 6; do
  node scripts/pm2-check.cjs >/dev/null 2>&1 && break
  sleep 5
done
if ! node scripts/pm2-check.cjs; then
  echo "deploy: ERROR — the running processes don't match api=$api_next web=$web_next (see above)." >&2
  echo "deploy: the live files already point at the new build; fix pm2, or roll back (see top of this file)." >&2
  # The switch has happened: save pm2's process list anyway, so a reboot starts what's configured
  # (ecosystem.config.cjs reads the live files) rather than an older saved list.
  pm2 save || echo "deploy: pm2 save failed too — run \`pm2 save\` once the processes are right." >&2
  exit 1
fi
pm2 save
echo "deploy: live api=$api_next web=$web_next (verified)"
