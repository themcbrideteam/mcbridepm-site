#!/usr/bin/env node
// One-time (re-runnable) blog image recompression.
// Recompresses src/images/blog/*.jpg in place with mozjpeg at quality 72,
// capping width at 1408px. Skips files already under the size threshold so
// re-runs only touch new, unoptimized images.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'src', 'images', 'blog');
const SKIP_UNDER_BYTES = 350 * 1024; // already-optimized threshold
const MAX_WIDTH = 1408;
const QUALITY = 72;

(async () => {
  const files = fs.readdirSync(DIR).filter(f => /\.jpe?g$/i.test(f));
  let before = 0, after = 0, done = 0, skipped = 0;
  for (const f of files) {
    const fp = path.join(DIR, f);
    const orig = fs.statSync(fp).size;
    if (orig < SKIP_UNDER_BYTES) { skipped++; continue; }
    const buf = await sharp(fp)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();
    if (buf.length < orig) {
      fs.writeFileSync(fp, buf);
      before += orig; after += buf.length; done++;
    } else {
      skipped++;
    }
  }
  console.log(`Recompressed ${done} images (${skipped} skipped): ` +
    `${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);
})();
