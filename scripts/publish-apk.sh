#!/usr/bin/env bash
# Publishes the `direct` Android APK of a CI run on nobatet.app (apps/android/RELEASING.md, steps 3–5):
# downloads the run's `nobatet-release` artifact, copies the signed nobatet-direct-<n>.apk into APK_DIR
# as nobatet-<n>.apk (served by apps/web /download/[file]), computes its SHA-256 and writes
# apps/web/public/app-version.json. Run on the server, from anywhere in the repo:
#
#   GITHUB_TOKEN=… scripts/publish-apk.sh <run-id> [--name 0.2.0] [--min <versionCode>] [--notes "…"] [--force-unsigned]
#
# <run-id> is the number in the run's URL (…/actions/runs/<run-id>), not the run number; the
# versionCode is that run's run_number. GITHUB_TOKEN (fine-grained, read-only "Actions" on this repo)
# is read from the environment only — never written anywhere, and passed to curl on stdin so it
# doesn't show in `ps`. APK_DIR comes from the environment, else apps/web/.env.production.
set -euo pipefail
cd "$(dirname "$0")/.."

REPO="smnikzad91/appointment_scheduling"
SITE="https://nobatet.app"
VERSION_FILE="apps/web/public/app-version.json"

die() { echo "publish-apk: $*" >&2; exit 1; }

RUN_ID="${1:-}"
[[ "$RUN_ID" =~ ^[0-9]+$ ]] || die "usage: GITHUB_TOKEN=… $0 <run-id> [--name X] [--min N] [--notes TEXT]"
shift
NAME="" MIN="" NOTES="" ALLOW_UNSIGNED=0
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2 ;;
    --min) MIN="$2"; shift 2 ;;
    --notes) NOTES="$2"; shift 2 ;;
    --force-unsigned) ALLOW_UNSIGNED=1; shift ;;
    *) die "unknown option $1" ;;
  esac
done
[ -z "$MIN" ] || [[ "$MIN" =~ ^[0-9]+$ ]] || die "--min must be a versionCode"
[ -n "${GITHUB_TOKEN:-}" ] || die "GITHUB_TOKEN is not set (artifact downloads need a token even on a public repo)"

if [ -z "${APK_DIR:-}" ] && [ -f apps/web/.env.production ]; then
  APK_DIR=$(grep -E '^APK_DIR=' apps/web/.env.production | tail -1 | cut -d= -f2- | tr -d '"'"'"' ')
fi
[ -n "${APK_DIR:-}" ] || die "APK_DIR is not set (env or apps/web/.env.production)"
[ -d "$APK_DIR" ] || die "$APK_DIR does not exist — create it (readable by the web app's user)"

api() { # GET with the token from stdin; extra curl args after the URL
  local url="$1"; shift
  printf 'header = "Authorization: Bearer %s"\n' "$GITHUB_TOKEN" |
    curl -fsSL -K - -H "Accept: application/vnd.github+json" "$@" "$url"
}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "• run $RUN_ID"
api "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID" -o "$TMP/run.json" || die "can't read run $RUN_ID (token / run id?)"
read -r CODE CONCLUSION BRANCH < <(node -e '
  const r = require(process.argv[1]);
  console.log(r.run_number, r.conclusion, r.head_branch);' "$TMP/run.json")
[ "$CONCLUSION" = "success" ] || die "run $RUN_ID concluded '$CONCLUSION', not success"
echo "  versionCode $CODE (branch $BRANCH)"

api "https://api.github.com/repos/$REPO/actions/runs/$RUN_ID/artifacts" -o "$TMP/artifacts.json"
ART_URL=$(node -e '
  const a = require(process.argv[1]).artifacts.find((x) => x.name === "nobatet-release" && !x.expired);
  console.log(a ? a.archive_download_url : "");' "$TMP/artifacts.json")
[ -n "$ART_URL" ] || die "run $RUN_ID has no (unexpired) nobatet-release artifact"
echo "• downloading the release artifact"
# GitHub answers with a redirect to signed storage; curl drops the Authorization header across hosts.
api "$ART_URL" -o "$TMP/release.zip"

SIGNED="nobatet-direct-$CODE.apk"
UNSIGNED="nobatet-direct-$CODE-unsigned.apk"
if unzip -l "$TMP/release.zip" "$SIGNED" >/dev/null 2>&1; then
  SRC="$SIGNED"
elif unzip -l "$TMP/release.zip" "$UNSIGNED" >/dev/null 2>&1; then
  [ "$ALLOW_UNSIGNED" = 1 ] || die "the run only has $UNSIGNED — add the NOBATET_KEYSTORE_* secrets and rebuild (an unsigned APK can't be installed)"
  SRC="$UNSIGNED"
else
  die "no $SIGNED in the artifact (built before the flavors?)"
fi
unzip -p "$TMP/release.zip" "$SRC" > "$TMP/app.apk"
unzip -tq "$TMP/app.apk" >/dev/null || die "$SRC is not a valid APK/zip"

SHA=$(sha256sum "$TMP/app.apk" | cut -d' ' -f1)
SIZE=$(stat -c %s "$TMP/app.apk")
DEST="$APK_DIR/nobatet-$CODE.apk"
if [ -f "$DEST" ]; then
  # a published file is never replaced: phones mid-download and CDN copies would get a different file
  [ "$(sha256sum "$DEST" | cut -d' ' -f1)" = "$SHA" ] || die "$DEST already exists with different contents — never replace a published APK"
  echo "• $DEST already there (same file)"
else
  install -m 644 "$TMP/app.apk" "$DEST.tmp" && mv "$DEST.tmp" "$DEST"
  echo "• copied to $DEST"
fi

node - "$VERSION_FILE" "$CODE" "$SHA" "$SIZE" "$SITE/download/nobatet-$CODE.apk" "$NAME" "$MIN" "$NOTES" <<'EOF'
const fs = require("fs");
const [file, code, sha, size, url, name, min, notes] = process.argv.slice(2);
const v = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
const out = {
  latestVersionCode: Number(code),
  latestVersionName: name || v.latestVersionName || "",
  minVersionCode: min ? Number(min) : v.minVersionCode ?? 1,
  downloadUrl: url,
  apkSha256: sha,
  apkSize: Number(size),
  notes: notes || v.notes || "",
};
if (out.minVersionCode > out.latestVersionCode) throw new Error("minVersionCode above latestVersionCode");
fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
EOF

cat <<EOF

Done: $VERSION_FILE now points at nobatet-$CODE.apk (sha256 $SHA, $SIZE bytes).
Check:  curl -sI $SITE/download/nobatet-$CODE.apk   (200, Content-Length $SIZE)
Then commit + push app-version.json and run \`npm run deploy\`.
Store users read the same file: publish the bazaar/myket builds of run $CODE first (RELEASING.md).
EOF
