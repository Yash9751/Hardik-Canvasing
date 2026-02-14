const { app, BrowserWindow } = require('electron');
const path = require('path');
const { startStaticServer } = require('./static-server');

let splashWindow = null;
let mainWindow = null;
let staticServer = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    resizable: false,
    movable: true,
    show: true,
    backgroundColor: '#ffffff',
    center: true,
    alwaysOnTop: true,
    webPreferences: {
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Traders',
    show: false,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // If you want a dev server URL, set ELECTRON_START_URL
  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
    return;
  }

  // Production: serve the exported Expo web build over a local HTTP server
  // (Expo export uses absolute paths like /assets/... which don't work with file://)
  const rendererDir = path.join(__dirname, 'renderer');
  startStaticServer(rendererDir)
    .then(({ server, url }) => {
      staticServer = server;
      return mainWindow.loadURL(url);
    })
    .catch((err) => {
      console.error('Failed to start local static server:', err);
      // fallback: try file://
      mainWindow.loadFile(path.join(rendererDir, 'index.html'));
    });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) splashWindow.close();
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    try { staticServer.close(); } catch (_) {}
    staticServer = null;
  }
  if (process.platform !== 'darwin') app.quit();
});

