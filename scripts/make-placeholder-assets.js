/**
 * Generates placeholder theme assets so theme pack manifests never 404:
 *   assets/images/themes/<pack>/{icon-quest,icon-loot,icon-gold,icon-streak,avatar-a,avatar-b}.png
 *   assets/sounds/themes/<pack>/{quest-complete,level-up,gold-pickup,loot-redeem}.wav
 * PNGs are 8x8 solid swatches in roughly the pack's palette; WAVs are ~0.2s of
 * silence. Re-run any time: node scripts/make-placeholder-assets.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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

const solidPng = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const size = 8;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array(size).fill([r, g, b]).flat())]);
  const idat = zlib.deflateSync(Buffer.concat(Array(size).fill(row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

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

const packs = {
  'high-fantasy': { quest: '#3b6ea5', loot: '#c9a227', gold: '#c9a227', streak: '#a83232', avatar: '#7a4fbf' },
  'sci-fi': { quest: '#4f7cff', loot: '#59e3f0', gold: '#59e3f0', streak: '#ff4d5e', avatar: '#b173ff' },
  'retro-gaming': { quest: '#4ac8ff', loot: '#ffd83d', gold: '#ffd83d', streak: '#ff5555', avatar: '#ff7ac8' },
};

const root = path.join(__dirname, '..');
const sounds = ['quest-complete', 'level-up', 'gold-pickup', 'loot-redeem'];

for (const [pack, colors] of Object.entries(packs)) {
  const imgDir = path.join(root, 'assets', 'images', 'themes', pack);
  const sndDir = path.join(root, 'assets', 'sounds', 'themes', pack);
  fs.mkdirSync(imgDir, { recursive: true });
  fs.mkdirSync(sndDir, { recursive: true });
  for (const icon of ['quest', 'loot', 'gold', 'streak']) {
    fs.writeFileSync(path.join(imgDir, `icon-${icon}.png`), solidPng(colors[icon]));
  }
  fs.writeFileSync(path.join(imgDir, 'avatar-a.png'), solidPng(colors.avatar));
  fs.writeFileSync(path.join(imgDir, 'avatar-b.png'), solidPng(colors.quest));
  for (const sound of sounds) {
    fs.writeFileSync(path.join(sndDir, `${sound}.wav`), silentWav());
  }
  console.log(`wrote placeholders for ${pack}`);
}
