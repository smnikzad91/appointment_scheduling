#!/usr/bin/env bash
# Merge a salon owner's account + the salon's only stylist (same person, two phones) into one
# independent stylist. Dry run unless --commit. See merge-into-independent.sql for what changes.
#
#   scripts/data-fixes/merge-into-independent.sh <owner_phone> <stylist_phone> <locations> [--commit]
#   e.g. … 0912xxxxxxx 0935xxxxxxx IN_SALON            (dry run: does it all, then rolls back)
#        … 0912xxxxxxx 0935xxxxxxx IN_SALON,CLIENT_HOME --commit
#
# locations: one or more of IN_SALON, STUDIO, HOME, CLIENT_HOME (comma-separated).
# Before touching anything it writes every affected row as JSON to /root/nobta-backups/ (outside the
# repo: it holds phone numbers). Afterwards the person must sign out and in once — the role is in
# their login token.
set -euo pipefail

OWNER=${1:?owner phone}; STYLIST=${2:?stylist phone}; LOCS=${3:?locations}
COMMIT=off; [[ "${4:-}" == "--commit" ]] && COMMIT=on
[[ "$OWNER" =~ ^09[0-9]{9}$ && "$STYLIST" =~ ^09[0-9]{9}$ ]] || { echo "phones must be 09xxxxxxxxx" >&2; exit 1; }
[[ "$LOCS" =~ ^(IN_SALON|STUDIO|HOME|CLIENT_HOME)(,(IN_SALON|STUDIO|HOME|CLIENT_HOME))*$ ]] || { echo "bad locations: $LOCS" >&2; exit 1; }

DIR=$(cd "$(dirname "$0")" && pwd)
PSQL=(sudo -u postgres psql -d appointment_scheduling -X -q -v ON_ERROR_STOP=1)

BACKUP_DIR=/root/nobta-backups; mkdir -p -m 700 "$BACKUP_DIR"
BACKUP="$BACKUP_DIR/merge-independent-$OWNER-$STYLIST-$(date -u +%Y%m%dT%H%M%SZ).json"
"${PSQL[@]}" -At -v o="$OWNER" -v s="$STYLIST" > "$BACKUP" <<'SQL'
WITH o AS (SELECT * FROM users WHERE phone = :'o'), su AS (SELECT * FROM users WHERE phone = :'s'),
     sa AS (SELECT * FROM salons WHERE "ownerId" IN (SELECT id FROM o)),
     st AS (SELECT * FROM stylists WHERE "userId" IN (SELECT id FROM su))
SELECT json_build_object(
  'takenAt', now(),
  'ownerUser', (SELECT row_to_json(o) FROM o),
  'stylistUser', (SELECT row_to_json(su) FROM su),
  'salon', (SELECT row_to_json(sa) FROM sa),
  'stylist', (SELECT row_to_json(st) FROM st),
  'stylistServices', (SELECT json_agg(ss) FROM stylist_services ss WHERE ss."stylistId" IN (SELECT id FROM st)),
  'completedAppointmentBooks', (SELECT json_agg(json_build_object('id', a.id, 'stylistCommissionPercent', a."stylistCommissionPercent", 'stylistShareToman', a."stylistShareToman"))
                                FROM appointments a WHERE a."stylistId" IN (SELECT id FROM st) AND a.status = 'COMPLETED'),
  'setupTokens', (SELECT json_agg(t) FROM password_setup_tokens t WHERE t."userId" IN (SELECT id FROM su))
);
SQL
chmod 600 "$BACKUP"
echo "backup: $BACKUP"

"${PSQL[@]}" -v owner_phone="$OWNER" -v stylist_phone="$STYLIST" -v locations="{$LOCS}" -v commit="$COMMIT" < "$DIR/merge-into-independent.sql"
