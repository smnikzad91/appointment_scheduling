# 04 — One-minute feed posts

About 60 seconds each, feed post format (1080×1350, 4:5), telling the whole story: hook → the
problem → نوبتت → features one by one beside the app → how to start / why → offer → call to action.
Silent H.264 + a `.jpg` cover frame each; captions with hashtags in `instagram-captions.txt`.

| File | Audience | Length | Contact card |
| --- | --- | --- | --- |
| `post/post-60-salon-owners.mp4` | salon owners — phone chaos → 8 features → 3 steps to start → free month | ~62 s | ✓ |
| `post/post-60-independent-stylists.mp4` | independent stylists — own booking page, salon or home, 7 features, poster → free month | ~58 s | ✓ |
| `post/post-60-customers.mp4` | customers — no more calls → book in five taps → safe pre-payment → wallet, reminders, rebook, reviews | ~58 s | — |
| `post/post-60-platform-overview.mp4` | everyone — one app for owners, stylists, independents and customers → why نوبتت → free month | ~60 s | ✓ |

```
node scripts/ad-videos/build.mjs post-60            # all four (~35 min)
node scripts/ad-videos/build.mjs post-60 --stills   # a frame per second → _preview/
```

Defined in `oneMinuteVideos()` in `scripts/ad-videos/build.mjs` (each is a list of parts: title cards,
feature runs, the call to action — reorder or add parts there).
