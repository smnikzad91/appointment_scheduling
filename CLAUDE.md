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
     apps/web keeps NextAuth, but its credentials provider calls apps/api's /auth/login
     (src/lib/apiAuth.ts) to verify login rather than checking a DB directly.
   - Data-access split: apps/api owns the salon/booking domain + auth. apps/web owns
     everything else (CMS, finance/wallet, tickets, user profile) via its own Prisma
     client, reading/writing the same Postgres DB directly — no HTTP hop for those.
     Wire format for enums/roles stays lowercase even though Postgres enums are
     uppercase; routes translate at the boundary (see apps/web/CLAUDE.md).
   - PostgreSQL 17 runs locally (cluster `main`, port 5432, db `appointment_scheduling`,
     user/password `postgres`/`postgres`) — set up via `pg_createcluster` (needed sudo,
     which Claude doesn't have passwordless access to, so the user ran that step).
