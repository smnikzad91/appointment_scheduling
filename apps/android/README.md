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
- Theme: the web's colour tokens (light and dark), Vazirmatn, always right-to-left.

## Backend
- apps/api: `https://nobatet.app/backend/` (`BuildConfig.API_BASE_URL`), token as `Authorization: Bearer`.
- apps/web-only features (image upload `/api/upload`, private receipts, `/api/user/profile`,
  `password`, `avatar`, `sms-preferences`, `tickets`): `https://nobatet.app/` with the **same**
  Bearer token (apps/web `lib/requestSession.ts`). The wallet routes don't accept it yet.

## Build
No Android SDK on the server: GitHub Actions (`.github/workflows/android.yml`) builds a debug APK on
every push to the `android-app` branch — download it from the run's Artifacts.
Locally: Android Studio (open `apps/android`), or `gradle assembleDebug` with JDK 17 + Android SDK 35.
Add the Gradle wrapper once from a machine with Gradle: `gradle wrapper --gradle-version 8.11.1`.

## Next
Customer: salon search + map (MapLibre/osmdroid, OpenStreetMap), salon page, booking flow,
bookings. Then the stylist panel, then the salon panel (accounting, share kit), push via an Iranian
provider (Pushe/Najva), SMS Retriever for the code. Keep texts and rules identical to the web.
