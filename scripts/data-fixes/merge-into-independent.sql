-- Merge a salon owner's account and the salon's only stylist (the same person, two phone numbers)
-- into one independent stylist (INDEPENDENT_STYLIST, see apps/web/CLAUDE.md «Independent stylists»).
--
-- An independent stylist is a one-person business: a Salon of kind INDEPENDENT, owned by the
-- account, which is also its only Stylist. So nothing is copied and no ids are rewritten:
--   * the salon becomes kind INDEPENDENT (its services, prices, categories, hours, public page,
--     reviews, favourites and plan stay exactly where they are);
--   * the owner account becomes INDEPENDENT_STYLIST;
--   * the existing Stylist row is handed to the owner account (Stylist.userId) — its appointments
--     (past, upcoming, cancelled, with their reminder state), working hours, time off, service
--     links, gallery credits, reviews, payouts, expenses, handle and home-page feature all
--     reference the Stylist id, so they move with it;
--   * the stylist's photo/cover become the account photo and, where the business has none, its
--     logo/cover; every service is linked to the stylist; commission becomes 0% and completed
--     appointments' frozen stylist share 0 (one person: the whole amount is business income);
--   * the stylist's old login is deleted (its row is printed first by the wrapper as a backup).
--
-- Run through scripts/data-fixes/merge-into-independent.sh (dry run by default). Every
-- precondition and result is checked inside the transaction; any failure rolls everything back.
-- Variables: owner_phone, stylist_phone, locations (a ServiceLocation[] literal), commit (on/off).

\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TEMP TABLE m ON COMMIT DROP AS
SELECT o.id AS owner_id, su.id AS stylist_user_id, sa.id AS salon_id, st.id AS stylist_id,
       (SELECT count(*) FROM appointments a WHERE a."stylistId" = st.id) AS appt_count
FROM users o
JOIN salons sa ON sa."ownerId" = o.id
JOIN users su ON su.phone = :'stylist_phone'
JOIN stylists st ON st."userId" = su.id AND st."salonId" = sa.id
WHERE o.phone = :'owner_phone';

-- Lock the rows we change, so a booking or settings save can't slip in between the checks and the updates.
\o /dev/null
SELECT 1 FROM users WHERE id IN (SELECT owner_id FROM m UNION SELECT stylist_user_id FROM m) FOR UPDATE;
SELECT 1 FROM salons WHERE id = (SELECT salon_id FROM m) FOR UPDATE;
SELECT 1 FROM stylists WHERE "salonId" = (SELECT salon_id FROM m) FOR UPDATE;
\o

-- ── Preconditions ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r m%ROWTYPE; n int;
BEGIN
  SELECT count(*) INTO n FROM m;
  IF n <> 1 THEN RAISE EXCEPTION 'expected exactly one owner/salon/stylist match, found %', n; END IF;
  SELECT * INTO r FROM m;
  IF (SELECT role FROM users WHERE id = r.owner_id) <> 'SALON_OWNER' THEN RAISE EXCEPTION 'owner account is not SALON_OWNER'; END IF;
  IF (SELECT role FROM users WHERE id = r.stylist_user_id) <> 'STYLIST' THEN RAISE EXCEPTION 'stylist account is not STYLIST'; END IF;
  IF (SELECT count(*) FROM salons WHERE "ownerId" = r.owner_id) <> 1 THEN RAISE EXCEPTION 'owner owns more than one salon'; END IF;
  IF (SELECT kind FROM salons WHERE id = r.salon_id) <> 'SALON' THEN RAISE EXCEPTION 'salon is already %', (SELECT kind FROM salons WHERE id = r.salon_id); END IF;
  IF (SELECT count(*) FROM stylists WHERE "salonId" = r.salon_id) <> 1 THEN RAISE EXCEPTION 'salon has other stylists — an independent stylist works alone'; END IF;
  IF EXISTS (SELECT 1 FROM stylists WHERE "userId" = r.owner_id) THEN RAISE EXCEPTION 'owner already has a stylist profile'; END IF;
  -- the old login must have nothing of its own left once the stylist row moves (else: delete would fail anyway)
  IF EXISTS (SELECT 1 FROM appointments WHERE "customerId" = r.stylist_user_id)
     OR EXISTS (SELECT 1 FROM salons WHERE "ownerId" = r.stylist_user_id)
     OR EXISTS (SELECT 1 FROM tickets WHERE "userId" = r.stylist_user_id)
     OR EXISTS (SELECT 1 FROM deposits WHERE "userId" = r.stylist_user_id)
     OR EXISTS (SELECT 1 FROM cards WHERE "userId" = r.stylist_user_id) THEN
    RAISE EXCEPTION 'stylist account has its own customer/wallet/ticket data — not deleting it';
  END IF;
END $$;

-- ── Changes ──────────────────────────────────────────────────────────────────────────────────
-- 1. The business: independent, working where given; the stylist's photos fill a missing logo/cover.
UPDATE salons sa SET
  kind = 'INDEPENDENT',
  "serviceLocations" = :'locations'::"ServiceLocation"[],
  "logoUrl" = COALESCE(sa."logoUrl", st."avatarUrl"),
  "coverImageUrl" = COALESCE(sa."coverImageUrl", st."coverImageUrl"),
  "updatedAt" = now()
