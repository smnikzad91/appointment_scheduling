# Instagram Story Highlights

One highlight per panel, generated from the Help Center guides (`/tutorials`): for every guide a
cover slide, then one slide per step: the step's screenshot with the same highlight frames as the
Help Center, and each frame's Persian caption beside it. 1080×1920 JPG (9:16); titles, captions and
text stay clear of the top/bottom ~250 px that Instagram's own UI covers.

| Folder | Highlight |
| --- | --- |
| `01-salon-panel/` | پنل سالن (salon owners) |
| `02-stylist-panel/` | پنل آرایشگر (stylists) |
| `02-independent-stylist-panel/` | پنل آرایشگر مستقل (independent stylists) |
| `03-customer-panel/` | پنل مشتری (customers) |

Publish each folder's files in filename order (`001-…`, `002-…`); the name also tells you the
guide and the step (`005-book-online-cover.jpg`, `006-book-online-step1.jpg`).

## Regenerate

After the screenshots or guide texts change (`scripts/tutorials/capture.mjs`,
`apps/web/src/content/tutorials.ts`):

```
node scripts/story-highlights/build.mjs            # all four folders (replaces their JPGs)
node scripts/story-highlights/build.mjs book       # preview guides matching "book" → _preview/
```

Needs Playwright's Chromium (`CHROMIUM_PATH` to point at another one).
