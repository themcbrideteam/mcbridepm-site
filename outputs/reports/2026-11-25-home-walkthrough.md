# Homepage walkthrough rebuilt — 2026-11-25

Branch `home-walkthrough-2026-11-25`. Asked for by Noah.

## The problem

The homepage tells a seven-chapter story: the curb, the front door, the living room, the office, the study, the porch, the handoff. The background was one video of the Rosewood Dr listing photos (front, dining room, kitchen, kitchen again, living room, back toward the kitchen, primary bedroom, primary bath, back porch), played forward by how far down the whole page the visitor had scrolled. Nothing tied a room to a chapter, so "The Office" could sit over a kitchen, and the mix shifted with every screen size because chapters are different heights on a phone.

## What replaced it

Seven photographs of one home, one per chapter, in chapter order. The home is generated (Runway, Noah's workspace), built to Noah's brief: a Southern charmer that fits the CSRA market in the $350K–$600K range, not an estate.

| Chapter | What's behind it |
|---|---|
| The Curb | The house from the street at golden hour: white painted brick, full front porch, navy front door |
| The Front Door | On the porch, the navy door standing open to a lit foyer |
| The Living Room | White brick fireplace, built-ins, slipcovered sofa, afternoon sun through shutters |
| The Office | Through French doors: a wooden desk, laptop, brass lamp, a stack of papers |
| The Study | Navy built-in bookshelves, leather chair, reading lamp, dusk outside |
| The Porch | The back porch at sunset: swing, rocking chairs, string lights, sweet tea |
| The Handoff | The front door at blue hour with the keys hanging in the lock |

How it behaves:

- Each photo is named for its chapter (`data-scene="office"` sits behind `#office`), so the room on screen is always the chapter being read, whatever the screen size.
- While a chapter is on screen the camera keeps moving slowly (pushing in, pulling back, or panning).
- As the next chapter's top edge crosses the screen, the camera pushes toward the doorway in the current room and the next room fades up and settles. Scrolling back up walks back out.
- On a desktop the house leans a few pixels toward the pointer.
- Phones get their own tall crop of each room, cut around its subject.
- Reduced-motion visitors get the same rooms with a plain fade and no camera movement. Without JavaScript the curb stays put.
- In the Handoff the photo is cropped so the keys hang in the open space between the copy and the form card on desktop.

## Weight

| | Before | After |
|---|---|---|
| Desktop | 45 MB video | about 1.0 MB for all seven photos at 1920 wide (277 KB for the first) |
| Phone | 14 MB video | about 0.6 MB for all seven (104 KB for the first) |

Only the first photo loads with the page. The rest load one at a time after the page has loaded, or at once if the visitor reaches a room first. On a data-saver connection each waits until the visitor is about to walk into it. File names carry a content hash and are cached for a year. The two video files are removed from `src/assets/video/`.

## Honesty

The footer on the homepage now says: "The home in the walkthrough is an AI-generated illustration. It isn't a specific property we manage." Two originals were retouched by hand (`scripts/tour/retouch.mjs`): a real company's logo painted off the office laptop, and the brass on the front-door lock brightened slightly.

## Files

- `scripts/tour/scenes.json` — the seven scenes: order, Runway task ids, crop, zoom target, camera move. The file to edit.
- `scripts/tour/masters/` — the seven full-size photos.
- `scripts/tour/build.mjs` — writes `src/assets/tour/` (AVIF with a JPEG fallback, three wide sizes and two tall) and `src/_data/tour.json`.
- `src/index.html` — the `.tour` stage, printed from `tour.json`; footer note.
- `src/js/home.js`, `src/css/home.css` — the walkthrough.
- `netlify.toml` — year-long caching and the AVIF content type for `/assets/tour/`.
- `qa/homepage-ux.mjs` — new checks: the page opens on the curb, every chapter shows its own photo, the camera moves, scrolling back returns to the curb, the right crop loads for the screen, reduced motion and no-JS still show the right room. `qa/serve.mjs` serves AVIF.

## Verified

Against a local build served by `qa/serve.mjs`:

- `qa/homepage-ux.mjs`: 253 of 253. Six screen sizes (1920×1080 down to 360×740), every form path, reduced motion, no JavaScript, and the new walkthrough checks.
- `qa/inner-pages.mjs`: 44 of 44 across every page in the sitemap, desktop and phone.
- Every chapter looked at on desktop (1280, 1440, 1920 wide) and on a phone-sized screen.

The first homepage run was 252 of 253: Boom's listings frame on /rentals/ was cancelled as the test moved on. The suite now ignores failed requests to Boom's own addresses.

## Not covered

- Real iOS Safari and Android hardware (headless Chrome with phone settings only).
- The Netlify deploy preview and production. Run both suites with `--live` once the pull request is open, and confirm `/assets/tour/*.avif` is served as `image/avif`.
- The inner pages still sit on the Rosewood, Kings Way, and Canterbury listing photos.
- `og-image.jpg` (the link-preview image) is unchanged.
