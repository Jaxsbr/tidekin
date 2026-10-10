import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { sha256 } from './evidence.mjs';

export async function verifyServedBuild(url, build) {
  if (!['localhost','127.0.0.1'].includes(new URL(url).hostname) || new URL(url).pathname!=='/') throw Error('Local root-base production URL required');
  const protocols = new Map();
  for(const file of build.files) {
    const response=await fetch(url+'/'+file.path);
    if(!response.ok || sha256(Buffer.from(await response.arrayBuffer()))!==file.sha256)throw Error(`Served build mismatch: ${file.path}`);
    const kind=file.path==='index.html'?'html':file.path.endsWith('.js')?'js':file.path.endsWith('.css')?'css':'asset';
    const signature={kind,contentEncoding:response.headers.get('content-encoding'),cacheControl:response.headers.get('cache-control')};
    protocols.set(JSON.stringify(signature),signature);
  }
  return [...protocols.values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'en'));
}

// Serves only the supplied immutable build; never touches another server.
export async function serveBuild(directory) {
  const root = resolve(directory), cache = new Map();
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
    '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.woff2': 'font/woff2' };
  const server = createServer(async (req, res) => {
    try {
      const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname === '/' ? '/index.html' : new URL(req.url, 'http://localhost').pathname));
      if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
      if (!(await stat(path)).isFile()) throw Error('Not a file');
      if (!cache.has(path)) { const raw = await readFile(path); cache.set(path, { raw, gzip: gzipSync(raw, { level: 9 }) }); }
      const body = cache.get(path), compressed = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
      res.writeHead(200, { 'Content-Type': types[extname(path)] ?? 'application/octet-stream',
        'Content-Length': compressed ? body.gzip.length : body.raw.length, 'Cache-Control': 'public, max-age=3600',
        'Vary': 'Accept-Encoding', ...(compressed ? { 'Content-Encoding': 'gzip' } : {}) });
      res.end(compressed ? body.gzip : body.raw);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
}
