import { readFile, readdir, lstat, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname, extname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Vector3, Quaternion, Box3 } from 'three';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safePath = path => typeof path === 'string' && path.length > 0 && !isAbsolute(path) && !path.includes('\\') && !path.split('/').some(part => !part || part === '..' || part === '.');

/** Inspect bytes without starting an image renderer, Blender, or a browser. */
export async function inspectAssetFile(path) {
  const bytes = await readFile(path);
  const result = { bytes: bytes.length, sha256: sha256(bytes) };
  if (extname(path) === '.png') {
    if (bytes.length < 33 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG header');
    result.dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), unit: 'px' };
  } else if (extname(path) === '.svg') {
    const tag = bytes.toString().match(/<svg\b[^>]*>/)?.[0] ?? '';
    const width = tag.match(/\bwidth="([\d.]+)(?:px)?"/)?.[1];
    const height = tag.match(/\bheight="([\d.]+)(?:px)?"/)?.[1];
    const view = tag.match(/\bviewBox="([^\"]+)"/)?.[1].split(/[ ,]+/).map(Number);
    if (!tag) throw new Error('Invalid SVG root');
    if (width && height) result.dimensions = { width: Number(width), height: Number(height), unit: 'px' };
    else if (view?.length === 4) result.dimensions = { width: view[2], height: view[3], unit: 'viewBox' };
  } else if (extname(path) === '.glb') {
    if (bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length || bytes.readUInt32LE(16) !== 0x4e4f534a) throw new Error('Invalid GLB header');
    const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
    result.model = { meshes: gltf.meshes?.length ?? 0, materials: gltf.materials?.length ?? 0, nodes: gltf.nodes?.map(node => node.name).filter(Boolean) ?? [] };
    const bounds = new Box3();
    function visit(index, parent, ancestors = new Set()) {
      if (ancestors.has(index)) throw new Error('Cyclic GLB node hierarchy');
      const node = gltf.nodes[index];
      const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0,0,0]), new Quaternion().fromArray(node.rotation ?? [0,0,0,1]), new Vector3().fromArray(node.scale ?? [1,1,1]));
      const world = parent.clone().multiply(local);
      for (const primitive of gltf.meshes?.[node.mesh]?.primitives ?? []) {
        const accessor = gltf.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min || !accessor?.max) throw new Error('GLB POSITION bounds missing');
        const box = new Box3(new Vector3().fromArray(accessor.min), new Vector3().fromArray(accessor.max));
        bounds.union(box.applyMatrix4(world));
      }
      for (const child of node.children ?? []) visit(child, world, new Set([...ancestors, index]));
    }
    for (const node of gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? []) visit(node, new Matrix4());
    if (!bounds.isEmpty()) result.model.restBounds = { min: bounds.min.toArray(), max: bounds.max.toArray(), dimensions: bounds.getSize(new Vector3()).toArray(), unit: 'gltf-world-unit', method: 'Transformed POSITION accessor boxes in default scene; conservative rest-pose bounds.' };
  }
  return result;
}

