import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 implementation for PNG chunks
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generateIconPNG(size) {
  const width = size;
  const height = size;
  const rowLength = width * 4 + 1; // 1 filter byte + RGBA pixels
  const rawData = Buffer.alloc(rowLength * height);

  const radius = size * 0.22;
  const center = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rect check
      const dx = Math.max(0, Math.abs(x - center + 0.5) - (center - radius - 1));
      const dy = Math.max(0, Math.abs(y - center + 0.5) - (center - radius - 1));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Transparent outside rounded rectangle
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Inside icon - sleek gradient from #6366F1 (99, 102, 241) to #0EA5E9 (14, 165, 233)
      const t = (x + y) / (width + height);
      let r = Math.round(99 + (14 - 99) * t);
      let g = Math.round(102 + (165 - 102) * t);
      let b = Math.round(241 + (233 - 241) * t);
      let a = 255;

      // Anti-aliasing border
      if (dist > radius - 1) {
        a = Math.round(255 * (radius - dist));
      }

      // Draw stylized "C" and "F" emblem in white
      const nx = x / size;
      const ny = y / size;

      // Inner icon emblem (sleek brackets < / > or C F)
      const isEmblem = 
        // Left bracket '<' shape
        (nx >= 0.25 && nx <= 0.45 && Math.abs(ny - 0.5) <= 0.25 && Math.abs((ny - 0.5) * 1.5 - (0.35 - nx)) < 0.08) ||
        // Right bracket '>' shape
        (nx >= 0.55 && nx <= 0.75 && Math.abs(ny - 0.5) <= 0.25 && Math.abs((ny - 0.5) * 1.5 + (0.65 - nx)) < 0.08) ||
        // Central dot or slash '/'
        (Math.abs((ny - 0.5) + (nx - 0.5) * 1.8) < 0.07 && Math.abs(ny - 0.5) < 0.25);

      if (isEmblem && a > 0) {
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const idatData = zlib.deflateSync(rawData);

  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const iconBuffer = generateIconPNG(size);
  const filePath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(filePath, iconBuffer);
  console.log(`Generated ${filePath} (${size}x${size})`);
});
