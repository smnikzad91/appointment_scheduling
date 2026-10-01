// Digital Asset Links for the Android app (apps/android): lets it open nobatet.app/s/…, /book/…
// and /r/… links itself without the "open with" chooser. ANDROID_CERT_SHA256 lists the signing
// certificates' SHA-256 fingerprints, comma-separated (release key, and the Play app-signing key
// if Google re-signs). Unset → an empty list: the links still work, through the chooser.

export const dynamic = "force-dynamic";

export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: "app.nobatet", sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return Response.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
