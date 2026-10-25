import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
};
function publicFile(path) {
  const parts = path.split('/');
  if (parts.some(part => !part || part.startsWith('.') || /[\\\0%]/.test(part))) return false;
  if (['index.html', 'cards.html', '404.html', 'cv/resume.html'].includes(path)) return true;
  return ['assets', 'css', 'js'].includes(parts[0]) && Boolean(mime[extname(path)]);
}

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Also prevent speculative connections / fonts independently of Playwright routing.
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; base-uri 'self'");
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  try {
    // Validate before URL normalization, including encoded traversal and Windows separators.
    const path = decodeURIComponent(req.url.split('?')[0]);
    const local = path === '/' ? 'index.html' : path.slice(1);
    if (!path.startsWith('/') || !publicFile(local)) { res.writeHead(404).end(); return; }
    const file = await realpath(resolve(root, local));
    const resolved = relative(root, file).split(sep).join('/');
    if (!publicFile(resolved) || !(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Length': body.length });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    res.writeHead(error instanceof URIError ? 400 : 404).end();
  }
}).listen(4173, '127.0.0.1');
