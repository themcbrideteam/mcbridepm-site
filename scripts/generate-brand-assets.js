// One-shot script: rasterize the SVG sources in src/images/ into the
// PNG/JPG files referenced by base.njk, schema, and OG/Twitter meta tags.
// Run via `node scripts/generate-brand-assets.js` whenever the source
// SVGs change.

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const IMG = path.join(__dirname, "..", "src", "images");

async function render(svgFile, outFile, { width, height, format, background }) {
  const input = fs.readFileSync(path.join(IMG, svgFile));
  let pipeline = sharp(input, { density: 384 }).resize(width, height, {
    fit: "contain",
    background: background || { r: 255, g: 255, b: 255, alpha: 1 },
  });
  if (format === "png") pipeline = pipeline.png({ compressionLevel: 9 });
  if (format === "jpg" || format === "jpeg")
    pipeline = pipeline.flatten({ background }).jpeg({ quality: 88 });
  await pipeline.toFile(path.join(IMG, outFile));
  console.log("wrote", outFile);
}

(async () => {
  // 32x32 PNG favicon (fallback for browsers that don't take SVG favicons)
  await render("favicon.svg", "favicon-32.png", {
    width: 32,
    height: 32,
    format: "png",
    background: { r: 6, g: 6, b: 68, alpha: 1 },
  });

  // 180x180 Apple touch icon
  await render("favicon.svg", "apple-touch-icon.png", {
    width: 180,
    height: 180,
    format: "png",
    background: { r: 6, g: 6, b: 68, alpha: 1 },
  });

  // Wordmark PNG (used by Organization.logo in schema.org markup)
  await render("logo.svg", "logo.png", {
    width: 600,
    height: 160,
    format: "png",
  });

  // 1200x630 OG / Twitter Card image — written to /og-image.jpg at site root
  await render("og-image.svg", "og-image.jpg", {
    width: 1200,
    height: 630,
    format: "jpg",
    background: { r: 6, g: 6, b: 68 },
  });

  // Also copy og-image.jpg to the site root location Eleventy expects
  // (matches og:image URL https://mcbride-pm.com/og-image.jpg)
  const src = path.join(IMG, "og-image.jpg");
  const rootDest = path.join(__dirname, "..", "src", "og-image.jpg");
  fs.copyFileSync(src, rootDest);
  console.log("copied og-image.jpg -> src/ root");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
