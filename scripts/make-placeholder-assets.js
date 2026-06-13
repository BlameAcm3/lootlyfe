/**
 * Generates placeholder theme assets so theme pack manifests never 404:
 *   assets/images/themes/<pack>/icon-{quest,loot,gold,streak}.png   (8x8 swatches)
 *   assets/images/themes/<pack>/avatar-{a,b,c}.png                  (96x96 shape characters)
 *   assets/images/themes/<pack>/cosmetic-<item_key>.png             (96x96 alpha overlays)
 *   assets/sounds/themes/<pack>/{quest-complete,level-up,gold-pickup,loot-redeem}.wav
 * Avatar bases are simple shape characters (circle / rounded square / diamond,
 * with eyes) in each pack's palette; cosmetics are transparent overlays that
 * AvatarRenderer layers on top (head: top third, body: lower half, accessory:
 * a corner). WAVs are ~0.2s of silence.
 * Re-run any time: node scripts/make-placeholder-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// PNG plumbing
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const solidPng = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  const size = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill([r, g, b]).flat())]);
  const idat = zlib.deflateSync(Buffer.concat(Array(size).fill(row)));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

/** RGBA canvas (color type 6) → PNG buffer. */
const rgbaPng = (pixels, size) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]), Buffer.from(pixels.subarray(y * size * 4, (y + 1) * size * 4)));
  }
  const idat = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

// ---------------------------------------------------------------------------
// Tiny raster: 96x96 RGBA canvas + shape fills
// ---------------------------------------------------------------------------

const SIZE = 96;

const hexToRgb = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const darken = (hex, factor) => {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.round(v * factor));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const canvas = () => new Uint8Array(SIZE * SIZE * 4);

/** Fills every pixel where predicate(x, y) is true. */
const fill = (px, hex, predicate) => {
  const [r, g, b] = hexToRgb(hex);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!predicate(x, y)) continue;
      const i = (y * SIZE + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = 255;
    }
  }
};

const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
const ring = (cx, cy, outer, inner) => (x, y) => {
  const d = (x - cx) ** 2 + (y - cy) ** 2;
  return d <= outer ** 2 && d >= inner ** 2;
};
const rect = (x0, y0, w, h) => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
const roundedRect = (x0, y0, w, h, r) => (x, y) => {
  if (x < x0 || x >= x0 + w || y < y0 || y >= y0 + h) return false;
  const dx = Math.max(x0 + r - x, x - (x0 + w - 1 - r), 0);
  const dy = Math.max(y0 + r - y, y - (y0 + h - 1 - r), 0);
  return dx * dx + dy * dy <= r * r;
};
const diamond = (cx, cy, r) => (x, y) => Math.abs(x - cx) + Math.abs(y - cy) <= r;
/** Triangle: apex at (ax, ay), horizontal base at baseY spanning halfWidth each way. */
const triangle = (ax, ay, baseY, halfWidth) => (x, y) => {
  const span = baseY - ay;
  if (span === 0) return false;
  const t = (y - ay) / span;
  if (t < 0 || t > 1) return false;
  return Math.abs(x - ax) <= halfWidth * t;
};

const eyes = (px) => {
  fill(px, '#ffffff', circle(38, 48, 5));
  fill(px, '#ffffff', circle(58, 48, 5));
  fill(px, '#1c1c2e', circle(39, 49, 2));
  fill(px, '#1c1c2e', circle(59, 49, 2));
};

/** Base characters: same silhouettes across packs, palette differs. */
const drawBase = (shape, color) => {
  const px = canvas();
  const outline = darken(color, 0.65);
  if (shape === 'circle') {
    fill(px, outline, circle(48, 52, 33));
    fill(px, color, circle(48, 52, 30));
  } else if (shape === 'square') {
    fill(px, outline, roundedRect(15, 19, 66, 66, 14));
    fill(px, color, roundedRect(18, 22, 60, 60, 12));
  } else {
    fill(px, outline, diamond(48, 52, 37));
    fill(px, color, diamond(48, 52, 33));
  }
  eyes(px);
  return rgbaPng(px, SIZE);
};

