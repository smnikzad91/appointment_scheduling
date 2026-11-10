# Prompt: build nodepass.ir — card-to-card payment confirmation by bank SMS

> Paste everything below into a fresh Claude Code session started in an empty folder
> (e.g. `/root/projects/nodepass.ir`). It is self-contained.

---

You are building **nodepass.ir**, a small multi-tenant service that confirms Iranian **card-to-card
(کارت به کارت)** payments automatically by reading the bank's deposit SMS. Today this lives inside
another product (nobatet.app, a salon booking platform); we are splitting it out so several of our
projects ("merchants") can use it through an HTTP API. UI is **Persian, RTL**, Tehran time.

## 1. How it works (the core idea)

1. A merchant (e.g. nobatet.app, mychatbot.ir) calls `POST /v1/payments` with an amount in toman.
2. nodepass picks one of its bank accounts, adds a random **1–1000 rial offset** so the exact rial
   amount is unique among that account's pending payments, creates a short **tracking code**, and
   returns: card number + owner name + bank name, the exact payable rial amount, tracking code,
   expiry (default 30 min).
3. The merchant shows that to its customer, who transfers exactly that amount to the card.
4. A **GSM agent** (Node.js on a BeagleBone Black with one or more SIM800C modems, each modem holding
   the SIM of one bank account) receives the bank's deposit SMS and forwards it, signed, to nodepass.
5. nodepass parses the SMS with the bank's template, finds the PENDING payment **of that account** with
   exactly that rial amount, marks it PAID, and notifies the merchant (signed webhook + pollable API).
6. Anything that can't be matched is kept UNMATCHED for an admin (or the merchant) to match by hand.

## 2. Stack and layout

- **Node 20+, TypeScript, Next.js (App Router)** for both the API (`app/api/v1/**`, `app/api/agent/**`)
  and the admin panel; **PostgreSQL + Prisma**; Tailwind; font Vazirmatn; `dir="rtl"`, `lang="fa"`.
- One npm repo with two parts:
  ```
  web/      Next.js app (API + admin panel + public payment status page)
  agent/    the GSM agent — plain Node 18 ESM (.mjs), **zero npm dependencies**
  ```
- Money is **BigInt rial** in the DB (`payableRial`, `amountRial`, `balanceRial`); merchant-facing
  amounts are toman `Int` plus the rial fields as strings in JSON.
- Write `CLAUDE.md` describing the architecture as you go, and `README.md` files for `web/` and `agent/`.
- Tests with `node --test` (TS via type stripping or tsx): template parser, offset picker, tracking code,
  matching rules, signatures, PDU decoding, multi-part assembly, multi-modem agent logic.

## 3. Data model (Prisma)

- `Merchant` — name, slug, `apiKeyHash` (sha256; keys look like `np_live_<32 random>` and are shown once,
  rotatable, allow two active keys during rotation), `webhookUrl`, `webhookSecret`, optional
  `allowedIps`, `active`, default `ttlMinutes`, min/max amount.
- `BankProfile` — one bank's SMS format, shared by all its accounts: `bankName`, `senders` (list; the
  SMS sender id(s) the bank uses), `template` (see §5). **Today all accounts are the same bank and the
  same template**, so there will be one profile, but keep it a table so another bank can be added later.
- `BankAccount` — `cardNumber` (unique, 16 digits, Luhn-checked), `ownerName`, `iban?`, `bankProfileId`,
  `active`, optional `dailyCapRial`, `lastBalanceRial` (from the latest SMS), `note`.
- `Device` — one agent board: `id` (e.g. `bbb-1`), `secretHash` or encrypted secret (needed for HMAC
  verification — store it encrypted with a server key), `lastSeenAt`, `info Json`.
- `Modem` — one GSM module on a device: `id` (`<deviceId>/<modemName>`), `deviceId`, `bankAccountId`
  (the SIM in it belongs to this account; set in the admin panel, **not** in the agent config),
  `simNumber?`, `lastSeenAt`, `signal`, `registered`, `simStatus`, `queueLength`, `info Json`.
- `Payment` — `merchantId`, `merchantRef` (the merchant's order id; unique per merchant → idempotent
  create), `bankAccountId`, `amountToman`, `offsetRial`, `payableRial`, `trackingCode` (unique),
  `status` PENDING | PAID | EXPIRED | CANCELLED, `expiresAt`, `paidAt`, `paidRial`, `bankSmsId?`,
  `matchedBy` AUTO | ADMIN | MERCHANT, `customerHint?` (optional name/phone the merchant passes),
  `metadata Json?`, `createdAt`. **Partial unique index** on `(bankAccountId, payableRial) WHERE
  status = 'PENDING'` (raw SQL in the migration) so two pending payments can never share an amount.