FROM m, stylists st
WHERE sa.id = m.salon_id AND st.id = m.stylist_id;

-- 2. The account: independent stylist, with the stylist's photo (the account photo mirrors it).
UPDATE users u SET role = 'INDEPENDENT_STYLIST', "avatarUrl" = COALESCE(st."avatarUrl", u."avatarUrl"), "updatedAt" = now()
FROM m, stylists st WHERE u.id = m.owner_id AND st.id = m.stylist_id;

-- 3. The stylist profile (and everything hanging off it) now belongs to that account; no split.
UPDATE stylists SET "userId" = m.owner_id, "commissionPercent" = 0, active = true
FROM m WHERE stylists.id = m.stylist_id;
UPDATE stylist_services SET "commissionPercent" = NULL FROM m WHERE stylist_services."stylistId" = m.stylist_id;

-- 4. Every service of the business is theirs (an independent stylist offers all of them).
INSERT INTO stylist_services ("stylistId", "serviceId")
SELECT m.stylist_id, s.id FROM m JOIN services s ON s."salonId" = m.salon_id
WHERE NOT EXISTS (SELECT 1 FROM stylist_services ss WHERE ss."stylistId" = m.stylist_id AND ss."serviceId" = s.id);

-- 5. Past books: one person, so the whole amount (tip included) is business income, as for any
--    independent stylist (apps/api accounting keeps stylistShareToman 0 for them).
UPDATE appointments a SET "stylistCommissionPercent" = 0, "stylistShareToman" = 0, "updatedAt" = now()
FROM m WHERE a."stylistId" = m.stylist_id AND a.status = 'COMPLETED';

-- 6. The old login: its one-time setup links go with it (cascade), its unused SMS codes too.
DELETE FROM otp_codes WHERE phone = :'stylist_phone';
DELETE FROM users u USING m WHERE u.id = m.stylist_user_id;

-- ── Result checks ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE r m%ROWTYPE;
BEGIN
  SELECT * INTO r FROM m;
  IF (SELECT role FROM users WHERE id = r.owner_id) <> 'INDEPENDENT_STYLIST' THEN RAISE EXCEPTION 'check: owner role'; END IF;
  IF (SELECT kind FROM salons WHERE id = r.salon_id) <> 'INDEPENDENT'
     OR cardinality((SELECT "serviceLocations" FROM salons WHERE id = r.salon_id)) = 0 THEN RAISE EXCEPTION 'check: salon kind/locations'; END IF;
  IF (SELECT count(*) FROM stylists WHERE "salonId" = r.salon_id) <> 1
     OR (SELECT "userId" FROM stylists WHERE id = r.stylist_id) <> r.owner_id
     OR (SELECT "commissionPercent" FROM stylists WHERE id = r.stylist_id) <> 0 THEN RAISE EXCEPTION 'check: stylist row'; END IF;
  IF (SELECT count(*) FROM appointments WHERE "stylistId" = r.stylist_id) <> r.appt_count THEN RAISE EXCEPTION 'check: appointment count changed'; END IF;
  IF EXISTS (SELECT 1 FROM services s WHERE s."salonId" = r.salon_id AND NOT EXISTS
       (SELECT 1 FROM stylist_services ss WHERE ss."stylistId" = r.stylist_id AND ss."serviceId" = s.id)) THEN RAISE EXCEPTION 'check: unlinked service'; END IF;
  IF EXISTS (SELECT 1 FROM appointments WHERE "stylistId" = r.stylist_id AND status = 'COMPLETED' AND "stylistShareToman" <> 0) THEN RAISE EXCEPTION 'check: stylist share'; END IF;
  IF EXISTS (SELECT 1 FROM users WHERE id = r.stylist_user_id) THEN RAISE EXCEPTION 'check: old login still there'; END IF;
END $$;

-- What it looks like now
SELECT u.phone, u.role, sa.name AS business, sa.kind, sa."serviceLocations", st."displayName" AS stylist, st."commissionPercent",
       (SELECT count(*) FROM appointments a WHERE a."stylistId" = st.id) AS appointments,
       (SELECT count(*) FROM stylist_services ss WHERE ss."stylistId" = st.id) AS services_linked,
       sa."logoUrl" IS NOT NULL AS logo, sa."coverImageUrl" IS NOT NULL AS cover
FROM m JOIN users u ON u.id = m.owner_id JOIN salons sa ON sa.id = m.salon_id JOIN stylists st ON st.id = m.stylist_id;

SELECT CASE WHEN :'commit' = 'on' THEN 'COMMIT' ELSE 'ROLLBACK (dry run — nothing changed; pass --commit to apply)' END AS outcome \gset
\echo :outcome
SELECT :'commit' = 'on' AS do_commit \gset
\if :do_commit
COMMIT;
\else
ROLLBACK;
\endif
