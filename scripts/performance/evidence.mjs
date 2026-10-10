import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import os from 'node:os';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const digest = value => sha256(JSON.stringify(value));
export async function inventory(directory) {
  const files = [];
  async function visit(path) {
    for (const entry of (await readdir(path, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
      const full = join(path, entry.name);
      if (entry.isSymbolicLink()) throw Error(`Symlink is not reproducible: ${full}`);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) {
        const bytes = await readFile(full);
        files.push({ path: relative(directory, full).split('\\').join('/'), bytes: bytes.length,
          gzipBytes: gzipSync(bytes, { level: 9 }).length, sha256: sha256(bytes) });
      }
    }
  }
  await visit(resolve(directory));
  files.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (!files.some(f => f.path === 'index.html')) throw Error('Production build lacks index.html');
  if ((await readFile(join(directory, 'index.html'), 'utf8')).includes('/@vite/client')) throw Error('Development server is not evidence');
  const totals = { totalBytes: 0, jsBytes: 0, jsGzipBytes: 0, cssBytes: 0, cssGzipBytes: 0, assetBytes: 0 };
  for (const f of files) {
    totals.totalBytes += f.bytes;
    const kind = f.path.endsWith('.js') ? 'js' : f.path.endsWith('.css') ? 'css' : null;
    if (kind) { totals[`${kind}Bytes`] += f.bytes; totals[`${kind}GzipBytes`] += f.gzipBytes; }
    else if (f.path !== 'index.html') totals.assetBytes += f.bytes;
  }
  return { files, totals, hash: digest(files) };
}

export async function sourceFingerprint(root, { gitRoot = root, revision = null } = {}) {
  const git = (...args) => execFileSync('git', ['-C', gitRoot, ...args], { encoding: 'utf8' }).trim();
  const commit = git('rev-parse', revision ?? 'HEAD');
  const committed = git('ls-tree', '-r', '-z', commit).split('\0').filter(Boolean).map(row => {
    const [metadata, path] = row.split('\t'); return { path, blob: metadata.split(' ')[2] };
  });
  const tree = revision ? committed : null;
  const input = path => /^(src|assets|public)\//.test(path) || /^(index\.html|package(?:-lock)?\.json|vite\.config\.[cm]?js)$/.test(path);
  const untracked = tree ? [] : git('ls-files', '--others', '--exclude-standard', '-z').split('\0').filter(input);
  const paths = [...new Set(tree ? tree.map(f => f.path) : [
    ...git('ls-files', '-z').split('\0'), ...untracked,
  ])].filter(input).sort();
  const files = [];
  for (const path of paths) {
    const full = join(root, path);
    // A removed tracked file must be represented, not silently omitted.
    try { const st = await lstat(full); if (!st.isFile()) throw Error(`Non-file source ${path}`);
      const bytes = await readFile(full);
      const gitBlob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      if (tree && gitBlob !== tree.find(f => f.path === path).blob)
        throw Error(`Snapshot differs from revision ${revision}: ${path}`);
      files.push({ path, bytes: bytes.length, sha256: sha256(bytes), gitBlob });
    } catch (e) { if (e.code !== 'ENOENT' || tree) throw e; files.push({ path, missing: true }); }
  }
  const committedInputs = committed.filter(f=>input(f.path)).map(f=>({path:f.path,gitBlob:f.blob})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  const matchesCommit = files.length===committedInputs.length && files.every(f=>committedInputs.some(c=>c.path===f.path&&c.gitBlob===f.gitBlob));
  return { commit, dirty: tree ? false : Boolean(git('status', '--porcelain', '--untracked-files=no')) || untracked.length>0,
    committedInputs, matchesCommit,
    scope: 'Tracked and untracked nonignored src/**, assets/**, public/**, index.html, package manifests, Vite config; excludes evidence and tooling',
    files, hash: digest(files) };
}

export function environment() {
  return { host: os.hostname(), platform: os.platform(), release: os.release(), arch: os.arch(),
    cpus: os.cpus().map(c => c.model), cpuCount: os.cpus().length, memoryBytes: os.totalmem(),
    node: process.version, runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null, runnerImage: process.env.ImageVersion ?? null };
}

export async function harnessFingerprint() {
  const root = new URL('.', import.meta.url);
  const paths = (await readdir(root)).filter(p => /\.(mjs|json)$/.test(p)).sort();
  return digest(await Promise.all(paths.map(async path => ({ path, sha256: sha256(await readFile(new URL(path, root))) }))));
}