- `BankSms` — `hash` (unique; dedupe), `deviceId`, `modemId`, `bankAccountId?`, `sender`, `body`,
  `receivedAt`, `amountRial?`, `balanceRial?`, `status` MATCHED | UNMATCHED | NOT_DEPOSIT | IGNORED,
  `paymentId?` (unique), `note`.
- `WebhookDelivery` — `paymentId`, `event`, `attempt`, `status`, `responseCode`, `nextAttemptAt`,
  `lastError`.
- `AdminUser` — email + password (bcrypt) + optional TOTP; plus an audit log `AuditLog` of every
  manual match / ignore / account or merchant change.

## 4. Allocation rules

- **Account choice:** among `active` accounts whose modem has a heartbeat in the last 10 min and whose
  `dailyCapRial` isn't reached, pick the one with the fewest PENDING payments (ties: random). If none
  is online, still fall back to any active account but log a warning (an SMS that arrives late still
  matches). If no account at all → `503 {error: "no_account"}`.
- **Offset:** random integer 1–1000 rial not used by another PENDING payment of that account with the
  same base amount (`amountToman*10 + offset`); if all 1000 are taken, try the next account. Create
  inside a transaction and retry on the unique-index violation.
- **Tracking code:** 6 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O/1/I/L), unique,
  shown to the customer and searchable everywhere ("کد پیگیری"). The merchant can show it; support can
  look a payment up by it; `https://nodepass.ir/p/<trackingCode>` is a public status page (amount,
  card, countdown, paid/expired — no customer data).
- The offset belongs to the customer: `paidRial` is what the SMS says; the merchant decides what to
  credit (nobatet credits `payableRial / 10` toman).
- A background job (every minute) turns PENDING payments past `expiresAt` into EXPIRED.

## 5. SMS template and matching

- Template placeholders: `{amount}` (required, rial), `{balance}`, `{card}`, `{date}`, `{time}`,
  `{*}` (anything). Normalise before matching: Persian/Arabic digits → ASCII, `ي/ك` → `ی/ک`, ZWNJ and
  repeated whitespace, thousands separators (`,` `٬` `،`). Build a regex from the template; a body
  that doesn't fit → `NOT_DEPOSIT` (withdrawals, ads, OTPs).
- Admin page has a **template tester**: paste a sample SMS, see the extracted fields.
- **Matching an incoming SMS:**
  1. dedupe by hash of `modemId + sender + body + receivedAt(minute)`; a resend returns `duplicate`.
  2. the modem gives the bank account (no guessing between cards); check the sender is in the
     profile's `senders` (else store NOT_DEPOSIT with a note).
  3. parse; update `lastBalanceRial` if `{balance}` exists.
  4. find the PENDING payment of **that account** with `payableRial = amount`, created ≤ SMS time +
     2 min, and not expired more than 15 min before the SMS time (late SMS grace).
  5. conditional update `PENDING → PAID` in one transaction (so it can never be paid twice), link the
     SMS, enqueue the webhook. No match → UNMATCHED.
- Manual match (admin or merchant): an UNMATCHED SMS of the same account, received after the payment
  was created, to a PENDING/EXPIRED/CANCELLED payment → PAID with `matchedBy`. Errors as `409`:
  `sms_taken`, `payment_taken`, `sms_mismatch`.

## 6. Merchant API (`/v1`, `Authorization: Bearer np_live_…`)

All JSON, errors `{error: "<code>", message: "<Persian text>"}`. Rate limit per key (e.g. 60/min).

- `POST /v1/payments` `{amountToman, merchantRef, ttlMinutes?, customerHint?, metadata?}` →
  `201 {id, trackingCode, status, amountToman, offsetRial, payableRial, card: {number, ownerName,
  bankName}, expiresAt, statusUrl}`. Same `merchantRef` again → the existing payment (`200`).
- `GET /v1/payments/:id`, `GET /v1/payments/by-ref/:merchantRef`, `GET /v1/payments/by-code/:trackingCode`.
- `POST /v1/payments/:id/cancel` (PENDING only — frees the amount).
- `GET /v1/unmatched-sms?since=` — UNMATCHED deposits of the last 72 h on accounts that had this
  merchant's payments (amount, time, card last 4, id; never other merchants' data).
