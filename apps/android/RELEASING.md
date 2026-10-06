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

Releases are uploaded and published from the admin panel: **/admin/app-releases** («نسخه‌های اپ»).
`/app-version.json` and the `/download-app` page are built from the published releases, so there is
no file to edit and nothing to deploy.

1. **Pick the CI run.** Actions → *Android* → a green run on `android-app`. Its **run number** `#<n>`
   is the versionCode.
2. **Download the signed direct APK** from the run's artifact `nobatet-release`:
   `nobatet-direct-<n>.apk` (not `-unsigned`).
3. **Upload it** at /admin/app-releases. Fill in:
   - **version name** and **build number** (= `<n>`). Both must match what's inside the APK.
   - **اختیاری / اجباری**. Mandatory makes this build the minimum: older builds can't be used until they update.
   - **release notes**. They show in the update sheet, on /download-app and in the version history.
   - **انتشار فوری**, or leave it off and publish later from the table.

   The server reads the APK itself and refuses it when the package isn't `app.nobatet`, the
   versionCode was already uploaded or isn't above the latest published one, or the signature isn't
   `ANDROID_CERT_SHA256`. It stores the file as `nobatet-<n>.apk` in `APK_DIR`, outside the repo, and
   records its SHA-256 and size. The limit is 150 MB.
4. **Check it**: `curl -s https://nobatet.app/app-version.json` should show `latestVersionCode` = `<n>`
   with its `apkSha256`. `curl -sI https://nobatet.app/download/nobatet-<n>.apk` should return 200.

What `/app-version.json` serves:
- The latest version is the highest published release. `downloadUrl`, `apkSha256` and `apkSize`
  come from that release's row.
- `minVersionCode` is the highest published **mandatory** release, else 1.
- Make a release mandatory only when old builds really can't work any more (for example, an API
  change). Everyone below it is blocked until they update.

(`scripts/publish-apk.sh` predates the admin page. It still writes the old static
`apps/web/public/app-version.json`, which is no longer served. Use the admin page instead.)

## Store releases

Upload `nobatet-bazaar-<n>.aab` (or `.apk`) in the Bazaar developer panel and `nobatet-myket-<n>` in
Myket's. Use the same key as the direct build, so users can move between channels.
**The store builds read the same `/app-version.json`.** Publish a release on /admin/app-releases,
and especially a mandatory one, only once the store versions are live. Otherwise store users get an update prompt
that opens a store page with nothing new (Bazaar normally publishes updates 1–3 hours after upload,
longer when review is needed).

## Rolling back

Unpublish the bad release on /admin/app-releases. The previous published release becomes the latest
again. Unpublished releases can be deleted (the row and the file). A phone that already installed the
newer build keeps it: Android doesn't install a lower versionCode over a higher one.

## Checking an update by hand

1. The latest published release is the installed build: no sheet.
2. A newer published release: the sheet shows, progress moves, the first time the
   «نصب از منابع ناشناس» screen opens, then the installer. After the update you're still signed in.
3. A download whose hash doesn't match: «فایل دریافتی سالم نیست»; the file is deleted and the installer doesn't open.
4. A newer **mandatory** release: the sheet can't be closed (swipe, back, tap outside).
5. Network off mid-download: the sheet says it's waiting for the connection and offers «تلاش دوباره»;
   «بعداً» closes an optional update and the app works normally.
6. Bazaar build: the button opens Bazaar. `aapt dump permissions nobatet-bazaar-<n>.apk` shows no
   `REQUEST_INSTALL_PACKAGES`.
