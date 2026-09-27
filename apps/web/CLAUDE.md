# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # next dev --turbopack
npm run build     # Production build (next build --turbopack)
npm run start     # next start
npm run lint      # ESLint
```

No test suite is configured.

## Product

Originally a Persian-language SaaS dashboard template (auth, wallet/finance, CMS, support tickets) based on TailAdmin's Next.js template, built for an unrelated MQTT-cloud product (`mqttcloud.ir`). Being repurposed as the web panel (public salon pages, customer panel, stylist panel, platform-admin panel) for a salon booking SaaS — see the repo root `CLAUDE.md`. The MQTT-specific feature (models, API routes, dashboard/admin pages, live-push context) has been stripped out to `archive/mqttcloud-legacy/`; the auth + wallet + CMS + admin scaffolding remains and is being adapted.

## Stack

- **Next.js 16** App Router + **React 19** + **TypeScript**
- **PostgreSQL** via **Prisma** — schema lives in `packages/database/prisma/schema.prisma` (shared with `apps/api`); `src/lib/prisma.ts` exports the singleton client. MongoDB/Mongoose has been fully removed.
- **NextAuth.js** — credentials provider that calls `apps/api`'s `/auth/login` (via `src/lib/apiAuth.ts`) rather than checking a local DB directly; `apps/api` is the source of truth for authentication and issues the JWT. The credential is an `identifier` (email **or** mobile number — stylists invited by an owner only have a phone). `src/auth.ts` + `src/auth.config.ts`; session carries `id`, `role`, `avatar`, `createdAt`, `apiAccessToken`. `session.user.role` is the API's uppercase role (`PLATFORM_ADMIN` / `SALON_OWNER` / `STYLIST` / `CUSTOMER`) — check against those, not `"admin"`/`"user"`. Every other CMS/finance/support/user route (blog, news, announcements, faq, legal, seo, contact, tickets, finance/wallet, admin users, profile/avatar/password) queries Postgres **directly via Prisma** from within apps/web — no HTTP hop through apps/api for these, since they aren't needed by the Android apps.
- **Tailwind CSS v4** — custom token palette in `src/app/globals.css` (`brand-{25..950}`, dark mode via `.dark` class)
- **AG Grid** (`ag-grid-react`) — used for all admin and user data tables, with custom light/dark `themeQuartz` params
- **Bilingual FA/EN** — `LanguageContext` + `useT()` hook backed by `src/i18n/translations.ts`; RTL is toggled on the `<html>` element

## Wire-format vs. DB enums

Several Prisma enums (`SocialPlatform`, `ContactStatus`, `TicketStatus`, `TicketReplySender`, `DepositStatus`, `LegalPageType`) are uppercase in Postgres, but every CMS/finance/support API route keeps the original lowercase string wire format so existing frontend components needed zero changes. The one role-related holdover is the admin users API (`/api/admin/users/**` + `AdminUsersList`), which still sends `"admin"`/`"user"` for `User.role`, collapsing the four Postgres roles to two. Translate at the route boundary — see `src/app/api/admin/social-links/route.ts` for the pattern. Shared lowercase union types live in `src/types/content.ts`.

`User.phone` is nullable (`String? @unique`) rather than required — Postgres allows multiple `NULL`s under a unique constraint, which is what lets more than one user have "no phone" (matching the old Mongoose sparse-partial-unique-index behavior). Always write `null`, never `""`, when clearing it.

## Salon time

Appointment and time-off times from apps/api are real UTC instants; slots, working hours and the booking date strip are **salon-local wall-clock** time (`Salon.timezone`, `Asia/Tehran` today). Convert only through `src/lib/salonTime.ts` (`salonWallTimeToInstant`, `toSalonWallTime`, `formatSalonDate[Time]`) — never format an API instant with `toLocaleString`/`getHours()` in the browser's or server's own timezone. apps/api mirrors this in `src/availability/salon-time.util.ts`.

## Site identity

Product name, title, description and public origin live in `src/lib/site.ts`. The origin comes from `NEXT_PUBLIC_SITE_URL` (falls back to `http://localhost:3000`) — use `SITE_URL` for canonical URLs, structured data and sitemap entries instead of hardcoding a domain.

## Error logging

Every app writes failures to the shared `ErrorLog` table (`error_logs`), shown at the top of the platform-admin dashboard (`/admin`, `components/admin/AdminErrorLog.tsx`, API under `/api/admin/errors`):
- **apps/api** — global `AllExceptionsFilter` (`src/error-log/`) records unhandled exceptions and any 5xx; expected 4xx are not errors. `main.ts` also records `unhandledRejection`/`uncaughtException`.
- **apps/web server** — `src/instrumentation.ts` (`onRequestError`) records anything Next.js catches. If a route catches an error itself and returns 500, call `logError()` from `src/lib/errorLog.ts` instead of `console.error`.
- **apps/web browser** — `ClientErrorReporter` (root layout) and `app/global-error.tsx` send uncaught errors to the public, rate-limited `POST /api/errors`. Use `reportClientError()` for anything else worth reporting from the client.

Paths are stored without query strings (they can carry phone numbers).

## Route Groups

| Group | Path | Description |
|---|---|---|
| `(home)` | `/` | Salon-product landing page (`components/marketing/*`), incl. the pricing section |
| `(public)` | `/blog`, `/news`, `/faq`, `/contact`, `/privacy`, `/terms` | CMS-backed public pages, no auth required (`/pricing` redirects to `/#pricing`) |
| `s/[slug]` | `/s/:slug` | Public salon page + booking flow (talks to apps/api from the browser) |
| `my-bookings` | `/my-bookings` | Customer bookings; OTP login stored in localStorage (`src/lib/customerSession.ts`), not NextAuth |
| `salon` | `/salon/**` | Salon-owner panel; `SALON_OWNER` only |
| `stylist` | `/stylist/**` | Stylist panel; `STYLIST` only |
| `(user-dashboard)` | `/dashboard/**` | Authenticated user area |
| `(full-width-pages)` | auth pages, error pages | No sidebar |
| `admin` | `/admin/**` | Platform-admin only; every `/api/admin/**` route checks `role === "PLATFORM_ADMIN"` |

Page-level route protection (redirect anonymous users to `/signin`, wrong roles away from `/admin/**`, `/salon/**`, `/stylist/**`) happens in `src/proxy.ts` — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`; it's picked up automatically by filename, not imported anywhere. Every API route still re-checks `session.user.role`/`session.user.id` itself (see API Structure below) since `proxy.ts` only covers page navigation, not fetch/XHR calls to `/api/**`.

## Data Models (`packages/database/prisma/schema.prisma`)

| Model | Key fields |
|---|---|
| `User` | `firstName`, `lastName`, `email?`, `passwordHash`, `role` (Prisma enum, mapped to `admin`/`user` at the wire boundary here), `walletBalance`, `avatarUrl`, `phone?` (nullable+unique) |
| `Card` | User's Iranian bank card — `cardNumber`, `ownerName`, `bankName`, `userId` |
| `AdminCard` | Admin-owned bank card shown to users for deposits |
| `Deposit` | `userId`, `cardId`, `amount`, `receiptImage`, `status`, `adminNote`, `interceptionCode` (generated in route code, no DB computed-default equivalent) |
| `BlogPost` | `slug`, `category`, `title`, `excerpt`, `sections` (`Json` — array of `{heading?, body, image?}`), `hashtags[]`, `readTime`, `highlight`, `published` |
| `NewsItem` | `category`, `hashtags[]`, `title`, `body`, `image?`, `highlight`, `published`, `publishedAt` |
| `Announcement` | Site-wide announcements shown to users |
| `Ticket` / `TicketReply` | User support; replies are now a relational table (not an embedded array) — status transitions (admin reply → `answered`, user reply → reopens to `open`) are applied in a `$transaction` alongside the reply insert |
| `ContactMessage` | Public contact form |
| `BlogCategory` / `NewsTag` / `SocialLink` / `Faq` / `LegalPage` | CMS content |
| `SiteSeo` | Singleton row (fixed `id: "singleton"`) — `title`, `description`, `keywords[]` |

Note: `Salon`, `Stylist`, `Service`, `Appointment`, etc. (the actual salon-booking domain) also live in this same shared Prisma schema but are owned by `apps/api` (NestJS) — apps/web doesn't query those directly.

## Finance Flow

Users deposit wallet credit by:
1. Picking an `AdminCard` to transfer to
2. Uploading a bank receipt image
3. Admin approves/rejects via `/admin/(others-pages)/finance/` — on approval, `walletBalance` is incremented server-side

## Static Content

Blog posts also live as a static array in `src/data/blogPosts.ts`. The seed endpoint `POST /api/admin/blog/seed` reads from this file and inserts missing posts into Postgres. Prefer adding new posts to `blogPosts.ts` first (so they survive a DB reset), then trigger the seed endpoint.

News items are seeded from the inline `seedData` array in `src/app/api/admin/news/seed/route.ts`. Use `category` (not `tag` — legacy field name) when adding new items.

Publishing/updating a `BlogPost`, `NewsItem`, or `Announcement` also posts a message to a Telegram channel via `src/lib/telegram.ts` (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL`, optional `TELEGRAM_PROXY` as a SOCKS agent) — see the `admin/**/notify` routes and the relevant admin `[id]`/base routes.

## API Structure

```
/api/auth/[...nextauth]   NextAuth handlers
/api/auth/register        POST — public user registration
/api/admin/**             All guarded: session.user.role === "PLATFORM_ADMIN"
/api/user/**              All guarded: session.user.id present
/api/public/**            Unauthenticated reads (blog, news, FAQ, pricing…)
/api/upload               Image upload (avatar, receipts, cover images)
```

## Global Contexts (`src/context/`)

- **`ThemeContext`** — light/dark, persisted to `localStorage`, `.dark` class on `<html>`
- **`LanguageContext`** — `"fa"` / `"en"`, sets `dir="rtl"` / `dir="ltr"` on `<html>`; use `useT()` for all UI strings
- **`SidebarContext`** / **`UserSidebarContext`** — collapsed/expanded state for admin and user sidebars

## Adding New Pages

- Public page → `src/app/(public)/your-page/page.tsx`
- User dashboard page → `src/app/(user-dashboard)/dashboard/your-page/page.tsx`
- Admin page → `src/app/admin/(others-pages)/your-page/page.tsx` + add to `AppSidebar.tsx` nav items

## Styling

SVGs are imported as React components via `@svgr/webpack`. All SVG icons are barrel-exported from `src/icons/index.tsx`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
