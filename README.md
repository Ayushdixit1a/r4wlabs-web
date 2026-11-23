# R4W LABS website

Marketing agency site for R4W LABS (Indore). Plain HTML, CSS and JavaScript, built with Vite.

## Run it

```
npm install
npm run dev      # local preview
npm run build    # production files in dist/
```

## Add or change reels

1. Drop videos into `videos/Top/` and into one folder per industry (see `videos/README.txt`).
2. Run `npm run videos` (needs [ffmpeg](https://ffmpeg.org/download.html)).

Folder names are matched to a category (`cafes` → Cafés, `doctor` → Healthcare, `real state` → Real Estate,
`workshop` → Automotive, and so on); any other folder becomes its own row. Reels are titled by category and
number ("Cafés 01"), never by file name, so client names in file names don't appear on the site. If there is
no `Top` folder, the first reel of each category is featured instead. Folders starting with `_` are ignored.

For every video the script writes three files to `public/media/`: a web-sized full reel, a muted
6-second cut from the middle that loops in the slider, and a poster image. It also writes
`public/media/manifest.json`, which is what the pages read. Until real videos are added it builds
labelled sample clips so the sliders can be reviewed.

## Where things are

| What | File |
| --- | --- |
| Home page content | `index.html` |
| Video Editing page | `video-editing/index.html` |
| Header, footer, loader markup | `src/partials/` |
| Phone, email, Instagram, WhatsApp message | `src/site.js` |
| Logo-reveal loading screen | `src/loader.js` |
| Interactive "R4W LABS" hero | `src/particles.js` |
| Footer wordmark motion, nav, cursor label | `src/common.js` |
| Reel sliders and full-screen player | `src/reels.js` |
| Colours, type, layout | `src/styles.css` |
| Single-line logo files | `public/brand/` |

The contact form opens WhatsApp with the visitor's message filled in; nothing is stored on a server.

## Ordering and "In the wild"

- Videos inside a `picks` folder (e.g. `videos/cafes/00 picks/1.mp4`, `2.mp4`, ...) come first in their category, in number order. With no `videos/Top/` folder, the Top slider takes them in rounds: every category's 1, then every 2, up to 12.
- `videos/wild.txt` lists the videos (one path per line, relative to `videos/`) that are scattered at random in the "In the wild" section on the Video Editing page. The layout reshuffles on every load and on Shuffle.
