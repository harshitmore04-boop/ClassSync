import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const publicRoot = fileURLToPath(new URL('./public/', import.meta.url));
const types = {'.mjs':'text/javascript; charset=utf-8','.csv':'text/csv; charset=utf-8','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.txt':'text/plain; charset=utf-8'};
export async function resolvePublicPath(rawUrl) {
  const url = new URL(rawUrl, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  if (pathname.includes('\0') || pathname.split(/[\\/]/).some(p => p.startsWith('.'))) return null;
  if (pathname === '/') pathname = '/login';
  const base = resolve(publicRoot, '.' + pathname);
  if (base !== resolve(publicRoot) && !base.startsWith(resolve(publicRoot) + sep)) return null;
  for (const candidate of extname(base) ? [base] : [base, base + '.html']) {
    try { if ((await stat(candidate)).isFile()) return candidate; } catch {}
  }
  return null;
}
export async function handleRequest(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, {'Content-Type':'application/json','Allow':'GET, HEAD'});
    response.end(JSON.stringify({error:'This is a local demo server. Live API actions are disabled.'})); return;
  }
  const path = await resolvePublicPath(request.url);
  if (!path) {
    response.writeHead(404, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    response.end('<h1>Demo page not found</h1><p>This launcher does not provide real authentication or a live API. <a href="/login">Open ClassSync and choose a demo</a>.</p>'); return;
  }
  try {
    const bytes = await readFile(path);
    response.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch {
    response.writeHead(500, {'Content-Type':'text/plain; charset=utf-8'}); response.end('Could not read the requested demo file.');
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const port = Number(process.argv[2] || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) { console.error('Choose a port from 1 to 65535.'); process.exit(1); }
  const server = createServer(handleRequest);
  server.on('error', e => {console.error(e.code === 'EADDRINUSE' ? `Port ${port} is occupied. Try: node serve-demo.mjs ${port + 1}` : e.message); process.exitCode = 1;});
  server.listen(port, '127.0.0.1', () => console.log(`ClassSync demo: http://localhost:${port}/login\nChoose Student demo or Teacher demo. Press Ctrl+C to stop.`));
}
