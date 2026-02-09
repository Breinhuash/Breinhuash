import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 8000);
const root = process.cwd();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

createServer((req, res) => {
  const rawPath = req.url?.split('?')[0] || '/';
  const safePath = normalize(rawPath).replace(/^\.\.(\/|\\|$)/, '');

  let requested = safePath === '/' ? '/index.html' : safePath;
  let filePath = join(root, requested);

  if (!existsSync(filePath) || (existsSync(filePath) && statSync(filePath).isDirectory())) {
    filePath = join(root, 'index.html');
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
  }

  sendFile(res, filePath);
}).listen(port, () => {
  console.log(`Static server running on http://0.0.0.0:${port}`);
});
