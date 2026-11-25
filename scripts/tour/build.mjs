// Builds the homepage walkthrough images from the masters in scripts/tour/masters/.
//
//   node scripts/tour/build.mjs
//
// For every scene in scripts/tour/scenes.json it writes, into src/assets/tour/:
//   <id>.<hash>-1280.avif, -1920.avif, -2400.avif, -1920.jpg   wide screens (16:9)
//   <id>.<hash>-p-640.avif, -p-920.avif, -p-920.jpg            phones (3:5 crop around `portraitX`)
// <hash> changes whenever the master or its crop changes, so netlify.toml can
// tell browsers to keep these files for a year. It also rewrites src/_data/tour.json, which src/index.html loops over to print
// the stage. Edit scenes.json (order, crop, focus), never tour.json.
//
// The masters are generated images of one made-up home (Runway task ids are in
// scenes.json so any of them can be fetched again). They are not a real listing.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const mastersDir = path.join(here, "masters");
const outDir = path.join(root, "src/assets/tour");
const manifest = JSON.parse(fs.readFileSync(path.join(here, "scenes.json"), "utf8"));

const WIDE = [1280, 1920, 2400];
const TALL = [640, 920];
const TALL_RATIO = 3 / 5; // width / height of the phone crop
const AVIF = { quality: 52, effort: 6, chromaSubsampling: "4:2:0" };
const JPEG = { quality: 74, mozjpeg: true, progressive: true };

fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, f));

const kb = (file) => Math.round(fs.statSync(file).size / 1024);
const scenes = [];
let total = 0;

for (const scene of manifest.scenes) {
  const master = path.join(mastersDir, scene.master);
  const stamp = crypto
    .createHash("md5")
    .update(fs.readFileSync(master))
    .update(JSON.stringify([scene.portraitX, scene.wideCrop, WIDE, TALL, TALL_RATIO, AVIF, JPEG]))
    .digest("hex")
    .slice(0, 8);
  const name = `${scene.id}.${stamp}`;
  const meta = await sharp(master).metadata();
  const { width: W, height: H } = meta;

  // Wide: the whole 16:9 frame, or the 16:9 window `wideCrop` [left, top, width]
  // (fractions of the master) when a scene needs its subject somewhere exact.
  const box = { left: 0, top: 0, width: W, height: H };
  if (scene.wideCrop) {
    const [l, t, w] = scene.wideCrop;
    box.width = Math.round(w * W);
    box.height = Math.round((box.width * 9) / 16);
    box.left = Math.min(W - box.width, Math.round(l * W));
    box.top = Math.min(H - box.height, Math.round(t * H));
  }
  const wide = () => sharp(master).extract(box);
  for (const w of WIDE) {
    const file = path.join(outDir, `${name}-${w}.avif`);
    await wide().resize({ width: Math.min(w, box.width) }).avif(AVIF).toFile(file);
    total += kb(file);
  }
  const wideJpg = path.join(outDir, `${name}-1920.jpg`);
  await wide().resize({ width: Math.min(1920, box.width) }).jpeg(JPEG).toFile(wideJpg);

  // Tall: a full-height 3:5 window centered on portraitX (0–1 across the master).
  const cropW = Math.round(H * TALL_RATIO);
  const left = Math.max(0, Math.min(W - cropW, Math.round(scene.portraitX * W - cropW / 2)));
  const tall = () => sharp(master).extract({ left, top: 0, width: cropW, height: H });
  for (const w of TALL) {
    const file = path.join(outDir, `${name}-p-${w}.avif`);
    await tall().resize({ width: Math.min(w, cropW) }).avif(AVIF).toFile(file);
    total += kb(file);
  }
  await tall().resize({ width: Math.min(920, cropW) }).jpeg(JPEG).toFile(path.join(outDir, `${name}-p-920.jpg`));

  // A 24px blur that paints instantly while the real file loads.
  const blur = async (img) =>
    "data:image/jpeg;base64," + (await img.resize({ width: 24 }).blur(1.2).jpeg({ quality: 50 }).toBuffer()).toString("base64");

  // Where the walk-through zoom aims (the door, the opening, the keys), as a
  // percentage of the frame. On phones the same point is re-expressed inside the crop.
  const [fx, fy] = scene.focus;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const fxWide = clamp((fx * W - box.left) / box.width);
  const fyWide = clamp((fy * H - box.top) / box.height);
  const fxTall = clamp((fx * W - left) / cropW);
  const pct = (n) => `${Math.round(n * 1000) / 10}%`;

  scenes.push({
    id: scene.id,
    room: scene.room,
    focus: `${pct(fxWide)} ${pct(fyWide)}`,
    focusTall: `${pct(fxTall)} ${pct(fy)}`,
    drift: scene.drift || "in",
    pos: pct(scene.pos ?? scene.portraitX),
    blur: await blur(wide()),
    blurTall: await blur(tall()),
    wide: WIDE.map((w) => `/assets/tour/${name}-${w}.avif ${w}w`).join(", "),
    wideJpg: `/assets/tour/${name}-1920.jpg`,
    tall: TALL.map((w) => `/assets/tour/${name}-p-${w}.avif ${w}w`).join(", "),
    tallJpg: `/assets/tour/${name}-p-920.jpg`,
  });

  console.log(
    `${scene.id.padEnd(8)} wide ${WIDE.map((w) => kb(path.join(outDir, `${name}-${w}.avif`)) + "k").join(" / ")}` +
      `   tall ${TALL.map((w) => kb(path.join(outDir, `${name}-p-${w}.avif`)) + "k").join(" / ")}`
  );
}

fs.writeFileSync(
  path.join(root, "src/_data/tour.json"),
  JSON.stringify({ generatedBy: "scripts/tour/build.mjs — edit scripts/tour/scenes.json, then rebuild", scenes }, null, 2) + "\n"
);
console.log(`\n${scenes.length} scenes, ${Math.round(total / 102.4) / 10} MB of AVIF across every size → src/assets/tour/, src/_data/tour.json`);
