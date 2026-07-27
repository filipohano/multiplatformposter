// Generates simple solid-color placeholder PNG icons (brand square with "MP")
// so the app has real icon files for the PWA manifest / apple-touch-icon
// without depending on an image library. Replace these with real branding later.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";

const crcTable = (() => {
  const table = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function drawIcon(size, bgHex, fgHex) {
  const bg = hexToRgb(bgHex);
  const fg = hexToRgb(fgHex);
  const raw = Buffer.alloc(size * (1 + size * 4));

  // Simple bold "M" glyph made of a couple of diagonal + vertical strokes.
  const margin = Math.round(size * 0.22);
  const strokeW = Math.max(2, Math.round(size * 0.09));

  const isForeground = (x, y) => {
    const left = margin;
    const right = size - margin;
    const top = margin;
    const bottom = size - margin;
    if (x < left || x > right || y < top || y > bottom) return false;

    const nearVertical = (colX) => Math.abs(x - colX) <= strokeW / 2;
    if (nearVertical(left) || nearVertical(right)) return true;

    const midY = top + ((x - left) / (right - left)) * (bottom - top) * 0.6;
    if (Math.abs(y - midY) <= strokeW / 2 && x <= (left + right) / 2) return true;
    const midY2 = bottom - 0.6 * (bottom - top) + ((x - left) / (right - left)) * (bottom - top) * 0.6;
    if (Math.abs(y - midY2) <= strokeW / 2 && x >= (left + right) / 2) return true;

    return false;
  };

  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < size; x++) {
      const fgPixel = isForeground(x, y);
      const [r, g, b] = fgPixel ? fg : bg;
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

const outDir = path.join(process.cwd(), "public", "icons");
const sizes = [
  { size: 180, name: "apple-touch-icon.png" },
  { size: 192, name: "icon-192.png" },
  { size: 512, name: "icon-512.png" },
];

for (const { size, name } of sizes) {
  const png = drawIcon(size, "#5b6cff", "#ffffff");
  writeFileSync(path.join(outDir, name), png);
  console.log(`Generated ${name}`);
}
