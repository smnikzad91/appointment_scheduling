# نوبتت — Android app (Kotlin, Jetpack Compose)

One app for every role: after sign-in, `GET /auth/me` returns the account's role and the app shows
that panel — customer, stylist, or salon owner / independent stylist (salon panel with «ساعات کاری»
instead of «آرایشگرها»). The admin panel stays on the website (the app shows a link).

## What's here (first step)
- Sign-in as on the web's `/signin`: «ورود با رمز عبور» (default) and «ورود با کد پیامکی»
  (60 s resend countdown; auto-verifies while the API hands the code back). Sign-in never creates
  accounts; sign-up comes later.
- Session: the apps/api token in DataStore; checked at start with `/auth/me` (401 → sign in again).
- The web panels' tabs and labels (apps/web `components/app/panels.tsx`); tab screens are
  placeholders to be built one by one.
- Theme: the web's colour tokens (light and dark) mapped onto every Material role (no default purple in
  dialogs, sheets, chips), Vazirmatn, always right-to-left. Light/dark follows the phone until the user
  picks «حالت تیره / حالت روشن» in the account sheet (saved in DataStore `prefs`, like the web's `theme`).
  Sign-in uses the web's dark guest look (`NobatetTheme(guest = true)`).
- Shell: the web's AppShell — logo + «نوبتت» + panel name, bell, avatar → «حساب کاربری» sheet
  (panel links, light/dark, sign out), and its tab bar.

## Backend
- apps/api: `https://nobatet.app/backend/` (`BuildConfig.API_BASE_URL`), token as `Authorization: Bearer`.
- apps/web-only features (image upload `/api/upload`, private receipts, `/api/user/profile`,
  `password`, `avatar`, `sms-preferences`, `tickets`): `https://nobatet.app/` with the **same**
  Bearer token (apps/web `lib/requestSession.ts`). The wallet routes don't accept it yet.

## Release
- CI also builds `assembleRelease` + `bundleRelease` (artifact `nobatet-release`); `versionCode` = the
  workflow run number, `versionName` from `NOBATET_VERSION_NAME` (default 0.1.0).
- Signing: add repo secrets `NOBATET_KEYSTORE_BASE64` (`base64 -w0 release.jks`), `NOBATET_KEYSTORE_PASSWORD`,
  `NOBATET_KEY_ALIAS`, `NOBATET_KEY_PASSWORD` — until then the release APK is unsigned. Keep the keystore safe:
  losing it means the app can never be updated on the stores.
- Updates: the app reads apps/web `public/app-version.json` at start (offer above `latestVersionCode`, require
  below `minVersionCode`) — bump it with each release.
- Store texts: `store-listing.md`. Provinces: `app/src/main/assets/iran_provinces.json` is generated from
  packages/iran-locations — regenerate when a county is added.

## Build
No Android SDK on the server: GitHub Actions (`.github/workflows/android.yml`) builds a debug APK on
every push to the `android-app` branch — download it from the run's Artifacts.
Locally: Android Studio (open `apps/android`), or `gradle assembleDebug` with JDK 17 + Android SDK 35.
Add the Gradle wrapper once from a machine with Gradle: `gradle wrapper --gradle-version 8.11.1`.

## Next
Customer: salon search + map (MapLibre/osmdroid, OpenStreetMap), salon page, booking flow,
bookings. Then the stylist panel, then the salon panel (accounting, share kit), push via an Iranian
provider (Pushe/Najva), SMS Retriever for the code. Keep texts and rules identical to the web.
