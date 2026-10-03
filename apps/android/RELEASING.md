# Releasing the Android app

Three builds come out of every CI run (`.github/workflows/android.yml`, artifact **nobatet-release**),
one per `distribution` flavor, all with the same `applicationId` (`app.nobatet`) and the same version:

| File | Where it goes | Updates |
|---|---|---|
| `nobatet-direct-<n>.apk` | nobatet.app (`/download/nobatet-<n>.apk`) | in-app: download → SHA-256 check → installer |
| `nobatet-bazaar-<n>.aab` / `.apk` | Cafe Bazaar | the button opens the Bazaar page |
| `nobatet-myket-<n>.aab` / `.apk` | Myket | the button opens the Myket page |

`<n>` = the run number = `versionCode`. A `-unsigned` suffix means the repo has no signing secrets yet:
those files can't be installed or published. `SHA256SUMS` lists every file's hash.
Only the direct build declares `REQUEST_INSTALL_PACKAGES`: both stores forbid an app updating itself
outside the store.

## Signing (once, before the first release)

Android only installs an update that is signed with **the same key** as the installed app.

1. Create the key, once: `keytool -genkeypair -v -keystore release.jks -alias nobatet -keyalg RSA -keysize 4096 -validity 10000`
2. Add repo secrets: `NOBATET_KEYSTORE_BASE64` (`base64 -w0 release.jks`), `NOBATET_KEYSTORE_PASSWORD`,
   `NOBATET_KEY_ALIAS`, `NOBATET_KEY_PASSWORD`.
3. **Keep `release.jks` and its passwords safe and backed up, outside the repo.** If you lose them, no
   installed copy can ever be updated again (on the site or in the stores). Users would have to
   uninstall, and their sign-in on the phone is lost.
4. Always release builds from CI with this key. Never publish a debug APK: a debug build (debug key)
   can't be updated to a release build, and the reverse doesn't work either. The tester has to
   uninstall first. The app's update sheet says so when the installer refuses.
5. Put the release certificate's SHA-256 (it shows on the run page) into `ANDROID_CERT_SHA256` in
   `apps/web/.env.production` (needed for app links).

## Publishing a version on nobatet.app

1. **Pick the CI run.** Actions → *Android* → a green run on `android-app`. Note its **run id** (the
   number in the URL, `…/actions/runs/<run-id>`) and its **run number** `#<n>`, which is the versionCode.
2. **Download the signed direct APK** from the run's artifact `nobatet-release`:
   `nobatet-direct-<n>.apk` (not `-unsigned`).
3. **Copy it to the server** as `nobatet-<n>.apk` in `APK_DIR` (`/var/lib/nobatet/apk`, set in
   `apps/web/.env.production`; the folder must be readable by the web app's user).
   Never replace a file that is already published. Each build has its own name.
4. **Compute the SHA-256**: `sha256sum /var/lib/nobatet/apk/nobatet-<n>.apk` and `stat -c %s` for the size.
5. **Update `apps/web/public/app-version.json`** and deploy:
   ```json
   {
     "latestVersionCode": <n>,
     "latestVersionName": "0.2.0",
     "minVersionCode": 1,
     "downloadUrl": "https://nobatet.app/download/nobatet-<n>.apk",
     "apkSha256": "<lowercase hex from step 4>",
     "apkSize": <bytes>,
     "notes": "…"
   }
   ```
   Commit, push, then `npm run deploy`. Check it: `curl -sI https://nobatet.app/download/nobatet-<n>.apk`
   should return 200 with the right `Content-Length`.

Steps 3–5 in one go, on the server (the token needs read access to Actions on this repo; it is taken
from the environment only and never stored):

```sh
GITHUB_TOKEN=github_pat_… scripts/publish-apk.sh <run-id> --name 0.2.0 --notes "…"   # [--min <versionCode>]
```

Rules for `app-version.json`:
- `latestVersionCode` must be the run number of the APK at `downloadUrl`.
- `apkSha256` must be the hash of that exact file. Without it the app won't install in-app and opens
  `downloadUrl` in the browser instead. A wrong hash makes every download fail with «فایل دریافتی سالم نیست».
- Raise `minVersionCode` only when old builds really can't work any more (for example, an API change).
  Everyone below it is blocked until they update.

## Store releases

Upload `nobatet-bazaar-<n>.aab` (or `.apk`) in the Bazaar developer panel and `nobatet-myket-<n>` in
Myket's. Use the same key as the direct build, so users can move between channels.
**The store builds read the same `app-version.json`.** Raise `latestVersionCode`, and especially
`minVersionCode`, only once the store versions are live. Otherwise store users get an update prompt
that opens a store page with nothing new (Bazaar normally publishes updates 1–3 hours after upload,
longer when review is needed).

## Rolling back

Put the previous values back in `app-version.json` and deploy. Leave the APK files in place. A phone
that already installed the newer build keeps it: Android doesn't install a lower versionCode over a
higher one.

## Checking an update by hand

1. `latestVersionCode` = the installed build's: no sheet.
2. Installed build + 1, with the real APK and hash: the sheet shows, progress moves, the first time the
   «نصب از منابع ناشناس» screen opens, then the installer. After the update you're still signed in.
3. A wrong `apkSha256`: «فایل دریافتی سالم نیست»; the file is deleted and the installer doesn't open.
4. `minVersionCode` above the installed build: the sheet can't be closed (swipe, back, tap outside).
5. Network off mid-download: the sheet says it's waiting for the connection and offers «تلاش دوباره»;
   «بعداً» closes an optional update and the app works normally.
6. Bazaar build: the button opens Bazaar. `aapt dump permissions nobatet-bazaar-<n>.apk` shows no
   `REQUEST_INSTALL_PACKAGES`.