- `POST /v1/payments/:id/match` `{smsId}`.
- **Webhook** on `payment.paid` / `payment.expired` / `payment.cancelled`: `POST webhookUrl` with the
  payment JSON, headers `X-Nodepass-Timestamp` (ms) and `X-Nodepass-Signature` = hex
  HMAC-SHA256(webhookSecret, "<timestamp>.<raw body>"); merchant must verify ±5 min. Retry with
  backoff (10 s, 1 m, 5 m, 30 m, 2 h, 6 h) until 2xx; the admin can resend.
- Ship a tiny **client snippet** in the README (TypeScript: create payment, verify webhook) so
  merchants integrate in minutes.

## 7. Agent API (`/api/agent`, called by the boards)

- Every request: headers `X-Device-Id`, `X-Timestamp` (ms), `X-Signature` = hex
  HMAC-SHA256(deviceSecret, "<timestamp>.<raw body>"), ±5 min, constant-time compare.
- `POST /api/agent/messages` `{modemId, sender, body, receivedAt, parts}` → `200 {result:
  "accepted" | "duplicate"}` (only a 200 lets the agent delete the SMS from the SIM). A modemId the
  server doesn't know yet is auto-created (unassigned) and its SMS stored UNMATCHED with a note, so
  the admin sees a new modem and assigns its bank account.
- `POST /api/agent/heartbeat` `{agentVersion, uptime, modems: [{modemId, serial, signal, registered,
  operator, simStatus, simUsed, simTotal, queue, lastSmsAt, lastError, restarts}]}`.

## 8. The GSM agent (`agent/`) — **one process, many modems**

Requirements: **several SIM800C modules on one board, each with the SIM of a different bank account,
all of the same bank and SMS template.** The agent stays bank-agnostic: it only forwards SMS with the
modem id; the server knows which account a modem belongs to and how to parse it.

Port the existing single-modem agent (proven in production; I'll paste its `src/*.mjs` — `pdu.mjs`
PDU/UCS2 decoding, `assemble.mjs` multi-part joining, `modem.mjs` AT command queue over a raw
`stty` serial file, `store.mjs` on-disk outbox, `sign.mjs` HMAC) and make it multi-modem:

- Config file `/etc/nodepass-agent.json` (chmod 600), not env vars:
  ```json
  {
    "server": "https://nodepass.ir",
    "deviceId": "bbb-1",
    "deviceSecret": "…",
    "dataDir": "/var/lib/nodepass-agent",
    "modems": [
      { "name": "m1", "serial": "/dev/ttyS1", "baud": 115200, "pwrkeyGpio": 60 },
      { "name": "m2", "serial": "/dev/ttyS2", "baud": 115200, "pwrkeyGpio": 48 },
      { "name": "m3", "serial": "/dev/serial/by-path/platform-…-usb-0:1.2:1.0-port0", "baud": 115200 }
    ]
  }
  ```
  `modemId = "<deviceId>/<name>"`. Recommend `/dev/serial/by-path/…` for USB-serial adapters (stable
  across reboots, unlike `/dev/ttyUSB*`). BeagleBone has UART1/2/4/5 (`ttyS1/2/4/5`, enabled with
  overlays in `/boot/uEnv.txt`) → up to 4 modems on UARTs, more through a powered USB hub.
- Each modem runs as its **own independent worker** (async loop with its own AT queue, `+CMTI`
  handling, 1-min `AT+CMGL=4` sweep, outbox dir `dataDir/<name>/outbox`, parts store, timeout and
  SIM-error counters). A modem that hangs or loses its SIM is reset **alone** (PWRKEY pulse, close and
  reopen the port, re-init with backoff up to 5 min) — it must never stop or restart the others. Only
  an unrecoverable process error exits (systemd restarts the whole agent).
- Shared: one sender loop that drains all outboxes oldest-first with backoff when offline; SIM slots
  deleted only after a 200; one heartbeat every 5 min listing every modem (also modems that are down,
  with their last error).
- On start, log each modem's IMSI/ICCID (`AT+CIMI`, `AT+CCID`) and include them in the heartbeat so the
  admin can tell which SIM is in which slot; warn when two modems report the same ICCID.
- Hardware notes in the README: each SIM800C needs its **own 4 V / 2 A** supply (2 A bursts), common
  ground, level-shifting to 3.3 V, short wires; staggered power-up.
