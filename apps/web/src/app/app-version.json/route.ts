import { versionInfo } from "@/lib/appReleases/releases";
import { SITE_URL } from "@/lib/site";

// What the Android app checks for updates (it used to be a static file in public/): the highest
// published release, minVersionCode = the highest published mandatory one (or 1). With nothing
// published, the old static values, so existing installs see no dialog. Cached 60 s.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await versionInfo(SITE_URL), { headers: { "Cache-Control": "public, max-age=60" } });
}
