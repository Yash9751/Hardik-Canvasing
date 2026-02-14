const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function safeResolve(rootDir, urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const cleaned = decoded.replace(/\0/g, '');
  const joined = path.join(rootDir, cleaned);
  const resolved = path.resolve(joined);
  const rootResolved = path.resolve(rootDir);
  if (!resolved.startsWith(rootResolved)) return null;
  return resolved;
}

function startStaticServer(rootDir) {
  const indexFile = path.join(rootDir, 'index.html');

  const server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      const filePath = safeResolve(rootDir, u.pathname);
      if (!filePath) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }

      let candidate = filePath;
      if (candidate.endsWith(path.sep)) candidate = path.join(candidate, 'index.html');

      const exists = fs.existsSync(candidate) && fs.statSync(candidate).isFile();
      const target = exists ? candidate : indexFile; // SPA fallback

      const ext = path.extname(target).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', mime);
      // Allow loading fonts/resources
      res.setHeader('Access-Control-Allow-Origin', '*');

      fs.createReadStream(target)
        .on('error', () => {
          res.writeHead(500);
          res.end('Server error');
        })
        .pipe(res);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

module.exports = { startStaticServer };

