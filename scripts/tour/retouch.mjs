// Turns a generated original (PNG from Runway) into its master, applying the
// one hand retouch the set needed. Kept so any master can be rebuilt.
//
//   node scripts/tour/retouch.mjs <original.png> <scene id>     → masters/<id>.jpg
//
// office   the laptop lid carried a real company's logo; it is painted out.
// handoff  the brass lock, keys and lever get a little more light, so they still
//          read as brass under the page's navy tint.
// Every other scene is copied through untouched.
//
// "across"/"down" fill a small box by blending the clean pixels on either side
// of it (across the box, or down it where the surroundings run vertically),
// then add a little grain so the patch matches the photo. "shine" brightens
// only the warm (brass) pixels inside an oval, fading out toward its edge.

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const [src, id] = process.argv.slice(2);

const FIXES = {
  office: [{ dir: "across", x0: 1843, x1: 1879, y0: 911, y1: 950 }],
  handoff: [{ dir: "shine", cx: 1932, cy: 828, rx: 72, ry: 165, gain: 0.6 }],
};

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, channels: C } = info;
const at = (x, y) => (y * W + x) * C;
const grain = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2.2;
const put = (x, y, rgb, keep = 0) => {
  const g = grain();
  for (let c = 0; c < 3; c++) {
    const i = at(x, y) + c;
    data[i] = Math.max(0, Math.min(255, Math.round(data[i] * keep + (rgb[c] + g) * (1 - keep))));
  }
};
const mean = (points) => {
  const sum = [0, 0, 0];
  for (const [x, y] of points) for (let c = 0; c < 3; c++) sum[c] += data[at(x, y) + c];
  return sum.map((v) => v / points.length);
};
const mix = (a, b, t) => a.map((v, c) => v + (b[c] - v) * t);
const span = (n) => Array.from({ length: n }, (_, k) => k + 1);
const EDGE = 4; // pixels over which the patch fades into the photo

for (const f of FIXES[id] || []) {
  if (f.dir === "shine") {
    for (let y = f.cy - f.ry; y <= f.cy + f.ry; y++) {
      for (let x = f.cx - f.rx; x <= f.cx + f.rx; x++) {
        const d = Math.hypot((x - f.cx) / f.rx, (y - f.cy) / f.ry);
        if (d >= 1) continue;
        const i = at(x, y);
        const warm = Math.max(0, Math.min(1, (data[i] - data[i + 2] - 25) / 50));
        const lift = 1 + f.gain * warm * (1 - d * d);
        for (let c = 0; c < 3; c++) data[i + c] = Math.min(255, Math.round(data[i + c] * lift));
      }
    }
  } else if (f.dir === "across") {
    for (let y = f.y0; y <= f.y1; y++) {
      const left = mean(span(5).map((k) => [f.x0 - k, y]));
      const right = mean(span(5).map((k) => [f.x1 + k, y]));
      const fade = Math.min(1, (y - f.y0 + 1) / EDGE, (f.y1 - y + 1) / EDGE);
      for (let x = f.x0; x <= f.x1; x++) put(x, y, mix(left, right, (x - f.x0) / (f.x1 - f.x0)), 1 - fade);
    }
  } else {
    for (let x = f.x0; x <= f.x1; x++) {
      const top = mean(span(8).map((k) => [x, f.y0 - k]));
      const bottom = mean(span(8).map((k) => [x, f.y1 + k]));
      const fade = Math.min(1, (x - f.x0 + 1) / EDGE, (f.x1 - x + 1) / EDGE);
      for (let y = f.y0; y <= f.y1; y++) put(x, y, mix(top, bottom, (y - f.y0) / (f.y1 - f.y0)), 1 - fade);
    }
  }
}

const out = path.join(here, "masters", `${id}.jpg`);
const done = await sharp(data, { raw: info }).jpeg({ quality: 93, chromaSubsampling: "4:4:4", mozjpeg: true }).toFile(out);
console.log(`${id}: ${(FIXES[id] || []).length} retouch(es), ${done.width}x${done.height}, ${Math.round(done.size / 1024)}k → ${out}`);
