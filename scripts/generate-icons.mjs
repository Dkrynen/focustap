// Generate FocusTap icons with ethereal glass aesthetic
// Run: node scripts/generate-icons.mjs

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, "..", "src-tauri", "icons");

// Ensure output directory exists
mkdirSync(iconsDir, { recursive: true });

// SVG template for the icon
// Ethereal glass aesthetic: purple gradient circle with glowing center dot
function generateSvg(size) {
  const padding = Math.round(size * 0.12);
  const innerSize = size - padding * 2;
  const dotSize = Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#a599ff" stop-opacity="1" />
      <stop offset="40%" stop-color="#8b7eff" stop-opacity="0.95" />
      <stop offset="75%" stop-color="#6b5ce0" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#4a3fb0" stop-opacity="0.85" />
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.02" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.1" />
    </linearGradient>
    <filter id="glowFilter">
      <feGaussianBlur stdDeviation="${Math.round(size * 0.035)}" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <clipPath id="rounded">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" />
    </clipPath>
  </defs>

  <!-- Outer glass border -->
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="${Math.round(size * 0.2)}"
        fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="${Math.max(1, Math.round(size * 0.012))}" />

  <!-- Background gradient -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.round(innerSize * 0.22)}"
        fill="url(#bg)" />

  <!-- Inner glow overlay -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.round(innerSize * 0.22)}"
        fill="url(#glow)" />

  <!-- Shine overlay -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${Math.round(innerSize * 0.22)}"
        fill="url(#shine)" />

  <!-- Glass edge highlight (top bevel) -->
  <rect x="${padding + Math.round(size * 0.03)}" y="${padding + Math.round(size * 0.03)}"
        width="${innerSize - Math.round(size * 0.06)}" height="${Math.round(innerSize * 0.35)}"
        rx="${Math.round(innerSize * 0.18)}" fill="rgba(255,255,255,0.08)" />

  <!-- Glowing center dot (the "brand dot" from the app header) -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${dotSize}"
          fill="rgba(255,255,255,0.85)" filter="url(#glowFilter)" />
  <circle cx="${size / 2}" cy="${size / 2}" r="${Math.round(dotSize * 0.6)}"
          fill="#ffffff" />

  <!-- Subtle inner ring accent -->
  <circle cx="${size / 2}" cy="${size / 2}" r="${Math.round(innerSize * 0.38)}"
          fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="${Math.max(1, Math.round(size * 0.008))}" />
</svg>`;
}

// Proper ICO container builder
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let offset = header.length + entries.length * 16;
  const dirs = [];

  for (const { width, height, data } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(width === 256 ? 0 : width, 0);
    dir.writeUInt8(height === 256 ? 0 : height, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirs.push(dir);
    offset += data.length;
  }

  return Buffer.concat([header, ...dirs, ...entries.map(e => e.data)]);
}

const pngSizes = [32, 128, 256, 512];
const storeSizes = [
  { name: "Square30x30Logo", size: 30 },
  { name: "Square44x44Logo", size: 44 },
  { name: "Square71x71Logo", size: 71 },
  { name: "Square89x89Logo", size: 89 },
  { name: "Square107x107Logo", size: 107 },
  { name: "Square142x142Logo", size: 142 },
  { name: "Square150x150Logo", size: 150 },
  { name: "Square284x284Logo", size: 284 },
  { name: "Square310x310Logo", size: 310 },
  { name: "StoreLogo", size: 50 },
];

async function main() {
  console.log("Generating FocusTap icons...\n");

  const icoEntries = [];

  // Standard PNGs
  for (const size of pngSizes) {
    const name = size === 256 ? "icon.png" : `${size}x${size}.png`;
    const svg = generateSvg(size);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(iconsDir, name), png);
    console.log(`  ✓ ${name} (${size}x${size})`);
    if (size === 32 || size === 256) {
      icoEntries.push({ width: size, height: size, data: png });
    }
  }

  // 2x variant
  const svg2x = generateSvg(256);
  const png2x = await sharp(Buffer.from(svg2x)).png().toBuffer();
  writeFileSync(join(iconsDir, "128x128@2x.png"), png2x);
  console.log("  ✓ 128x128@2x.png (256x256)");

  // Store logos
  for (const { name, size } of storeSizes) {
    const svg = generateSvg(size);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    writeFileSync(join(iconsDir, `${name}.png`), png);
    console.log(`  ✓ ${name}.png (${size}x${size})`);
  }

  // Proper ICO with multiple sizes
  const icoData = buildIco(icoEntries);
  writeFileSync(join(iconsDir, "icon.ico"), icoData);
  console.log("  ✓ icon.ico");

  // ICNS placeholder (macOS)
  const icnsPng = await sharp(Buffer.from(generateSvg(256))).png().toBuffer();
  writeFileSync(join(iconsDir, "icon.icns"), icnsPng);
  console.log("  ✓ icon.icns");

  console.log("\n✨ All icons generated!");
}

main().catch(console.error);