- `deploy/nodepass-agent.service` (systemd, user `nodepass` in group `dialout`), `deploy/run.sh` for
  boards without systemd, `deploy/config.example.json`. Clock must be NTP-synced (signature window).
- `agent/tools/sim.mjs`: a simulator that fakes N modems over pseudo-terminals (`socat`) or an in-memory
  transport, used by the tests (two modems, one hanging, check the other keeps forwarding).

## 9. Admin panel (Persian, RTL)

Login (+ optional TOTP). Pages:
- **داشبورد** — today's paid count/sum per account and per merchant, pending now, unmatched count,
  devices/modems online status (green < 10 min, red otherwise).
- **پرداخت‌ها** — list with filters (status, merchant, account, date, amount, tracking code), detail
  with timeline and webhook deliveries (resend button), cancel, manual match.
- **پیامک‌ها** — all received SMS with status/account/modem filters; UNMATCHED ones get «تطبیق»
  (choose a payment of that account with near amount/time) or «نادیده».
- **حساب‌ها** — bank accounts (add/edit/deactivate, last balance, daily cap) and bank profiles (senders,
  template + tester).
- **دستگاه‌ها** — devices and their modems: signal, SIM, queue, last SMS, assign a modem to an account,
  create a device and show its secret once.
- **پذیرندگان** — merchants: API keys (create/rotate/revoke), webhook URL/secret, test webhook.
- **گزارش تغییرات** — the audit log.
Alerts by SMS (notifycloud.ir — I'll give the API docs/key; env `SMS_API_KEY`, `ALERT_PHONE`) when a
modem has been offline 15 min, a webhook keeps failing for 1 h, or an UNMATCHED deposit arrives.
Optional: forward every deposit SMS text to `FORWARD_PHONE`.

## 10. Security

- API keys and device secrets never logged; keys stored hashed; device secrets encrypted at rest
  (`DATA_KEY` env, AES-256-GCM).
- Card numbers are returned only to authenticated merchants and on the public status page of a
  payment (that's what the customer needs). Merchants never see other merchants' payments or SMS.
- All admin actions audited; admin session cookies httpOnly + secure + sameSite=lax; CSRF on forms.
- Postgres roles: a migrator role owning the schema and an app role with DML only.
- Input validation with zod on every route; amounts min 10,000 toman, max configurable.

## 11. Deployment (same server as nobatet: Ubuntu, nginx, pm2, PostgreSQL 17, Cloudflare)

- pm2 app `nodepass-web` on `127.0.0.1:<free port>`; deploy script = install, `prisma generate`,
  build, `prisma migrate deploy`, `pm2 startOrReload`.
- nginx: HTTPS vhosts on this server listen on `127.0.0.1:8444 ssl proxy_protocol` behind an SNI router
  on :443 — **never** `listen 443` or `certbot --nginx`; certs via
  `certbot certonly --webroot -w /var/www/html`. The visitor IP comes from Cloudflare's
  `CF-Connecting-IP` only when `$proxy_protocol_addr` is a Cloudflare range — copy the pattern from
  nobatet's vhost.
- Agents talk to `https://nodepass.ir/api/agent/*`; if Cloudflare is in front, make sure its WAF/bot
  rules don't challenge them.

## 12. Migration from nobatet (do after nodepass works)

- nobatet becomes merchant #1: its wallet top-up screen calls `POST /v1/payments` instead of picking a
  card itself, and a webhook endpoint credits the wallet on `payment.paid`. mychatbot.ir becomes
  merchant #2 and calls nodepass directly instead of nobatet's `/api/external/top-ups`.
- Run both side by side: point the BeagleBone at nodepass only when nobatet has switched; import the
  existing card + template (sender, template text) into a `BankProfile` + `BankAccount`.
- Write the switch-over steps in `docs/migration-from-nobatet.md`.

## Deliverables / order of work

1. Prisma schema + migrations (incl. the partial unique index), template parser + tests.
2. Merchant API + payments logic + expiry job + tests.
3. Agent API + SMS ingestion/matching + tests.
4. Webhooks with retries.
5. Admin panel, public status page.
6. Multi-modem agent + simulator tests + README/systemd.
7. Deploy script, nginx sample, CLAUDE.md, READMEs, client snippet.

Ask me before choosing anything not covered here (ports, domain DNS, notifycloud docs). Commit after
each step.
