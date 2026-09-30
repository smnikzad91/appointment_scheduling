# Instagram Story Highlights

One highlight per panel, generated from the Help Center guides (`/tutorials`): for every guide a
cover slide, then one slide per step: the step's screenshot with the same highlight frames as the
Help Center, and each frame's Persian caption beside it. 1080×1920 PNG (9:16); titles, captions and
text stay clear of the top/bottom ~250 px that Instagram's own UI covers.

| Folder | Highlight |
| --- | --- |
| `01-salon-panel/` | پنل سالن (salon owners) |
| `02-stylist-panel/` | پنل آرایشگر (stylists) |
| `02-independent-stylist-panel/` | پنل آرایشگر مستقل (independent stylists) |
| `03-customer-panel/` | پنل مشتری (customers) |

Files are named `NN_english_slug.png` — a two-digit number in teaching order, so phone galleries
never put `10_` before `02_`, then what the slide shows: `05_book_online_intro.png` (a guide's cover),
`06_start_booking.png`, `07_choose_service.png`, … Publish each folder in filename order. The
slugs live in `STEP_SLUGS` in the build script (keyed by screenshot id); add one for a new step.

## Regenerate

After the screenshots or guide texts change (`scripts/tutorials/capture.mjs`,
`apps/web/src/content/tutorials.ts`):

```
node scripts/story-highlights/build.mjs            # all four folders (replaces their images)
node scripts/story-highlights/build.mjs book       # preview guides matching "book" → _preview/
```

Needs Playwright's Chromium (`CHROMIUM_PATH` to point at another one).
