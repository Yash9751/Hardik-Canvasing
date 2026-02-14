const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktopDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(desktopDir, '..', 'frontend');
const expoOutDirName = 'web-build';
const expoOutDir = path.join(frontendDir, expoOutDirName);
const rendererDir = path.join(desktopDir, 'renderer');

function rmDirSafe(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

console.log('[build:web] Exporting Expo web…');
rmDirSafe(expoOutDir);

const exportRes = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', expoOutDirName],
  { cwd: frontendDir, stdio: 'inherit' }
);

if (exportRes.status !== 0) process.exit(exportRes.status || 1);

console.log('[build:web] Copying web build into desktop/renderer…');
rmDirSafe(rendererDir);
copyDir(expoOutDir, rendererDir);

console.log('[build:web] Done.');

