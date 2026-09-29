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
# old folder name back into the live file and run `pm2 startOrReload ecosystem.config.cjs --update-env`.
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
rm -rf "apps/api/$api_next"
(cd apps/api && npx tsc -p tsconfig.build.json --outDir "$api_next")
test -f "apps/api/$api_next/main.js"

# Web: next build writes to NEXT_DIST_DIR (next.config distDir) and cleans only that folder.
(cd apps/web && NEXT_DIST_DIR="$web_next" npx next build --turbopack)
test -f "apps/web/$web_next/BUILD_ID"

npm run migrate:deploy -w @appointment-scheduling/database

# Switch: write the live names atomically, then reload (pm2 re-reads ecosystem.config.cjs).
echo "$api_next" > apps/api/.dist-live.tmp && mv apps/api/.dist-live.tmp apps/api/.dist-live
echo "$web_next" > apps/web/.next-live.tmp && mv apps/web/.next-live.tmp apps/web/.next-live
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save
echo "deploy: live api=$api_next web=$web_next"
