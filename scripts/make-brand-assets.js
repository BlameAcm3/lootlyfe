/**
 * Generates simple, bold, THEME-NEUTRAL brand placeholders so the app icon and
 * splash never ship as the stock Expo art:
 *   assets/icon.png           (1024x1024, full-bleed indigo tile + gold gem)
 *   assets/adaptive-icon.png  (1024x1024, gem on transparent, inside the
 *                              Android safe zone; bg color comes from app.config)
 *   assets/splash-icon.png    (1024x1024, gem on transparent for `contain`)
 *   assets/favicon.png        (48x48)
 *
 * The mark is a bold gold "loot gem" (a diamond with a faceted inset) over a
 * deep indigo-black field with a cyan spark — readable at any size, no theme
 * pack baked in. Re-run any time: node scripts/make-brand-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// --- palette (matches the dark-first RPG-neutral skin) -----------------------
const INDIGO = [11, 16, 32]; // #0B1020 field
const INDIGO_HI = [26, 32, 64]; // subtle vignette lift
const GOLD = [245, 197, 66]; // #F5C542 primary mark
const GOLD_HI = [255, 226, 138]; // top facet highlight
const GOLD_LO = [193, 142, 28]; // bottom facet shadow
const CYAN = [86, 224, 255]; // #56E0FF accent spark

// --- tiny PNG encoder (RGBA, 8-bit, filter 0) --------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function writePng(file, size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const o = rowStart + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png);
  console.log('wrote', path.relative(process.cwd(), file));
}

// --- the mark ----------------------------------------------------------------
const lerp = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

/**
 * Returns the gem/spark color at normalized coords (nx,ny in -1..1), or null
 * for "background here". `scale` sizes the gem within the canvas.
 */
function markAt(nx, ny, scale) {
  // Diamond (Manhattan) radius for the gem body.
  const r = (Math.abs(nx) + Math.abs(ny)) / scale;

  // Cyan spark: a clean 4-point star (astroid) clearly outside the gem, upper-right.
  if (r > 1.0) {
    const off = 0.82 * scale;
    const sx = nx - off;
    const sy = ny + off;
    const R = 0.16 * scale;
    const a = Math.sqrt(Math.abs(sx) / R) + Math.sqrt(Math.abs(sy) / R);
    if (a <= 1) return [...CYAN, 255];
    return null; // background
  }

  // Faceted shading: top-half highlight, bottom-half shadow, center seam.
  let col;
  if (ny < 0) col = lerp(GOLD_HI, GOLD, Math.min(1, -ny / scale + 0.15));
  else col = lerp(GOLD, GOLD_LO, Math.min(1, ny / scale + 0.1));
  // Center vertical seam catches a highlight for a cut-gem read.
  if (Math.abs(nx) < 0.04 * scale) col = lerp(col, GOLD_HI, 0.5);
  // Soft inner outline near the rim.
  if (r > 0.9) col = lerp(col, GOLD_LO, (r - 0.9) / 0.1);
  return [...col, 255];
}

function background(x, y, size) {
  // Radial vignette: lighter indigo center → deep edges.
  const cx = size / 2;
  const cy = size / 2;
  const d = Math.hypot(x - cx, y - cy) / (size / 2);
  return [...lerp(INDIGO_HI, INDIGO, Math.min(1, d)), 255];
}

// icon: full-bleed field + gem.
writePng(path.join('assets', 'icon.png'), 1024, (x, y) => {
  const nx = (x - 512) / 512;
  const ny = (y - 512) / 512;
  return markAt(nx, ny, 0.62) ?? background(x, y, 1024);
});

// adaptive-icon foreground: gem only, transparent, inside the safe zone (~66%).
writePng(path.join('assets', 'adaptive-icon.png'), 1024, (x, y) => {
  const nx = (x - 512) / 512;
  const ny = (y - 512) / 512;
  return markAt(nx, ny, 0.42) ?? [0, 0, 0, 0];
});

// splash-icon: gem only, transparent (app.config renders it `contain` on indigo).
writePng(path.join('assets', 'splash-icon.png'), 1024, (x, y) => {
  const nx = (x - 512) / 512;
  const ny = (y - 512) / 512;
  return markAt(nx, ny, 0.5) ?? [0, 0, 0, 0];
});

// favicon: tiny full-bleed.
writePng(path.join('assets', 'favicon.png'), 48, (x, y) => {
  const nx = (x - 24) / 24;
  const ny = (y - 24) / 24;
  return markAt(nx, ny, 0.62) ?? background(x, y, 48);
});
