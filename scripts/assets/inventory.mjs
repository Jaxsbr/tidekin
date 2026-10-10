import { lstat, readdir, readFile, readlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const humanReferences = new Set([
  'captures/player-interview-2026-10-09/jaco-title-annotations.png',
  'captures/player-interview-2026-10-09/jaco-gameplay-annotations.png',
  'captures/current-beta-player-interview-2026-10-09/jaco-log-before-overlap.png',
  'captures/current-beta-player-interview-2026-10-09/jaco-log-high-tide-inactive-gather.png',
]);
export const productionCleanupPaths = [
  ...['module-waterwheel','module-crane','module-greenhouse','module-sail','module-beacon','resource-wood','resource-scrap','resource-pearl','stamp-voyage','stamp-map','stamp-journal','stamp-settings'].map(name => `public/assets/ui-fourth/${name}.svg`),
  'public/assets/ui-fourth/placeholder.png',
];
async function digest(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  return hash.digest('hex');
}
/** Read-only ledger; symlinks are inventoried as links and never traversed. */
export async function inventoryCleanup(root) {
  const entries = [];
  async function walk(path) {
    let stat;
    try { stat = await lstat(resolve(root, path)); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isDirectory()) {
      for (const name of (await readdir(resolve(root, path))).sort()) await walk(`${path}/${name}`);
      return;
    }
    const action = humanReferences.has(path) ? 'retain-human-reference' : path.startsWith('captures/current-improvement/') || path === '.scratch/current-baseline.mjs' || path.startsWith('dist/') ? 'hold-active' : 'proposed-delete';
    const entry = { path, type: stat.isSymbolicLink() ? 'symlink' : 'file', bytes: stat.size, allocatedBytes: stat.blocks * 512, action };
    if (stat.isSymbolicLink()) entry.target = await readlink(resolve(root, path));
    else entry.sha256 = await digest(resolve(root, path));
    if (path.endsWith('.blend') && action === 'proposed-delete') {
      const canonical = `assets/${path.split('/').at(-1)}`;
      const canonicalHash = await digest(resolve(root, canonical)).catch(() => null);
      if (canonicalHash === entry.sha256) entry.duplicateCanonical = canonical;
      else { entry.action = 'hold-source-review'; entry.reason = 'Editable source differs from retained canonical source.'; }
    }
    entries.push(entry);
  }
  for (const path of ['captures', 'output', '.scratch', 'dist', 'dist-beta', 'dist-beta3', ...productionCleanupPaths]) await walk(path);
  const totals = {};
  for (const entry of entries) {
    const zone = entry.path.split('/')[0];
    totals[zone] ??= { files: 0, bytes: 0, allocatedBytes: 0, proposedDeleteBytes: 0 };
    totals[zone].files++;
    totals[zone].bytes += entry.bytes;
    totals[zone].allocatedBytes += entry.allocatedBytes;
    if (entry.action === 'proposed-delete') totals[zone].proposedDeleteBytes += entry.bytes;
  }
  return { schemaVersion: 1, baselineCommit: '79da54bdbd029090d4ed9d6fd3dd2caea1a4847c', observedAt: new Date().toISOString(), authorization: null, ignoredCleanupOwner: 'parent after measurements', note: 'Exact file proposals only. Refresh against frozen paths/hashes before authorization. Active/protected paths are never disposal candidates. No archive copy required.', totals, entries };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await inventoryCleanup(resolve(process.argv[2] ?? '.')), null, 2));
}
