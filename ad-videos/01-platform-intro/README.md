# 01 — Platform introduction

Short silent ad videos (Persian, RTL) that introduce نوبتت to each audience, built from the Help Center
screenshots and the landing-page copy, on the brand palette (`branding/brand.md`: Obsidian Charcoal,
copper, navy) with the new logo.
H.264 + AAC (silent track), 30 fps, ~2.5 MB each. Each `.mp4` has a `.jpg` cover frame next to it.
Add music in Instagram's own editor (or Ads Manager) — the videos are cut to work with any track.

| File | Format | Audience | Length |
| --- | --- | --- | --- |
| `story/story-01-salon-online-booking.mp4` | Story / Reels 1080×1920 | salon owners — «هنوز نوبت‌ها را تلفنی می‌گیرید؟» | 16.5 s |
| `story/story-02-customer-booking.mp4` | Story / Reels 1080×1920 | customers — booking in five taps | 17 s |
| `story/story-03-independent-stylist.mp4` | Story / Reels 1080×1920 | independent stylists — own booking page | 16.5 s |
| `post/post-01-salon-features.mp4` | Feed 1080×1350 (4:5) | salon owners — five features | 19 s |
| `post/post-02-how-it-works.mp4` | Feed 1080×1350 (4:5) | salon owners — three steps to the first online booking | 16.5 s |
| `post/post-03-customer-booking.mp4` | Feed 1080×1350 (4:5) | customers — booking in five taps | 16 s |
| `story/story-04-platform-tour.mp4` | Story / Reels 1080×1920 | everyone — one app for salons, stylists, independents and customers + key features; **contact card** | 25 s |
| `story/story-05-free-month.mp4` | Story / Reels 1080×1920 | salons & stylists — «یک ماه رایگان» in four steps; **contact card** | 18 s |
| `post/post-04-all-features.mp4` | Feed 1080×1350 (4:5) | salon owners — eight tools one by one; **contact card** | 27 s |
| `post/post-05-whats-new.mp4` | Feed 1080×1350 (4:5) | salon owners — new: pre-payment, visit stats, poster & QR, plans | 17 s |

Story text stays out of the top 250 px and bottom 330 px that Instagram's UI (and an ad's CTA button) covers.
Every video ends on the logo, a button (شروع رایگان / رزرو نوبت / ثبت‌نام رایگان) and `nobatet.app`; the ones
marked **contact card** also show Instagram `@nobatet.app` and the admin's number 09024158946 (`CONTACT` in the
script — change them there and re-render).

## Regenerate

After the screenshots (`scripts/tutorials/capture.mjs`) or the copy in the script change:

```
node scripts/ad-videos/build.mjs                     # all six (~8 min)
node scripts/ad-videos/build.mjs story-02            # only ids containing "story-02"
node scripts/ad-videos/build.mjs post --stills       # one frame per second → _preview/ here
```

The copy, scenes and timings live in `VIDEOS` in the script. Needs Playwright's Chromium (`CHROMIUM_PATH`
to point at another one) and ffmpeg.