/** Cosmetic overlays, keyed by cosmetic_items.item_key (migration 014). */
const drawCosmetic = (key, c) => {
  const px = canvas();
  const draw = {
    // Head: top third.
    'head-starter': () => fill(px, c.head, rect(26, 18, 44, 8)),
    'head-guard': () => {
      fill(px, darken(c.head, 0.7), triangle(48, 4, 32, 26));
      fill(px, c.head, triangle(48, 8, 30, 21));
    },
    'head-crown': () => {
      fill(px, c.head, rect(28, 22, 40, 9));
      fill(px, c.head, triangle(33, 8, 22, 6));
      fill(px, c.head, triangle(48, 6, 22, 6));
      fill(px, c.head, triangle(63, 8, 22, 6));
    },
    'head-mythic': () => fill(px, c.accent, ring(48, 16, 17, 12)),
    // Body: lower half.
    'body-starter': () => fill(px, c.body, rect(26, 60, 44, 9)),
    'body-scout': () => {
      fill(px, darken(c.body, 0.7), rect(30, 54, 36, 28));
      fill(px, c.body, rect(33, 57, 30, 22));
    },
    'body-knight': () => {
      fill(px, darken(c.body, 0.6), roundedRect(28, 50, 40, 34, 8));
      fill(px, c.body, roundedRect(32, 54, 32, 26, 6));
      fill(px, darken(c.body, 0.6), rect(46, 54, 4, 26));
    },
    'body-mythic': () => {
      fill(px, darken(c.accent, 0.75), triangle(48, 92, 54, 26));
      fill(px, c.accent, triangle(48, 88, 56, 22));
    },
    // Accessory: small, off to a corner.
    'acc-starter': () => fill(px, c.accent, circle(72, 66, 5)),
    'acc-charm': () => {
      fill(px, darken(c.accent, 0.7), diamond(72, 68, 9));
      fill(px, c.accent, diamond(72, 68, 6));
    },
    'acc-banner': () => {
      fill(px, darken(c.head, 0.55), rect(66, 14, 3, 28));
      fill(px, c.head, rect(69, 14, 17, 11));
    },
    'acc-mythic': () => {
      fill(px, c.accent, triangle(72, 8, 28, 13));
      fill(px, c.accent, triangle(72, 36, 16, 13));
    },
  }[key];
  draw();
  return rgbaPng(px, SIZE);
};

const COSMETIC_KEYS = [
  'head-starter',
  'head-guard',
  'head-crown',
  'head-mythic',
  'body-starter',
  'body-scout',
  'body-knight',
  'body-mythic',
  'acc-starter',
  'acc-charm',
  'acc-banner',
  'acc-mythic',
];

// ---------------------------------------------------------------------------
// WAV (silence)
// ---------------------------------------------------------------------------

const silentWav = () => {
  const sampleRate = 8000;
  const samples = 1600; // 0.2s, 8-bit mono
  const data = Buffer.alloc(samples, 128);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate, 28); // byte rate
  header.writeUInt16LE(1, 32); // block align
  header.writeUInt16LE(8, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(samples, 40);
  return Buffer.concat([header, data]);
};

// ---------------------------------------------------------------------------
// Per-pack palettes (roughly matching themes/*.ts)
// ---------------------------------------------------------------------------

const packs = {
  'high-fantasy': {
    icons: { quest: '#3b6ea5', loot: '#c9a227', gold: '#c9a227', streak: '#a83232' },
    bases: ['#7a4fbf', '#3b6ea5', '#3e7c4f'],
    cosmetics: { head: '#c9a227', body: '#3b6ea5', accent: '#7a4fbf' },
  },
  'sci-fi': {
    icons: { quest: '#4f7cff', loot: '#59e3f0', gold: '#59e3f0', streak: '#ff4d5e' },
    bases: ['#b173ff', '#4f7cff', '#59e3f0'],
    cosmetics: { head: '#59e3f0', body: '#4f7cff', accent: '#b173ff' },
  },
  'retro-gaming': {
    icons: { quest: '#4ac8ff', loot: '#ffd83d', gold: '#ffd83d', streak: '#ff5555' },
    bases: ['#ff7ac8', '#4ac8ff', '#ffd83d'],
    cosmetics: { head: '#ffd83d', body: '#4ac8ff', accent: '#ff7ac8' },
  },
};

const root = path.join(__dirname, '..');
const sounds = ['quest-complete', 'level-up', 'gold-pickup', 'loot-redeem'];
const baseShapes = ['circle', 'square', 'diamond'];
const baseNames = ['a', 'b', 'c'];

for (const [pack, palette] of Object.entries(packs)) {
  const imgDir = path.join(root, 'assets', 'images', 'themes', pack);
  const sndDir = path.join(root, 'assets', 'sounds', 'themes', pack);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(sndDir, { recursive: true });
  for (const icon of ['quest', 'loot', 'gold', 'streak']) {
    fs.writeFileSync(path.join(imgDir, `icon-${icon}.png`), solidPng(palette.icons[icon]));
  }
  baseShapes.forEach((shape, i) => {
    fs.writeFileSync(
      path.join(imgDir, `avatar-${baseNames[i]}.png`),
      drawBase(shape, palette.bases[i]),
    );
  });
  for (const key of COSMETIC_KEYS) {
    fs.writeFileSync(
      path.join(imgDir, `cosmetic-${key}.png`),
      drawCosmetic(key, palette.cosmetics),
    );
  }
  for (const sound of sounds) {
    fs.writeFileSync(path.join(sndDir, `${sound}.wav`), silentWav());
  }
  console.log(`wrote placeholders for ${pack}`);
}
