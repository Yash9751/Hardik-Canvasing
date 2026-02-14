const fs = require('fs');
const path = require('path');

async function main() {
  const desktopDir = path.resolve(__dirname, '..');
  const assetsDir = path.join(desktopDir, 'assets');
  const srcPng = path.join(assetsDir, 'logo.png');
  const squarePng = path.join(assetsDir, 'logo-square.png');
  const outIco = path.join(assetsDir, 'icon.ico');

  if (!fs.existsSync(srcPng)) {
    console.error(`[make:ico] Missing logo: ${srcPng}`);
    process.exit(1);
  }

  fs.mkdirSync(assetsDir, { recursive: true });

  // Make sure we have a square PNG first (png-to-ico requires it)
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('[make:ico] Dependency "sharp" not installed. Run: npm install');
    process.exit(1);
  }

  console.log(`[make:ico] Creating square PNG ${squarePng} from ${srcPng}…`);
  const img = sharp(srcPng);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  const size = Math.max(w, h) || 256;

  // Pad to square (transparent background)
  await img
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(squarePng);

  // Lazy-require so the error message is clearer if deps not installed
  let pngToIco;
  try {
    pngToIco = require('png-to-ico');
  } catch (e) {
    console.error('[make:ico] Dependency "png-to-ico" not installed. Run: npm install');
    process.exit(1);
  }

  console.log(`[make:ico] Generating ${outIco} from ${squarePng}…`);
  const icoBuf = await pngToIco(squarePng);
  fs.writeFileSync(outIco, icoBuf);
  console.log('[make:ico] Done.');
}

main().catch((err) => {
  console.error('[make:ico] Failed:', err);
  process.exit(1);
});

