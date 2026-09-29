   # Salon Booking System (Iran)
   - Beauty salon appointment booking, Iranian market; fully Persian UI, RTL everywhere
   - Reference product: easyweek.io
   - Multi-tenant SaaS: many salons register, each with its own stylists, services, and public page
   - Apps: two Android apps (customer, stylist), written in Kotlin
   - Web (Next.js): public salon pages, customer panel, stylist panel, platform-admin panel
   - Database: PostgreSQL

   ## Monorepo layout

   ```
   apps/
     web/                 npm workspace "web" — Next.js app (see apps/web/CLAUDE.md)
                           originally a TailAdmin dashboard for an unrelated MQTT-cloud
                           product; being repurposed as the salon web panel. Fully off
                           MongoDB/Mongoose now — auth calls apps/api, everything else
                           (blog/news/CMS/finance/tickets/user) queries Postgres directly
                           via its own Prisma client (packages/database).
     api/                 npm workspace "api" — NestJS backend, source of truth for the
                           salon domain (salons, stylists, services, appointments).
                           Owns auth (JWT). Postgres via @appointment-scheduling/database.
     android-customer/    (not yet scaffolded) Kotlin/Gradle, customer-facing app
     android-stylist/     (not yet scaffolded) Kotlin/Gradle, stylist-facing app
   packages/
     database/            Prisma schema + generated client (packages/database/prisma/schema.prisma)
     iran-locations/      Iran's 31 provinces → counties (TS, type-strippable like database); salon
                           province/city are validated against it (api) and drive the cascading
                           selects (web). Add a missing county there — nothing else changes.
   archive/
     mqttcloud-legacy/    dead code stripped from apps/web (MQTT broker feature, unrelated
                           to this product) — kept for reference, not wired up
   ```

   - Package manager: npm workspaces (root `package.json`) + Turborepo (`turbo.json`).
     pnpm was considered but skipped — this machine can't symlink into `/usr/bin` without
     root, so npm workspaces (matching apps/web's existing lockfile) was simpler.
   - Auth architecture: apps/api issues JWTs for both Android apps and the web app.
     apps/web keeps NextAuth, but its credentials providers call apps/api's /auth/login
     (password) or /auth/otp/verify (SMS code)
     (src/lib/apiAuth.ts) to verify login rather than checking a DB directly.
   - Data-access split: apps/api owns the salon/booking domain + auth. apps/web owns
     everything else (CMS, finance/wallet, tickets, user profile) via its own Prisma
     client, reading/writing the same Postgres DB directly — no HTTP hop for those.
     Wire format for enums/roles stays lowercase even though Postgres enums are
     uppercase; routes translate at the boundary (see apps/web/CLAUDE.md).
   - PostgreSQL 17 (PGDG apt repo) runs locally: cluster `main`, 127.0.0.1:5432 only,
     db `appointment_scheduling`. Least-privilege roles, passwords only in the gitignored
     `.env` files (mode 600):
     - `salon_migrator` — owns db + schema; used by packages/database for `prisma migrate`
       (CREATEDB is only for migrate dev's shadow DB). New tables must be created by this
       role so default privileges grant DML to the app roles.
     - `salon_web` (apps/web), `salon_api` (apps/api) — SELECT/INSERT/UPDATE/DELETE only,
       no DDL/TRUNCATE, can't touch `_prisma_migrations`, 30s statement timeout.
     - `postgres` superuser has no password: `sudo -u postgres psql` (peer auth) only.
     pg_hba rejects everything else; hardening lives in `/etc/postgresql/17/main/pg_hba.conf`
     and `conf.d/10-security.conf` (originals saved as `*.orig`).
   - Production (dev-iot.ir, this server): `npm run deploy` = `scripts/deploy.sh`: `prisma generate`, build api + web,
     `migrate deploy`, then `pm2 startOrReload ecosystem.config.cjs`. Builds never touch what's live: api builds
     alternate between `apps/api/dist-a|dist-b` (plain `tsc`; `nest build` would wipe `dist/`) and web between
     `apps/web/.next-a|.next-b` (`NEXT_DIST_DIR` → next.config `distDir`); the live names are in
     `apps/api/.dist-live` / `apps/web/.next-live` (gitignored), which ecosystem.config.cjs reads. They're flipped
     only after both builds and the migration succeed, so a failed deploy leaves the site as it was; rollback =
     write the previous folder name back and `pm2 startOrReload ecosystem.config.cjs --update-env`. pm2 apps
     `salon-api-prod` (127.0.0.1:3011) and `salon-web-prod` (127.0.0.1:3010). nginx `/etc/nginx/sites-available/dev-iot.ir`:
     `/backend/*` → api (prefix stripped), everything else → web. HTTPS vhosts on this box listen
     on `127.0.0.1:8444 ssl proxy_protocol` behind a stream SNI router on :443 (shared with xray) —
     never `listen 443` or `certbot --nginx`; certs via `certbot certonly --webroot -w /var/www/html`.
     Web prod env is `apps/web/.env.production` (`NEXT_PUBLIC_*` are baked in at build — rebuild
     after changing them). `next start` doesn't serve public/ files added after it started, so
     new uploads fall back to `app/api/public/uploads/[...path]` via an afterFiles rewrite.

   ## Working agreement
   - Develop on `production`; after any piece of work, commit and push it yourself without asking.
   - The user deploys (`npm run deploy`) themselves; tell them when a change needs a migration or `.env` edit.