async function filesUnder(root, path) {
  const out = [];
  async function walk(path) {
    let stat;
    try { stat = await lstat(resolve(root, path)); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Symlink in catalogue scan: ${path}`);
    if (stat.isDirectory()) for (const entry of (await readdir(resolve(root, path))).sort()) await walk(`${path}/${entry}`);
    else out.push(path);
  }
  await walk(path);
  return out;
}

/** Conservative static inventory, including bounded GLB templates and manifest atlas.
 * Manifest wrapper URLs are packaging outputs: scene.js reads rectangles, not those URLs.
 * Computed future loaders must extend this scanner before a cleanup decision. */
export async function collectRuntimeReferences(root) {
  const refs = [];
  const add = (consumer, path, locator) => {
    if (!refs.some(ref => ref.consumer === consumer && ref.path === path)) refs.push({ consumer, path, locator });
  };
  const sources = ['index.html', ...await filesUnder(root, 'src'), ...await filesUnder(root, 'assets/cleanup')].filter(path => /\.(?:js|css|html)$/.test(path) && path !== 'assets/cleanup/preview.html');
  for (const consumer of sources) {
    const text = await readFile(resolve(root, consumer), 'utf8');
    for (const match of text.matchAll(/["'](\/assets\/[^"'\s?#]+)["']/g)) add(consumer, `public${match[1]}`, match[1]);
    for (const match of text.matchAll(/url\(\s*["']?(\/assets\/[^\s)"'?#]+)["']?\s*\)/g)) add(consumer, `public${match[1]}`, match[1]);
    for (const match of text.matchAll(/(?:from\s*|import\s*\(|url\(\s*)["'](\.{1,2}\/[^"']+)["']/g)) {
      const path = relative(root, resolve(root, dirname(consumer), match[1]));
      if (path.startsWith('assets/') || path.startsWith('src/character/') || path.startsWith('src/geometry/') || ['src/character-art.js', 'src/chart-art.js', 'src/dive-icons.js'].includes(path)) add(consumer, path, match[1]);
    }
    for (const match of text.matchAll(/\$\{import\.meta\.env\.BASE_URL\}(assets\/[\w/.-]+)/g)) add(consumer, `public/${match[1]}`, `BASE_URL${match[1]}`);
    if (text.includes('assets/${name}.glb')) {
      const names = text.match(/\[([^\]]+)\]\.map\(name\s*=>\s*load/)?.[1];
      if (!names) throw new Error(`Unresolved GLB template in ${consumer}`);
      for (const name of names.matchAll(/["']([\w-]+)["']/g)) add(consumer, `public/assets/${name[1]}.glb`, 'bounded GLB loader template');
    }
  }
  // Follow external helper CSS and the exact manifest field consumed at runtime.
  for (let i = 0; i < refs.length; i++) {
    const { path } = refs[i];
    if (extname(path) === '.css') {
      const text = await readFile(resolve(root, path), 'utf8').catch(() => '');
      for (const match of text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)) {
        if (!match[1].startsWith('data:')) add(path, match[1].startsWith('/') ? `public${match[1]}` : relative(root, resolve(root, dirname(path), match[1])), match[1]);
      }
    } else if (path === 'public/assets/ui-fourth/manifest.json') {
      const manifest = JSON.parse(await readFile(resolve(root, path), 'utf8').catch(() => '{}'));
      if (manifest.atlas?.url) add(path, manifest.atlas.url.startsWith('/') ? `public${manifest.atlas.url}` : relative(root, resolve(root, dirname(path), manifest.atlas.url)), 'atlas.url');
    }
  }
  return refs.sort((a, b) => a.path.localeCompare(b.path) || a.consumer.localeCompare(b.consumer));
}

/** Single validation seam. Returns all findings; never edits files or approval state. */
export async function validateCatalogue(catalogue, { root, scanRuntime = true } = {}) {
  const errors = [];
  const fail = message => errors.push(message);
  if (catalogue?.schemaVersion !== 1 || !Array.isArray(catalogue.assets)) return { ok: false, errors: ['Expected schemaVersion 1 and assets array'] };
  if (!root) return { ok: false, errors: ['root is required'] };
  root = await realpath(root);
  const ids = new Map(), paths = new Map(), hashes = new Map();
  for (const asset of catalogue.assets) {
    if (!asset || typeof asset !== 'object') { fail('Invalid asset record'); continue; }
    if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(asset.id ?? '')) fail(`Invalid ID: ${asset.id}`);
    if (ids.has(asset.id)) fail(`Duplicate ID: ${asset.id}`);
    ids.set(asset.id, asset);
    if (!safePath(asset.path)) { fail(`Unsafe path: ${asset.path}`); continue; }
    if (paths.has(asset.path)) fail(`Duplicate path: ${asset.path}`);
    paths.set(asset.path, asset);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 ?? '')) fail(`${asset.id}: invalid SHA-256`);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 1) fail(`${asset.id}: invalid byte count`);
    if (!['baseline', 'approved', 'generated-candidate'].includes(asset.status)) fail(`${asset.id}: invalid status`);
    if (!asset.purpose?.trim() || !asset.origin?.method || !Array.isArray(asset.origin.evidence)) fail(`${asset.id}: purpose and origin evidence are required`);
    if (!Array.isArray(asset.sources) || !Array.isArray(asset.consumers)) { fail(`${asset.id}: sources/consumers arrays required`); continue; }
    if (asset.status === 'generated-candidate' && asset.consumers.length) fail(`${asset.id}: generated candidate has runtime consumers`);
    if (asset.status === 'approved') {
      const approval = asset.approval;
      if (!approval?.by || !approval?.record || !approval?.scope || !approval?.date || approval.sha256 !== asset.sha256) fail(`${asset.id}: approved requires exact-byte human approval evidence`);
      else if (safePath(approval.record)) {
        try { await readFile(resolve(root, approval.record)); } catch { fail(`${asset.id}: missing approval record`); }
      } else fail(`${asset.id}: approval record must be a repository path`);
    } else if (asset.approval != null) fail(`${asset.id}: approval object requires approved status`);
    for (const evidence of asset.origin.evidence) {
      if (!safePath(evidence.path)) { fail(`${asset.id}: unsafe evidence path`); continue; }
      try { await readFile(resolve(root, evidence.path)); } catch { fail(`${asset.id}: missing evidence ${evidence.path}`); }
    }
    for (const consumer of asset.consumers) {
      if (!safePath(consumer.path) || !consumer.locator) { fail(`${asset.id}: invalid consumer`); continue; }
      try { await readFile(resolve(root, consumer.path)); } catch { fail(`${asset.id}: missing consumer ${consumer.path}`); }
    }
    try {
      const actualPath = await realpath(resolve(root, asset.path));
      if (relative(root, actualPath).startsWith('..')) throw new Error('path resolves outside root');
      const actual = await inspectAssetFile(actualPath);
      if (actual.sha256 !== asset.sha256) fail(`${asset.id}: hash mismatch`);
      if (actual.bytes !== asset.bytes) fail(`${asset.id}: byte count mismatch`);
      if (JSON.stringify(actual.dimensions ?? null) !== JSON.stringify(asset.dimensions ?? null)) fail(`${asset.id}: dimensions mismatch`);
      if (actual.model && JSON.stringify(actual.model) !== JSON.stringify(asset.model)) fail(`${asset.id}: model metadata mismatch`);
    } catch (error) { fail(`${asset.id}: cannot inspect ${asset.path}: ${error.message}`); }
    if (!hashes.has(asset.sha256)) hashes.set(asset.sha256, []);
    hashes.get(asset.sha256).push(asset);
  }
  for (const asset of catalogue.assets.filter(asset => asset && Array.isArray(asset.sources))) {
    for (const source of asset.sources) if (!ids.has(source)) fail(`${asset.id}: missing source ID ${source}`);
    if (asset.duplicateOf && (!ids.has(asset.duplicateOf) || ids.get(asset.duplicateOf).sha256 !== asset.sha256 || asset.duplicateOf === asset.id)) fail(`${asset.id}: invalid duplicateOf`);
    const visiting = new Set();
    const visit = id => { if (visiting.has(id)) { fail(`${asset.id}: cyclic sources`); return; } visiting.add(id); for (const source of ids.get(id)?.sources ?? []) visit(source); visiting.delete(id); };
    visit(asset.id);
  }
  for (const group of hashes.values()) if (group.length > 1) {
    const canonical = group.filter(asset => !asset.duplicateOf);
    if (canonical.length !== 1 || group.some(asset => asset !== canonical[0] && asset.duplicateOf !== canonical[0]?.id)) fail(`Unexplained duplicate hash: ${group.map(asset => asset.id).join(', ')}`);
  }
  if (scanRuntime) {
    try {
      const references = await collectRuntimeReferences(root);
      for (const ref of references) {
        const asset = paths.get(ref.path);
        if (!asset) fail(`Uncatalogued runtime reference: ${ref.consumer} -> ${ref.path}`);
        else if (!asset.consumers.some(consumer => consumer.path === ref.consumer)) fail(`${asset.id}: unrecorded runtime consumer ${ref.consumer}`);
      }
      for (const asset of catalogue.assets) for (const consumer of asset?.consumers ?? []) {
        if (!references.some(ref => ref.path === asset.path && ref.consumer === consumer.path)) fail(`${asset.id}: stale runtime consumer ${consumer.path}`);
      }
      for (const path of [...await filesUnder(root, 'assets'), ...await filesUnder(root, 'public/assets')]) {
        if (path !== 'assets/catalogue.json' && !paths.has(path)) fail(`Uncatalogued asset file: ${path}`);
      }
    } catch (error) { fail(`Runtime scan: ${error.message}`); }
  }
  return { ok: errors.length === 0, errors, assets: catalogue.assets.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? '.');
  try {
    const result = await validateCatalogue(JSON.parse(await readFile(resolve(root, 'assets/catalogue.json'), 'utf8')), { root });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
