# Ad videos

Promotional and how-to videos for Instagram (and Aparat / YouTube / Telegram), rendered from the
Help Center screenshots (`apps/web/public/tutorials/`) on the brand palette (`branding/brand.md`).
Silent H.264 MP4s with a `.jpg` cover frame each — add music in Instagram's editor or Ads Manager.

| Folder | What | Status |
| --- | --- | --- |
| `01-platform-intro/` | «نوبتت چیست»: one ad per audience plus general feature tours — story/Reels (9:16) and feed post (4:5); three end with Instagram @nobatet.app + 09024158946 | 10 videos, `node scripts/ad-videos/build.mjs` |
| `02-for-customers/` | for people trying their first online booking: find a salon, book in a minute, safe pre-payment, reminders — 4 stories + 2 feed posts | 6 videos |
| `03-guide-series/` | one short video per Help Center guide (cover → steps with their highlights → call to action) | planned (roadmap phase 2) |

Roadmap (2026-10-31): 0 refresh the existing ads on the new brand (done) · 1 platform intro in 15 s / 30 s /
60 s cuts per audience · 2 guide series · 3 captions, music, optional voice-over · 4 publish (Instagram,
Aparat, YouTube, Telegram; UTM links per channel) · 5 measure sign-ups per video and re-cut.

Captions with hashtags for every video: `instagram-captions.txt`.

Re-render after the screenshots change (`scripts/tutorials/capture.mjs`). Story text stays out of the top
250 px and bottom 330 px that Instagram's UI covers.
