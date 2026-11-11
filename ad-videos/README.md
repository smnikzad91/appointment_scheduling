# Ad videos

Promotional and how-to videos for Instagram (and Aparat / YouTube / Telegram), rendered from the
Help Center screenshots (`apps/web/public/tutorials/`) on the brand palette (`branding/brand.md`).
H.264 MP4s with a `.jpg` cover frame each. Since 2026-11-11 every video has a Persian voice-over (Gemini TTS, voice Zephyr;
«excited» for ads, «friendly» for guides) and background music ducked under the voice; scenes hold until each line is spoken,
so videos are longer than before (many over 60 s: post them as Reels, not stories).

| Folder | What | Status |
| --- | --- | --- |
| `01-platform-intro/` | «نوبتت چیست»: one ad per audience plus general feature tours — story/Reels (9:16) and feed post (4:5); three end with Instagram @nobatet.app + 09024158946 | 10 videos, `node scripts/ad-videos/build.mjs` |
| `02-for-customers/` | for people trying their first online booking: find a salon, book in a minute, safe pre-payment, reminders — 4 stories + 2 feed posts | 6 videos |
| `03-guide-series/` | one video per Help Center guide (cover → steps with their highlights → the guide's link), a folder per panel; captions in its own `instagram-captions.txt` | 32 videos, `node scripts/ad-videos/build.mjs guide-` |
| `04-one-minute/` | ~60 s feed posts (4:5) telling the whole story — salon owners, independent stylists, customers, platform overview; three with the contact card | 4 videos, `node scripts/ad-videos/build.mjs post-60` |
| `05-story-abstracts/` | a new ~15 s 9:16 story for every video above: headline, three points, its own narration, and a frame of the full video with «ویدیوی کاملش در پست امروز» | 52 videos, `node scripts/ad-videos/build.mjs --abstract` (text in `scripts/ad-videos/abstracts.mjs`) |

Roadmap (2026-10-31): 0 refresh the existing ads on the new brand (done) · customer series (done) · 2 guide series (done) · 1 platform intro in 15 s / 30 s /
60 s cuts per audience · 2 guide series · 3 captions, music, optional voice-over · 4 publish (Instagram,
Aparat, YouTube, Telegram; UTM links per channel) · 5 measure sign-ups per video and re-cut.

Captions with hashtags for every video: `instagram-captions.txt`.

Re-render after the screenshots change (`scripts/tutorials/capture.mjs`). Story text stays out of the top
250 px and bottom 330 px that Instagram's UI covers.

Publishing (2026-11-11): all 52 Reels + their 52 story abstracts are scheduled on mychatbot.ir for @nobatet.app,
2026-11-12…11-24, Reels at 10:00 / 13:30 / 17:30 / 21:00 Tehran and each story 30 minutes after its Reel.

Re-render: `node scripts/ad-videos/build.mjs --narr` writes `ad-videos/narration.json` (add `--abstract` for the stories);
voice clips are cached in `ad-videos/_voice/<sha1(style|text)>.mp3`, music in `ad-videos/_music/`; `--cover-only` redoes covers.
