# 02 — For customers

Ads for people who have never booked a salon online: find one nearby, book in a minute, why the
pre-payment is safe, never forget a booking. Silent H.264 MP4s with a `.jpg` cover each; every one ends on
«رزرو نوبت» / «پیدا کردن سالن» and `nobatet.app`.

| File | Format | Message | Length |
| --- | --- | --- | --- |
| `story/story-c01-find-salon.mp4` | Story / Reels 1080×1920 | find a salon nearby — search, nearest, map, ratings | 16 s |
| `story/story-c02-book-in-a-minute.mp4` | Story / Reels 1080×1920 | booking in under a minute — service, stylist, time, SMS code, pre-payment, done | 19 s |
| `story/story-c03-safe-prepayment.mp4` | Story / Reels 1080×1920 | trust — wallet, 25% pre-payment, full refund if the salon cancels or doesn't confirm | 17.5 s |
| `story/story-c04-never-forget.mp4` | Story / Reels 1080×1920 | reminders, rebook in one tap, waitlist, favourites | 17 s |
| `post/post-c01-why-nobatet.mp4` | Feed 1080×1350 (4:5) | six reasons to book with نوبتت | 22 s |
| `post/post-c02-first-booking.mp4` | Feed 1080×1350 (4:5) | the first booking in five taps | 17 s |

```
node scripts/ad-videos/build.mjs c0            # just this series
node scripts/ad-videos/build.mjs c0 --stills   # one frame per second → _preview/ here
```

Defined in `customerVideos()` in `scripts/ad-videos/build.mjs`.
