const fs = require('fs');
const path = require('path');

// Minimal PNG generator - creates solid orange (#f7931a) icons
// PNG structure: signature + IHDR + IDAT + IEND

function createPNG(size, r, g, b) {
  const width = size;
  const height = size;
  
  // Raw image data (RGBA) - each row has filter byte (0) + pixel data
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter: none
    for (let x = 0; x < width; x++) {
      // Create a circle with "H" shape feel
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.42;
      
      if (dist < radius) {
        // Inside circle - orange
        rawData.push(r, g, b, 255);
      } else if (dist < radius + 2) {
        // Edge anti-alias
        rawData.push(r, g, b, 128);
      } else {
        // Outside - transparent
        rawData.push(0, 0, 0, 0);
      }
    }
  }
  
  const rawBuffer = Buffer.from(rawData);
  
  // Deflate the raw data
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawBuffer);
  
  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);
  
  // IDAT chunk
  const idat = makeChunk('IDAT', compressed);
  
  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type, 'ascii');
  
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

const publicDir = path.join(__dirname, 'public');
const orange = [247, 147, 26]; // #f7931a

// Generate icons
const sizes = [192, 512, 180]; // 192=android, 512=android splash, 180=apple-touch
const names = ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

sizes.forEach((size, i) => {
  const png = createPNG(size, ...orange);
  const outPath = path.join(publicDir, names[i]);
  fs.writeFileSync(outPath, png);
  console.log(`Generated ${names[i]} (${size}x${size})`);
});

console.log('All icons generated!');
