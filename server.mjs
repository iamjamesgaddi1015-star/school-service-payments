import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const allowed = new Map([['/', 'index.html'], ['/index.html', 'index.html'], ['/src/app.js', 'src/app.js'], ['/src/styles.css', 'src/styles.css']]);
for (const file of ['school-route.png', 'instrument-sans-latin-400-normal.woff2', 'instrument-sans-latin-600-normal.woff2']) allowed.set(`/assets/${file}`, `assets/${file}`);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer(async (req, res) => {
  const file = allowed.get(new URL(req.url, 'http://localhost').pathname);
  if (!file || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(404); return res.end('Not found'); }
  try {
    const data = await readFile(path.join(root, file));
    res.writeHead(200, { 'Content-Type': `${types[path.extname(file)]}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https://jjpaxysocfvumjvbbrlb.supabase.co; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(500); res.end('Unable to read app files'); }
});
server.listen(5173, '127.0.0.1', () => console.log('School service ledger: http://localhost:5173'));
