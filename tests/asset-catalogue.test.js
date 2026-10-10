import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectAssetFile, validateCatalogue, collectRuntimeReferences } from '../scripts/assets/catalogue.mjs';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'tidekin-catalogue-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'assets'), { recursive: true });
  await mkdir(join(root, 'public/assets'), { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'index.html'), '<link href="/assets/art.svg">');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10" viewBox="0 0 20 10"><path d="M0 0"/></svg>';
  await writeFile(join(root, 'public/assets/art.svg'), svg);
  const asset = { id: 'runtime.art', path: 'public/assets/art.svg', kind: 'runtime-derivative', status: 'baseline', approval: null, purpose: 'Visible illustration', origin: { method: 'original', evidence: [] }, sources: [], consumers: [{ path: 'index.html', locator: '/assets/art.svg' }], ...await inspectAssetFile(join(root, 'public/assets/art.svg')) };
  const catalogue = { schemaVersion: 1, assets: [asset] };
  return { root, catalogue, asset, svg, validate: () => validateCatalogue(catalogue, { root }) };
}
test('valid runtime art is inspected through the public validation interface', async t => {
  const { validate } = await fixture(t);
  assert.deepEqual(await validate(), { ok: true, errors: [], assets: 1 });
});
test('missing runtime files and unrecorded references are actionable findings', async t => {
  const { root, validate } = await fixture(t);
  await writeFile(join(root, 'src/main.js'), 'const image = "/assets/missing.png";');
  const result = await validate();
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('Uncatalogued runtime reference: src/main.js -> public/assets/missing.png')));
});
test('byte mutations, wrong dimensions and stale consumers fail independently', async t => {
  const { root, asset, validate, svg } = await fixture(t);
  await writeFile(join(root, asset.path), svg.replace('width="20"', 'width="30"'));
  await writeFile(join(root, 'index.html'), '<main>removed consumer</main>');
  const result = await validate();
  for (const finding of ['hash mismatch', 'dimensions mismatch', 'stale runtime consumer']) assert.ok(result.errors.some(error => error.includes(finding)), finding);
});
test('stable IDs are unique; duplicate bytes require explicit canonical identity', async t => {
  const { root, catalogue, asset, svg, validate } = await fixture(t);
  await writeFile(join(root, 'assets/copy.svg'), svg);
  const copy = { ...structuredClone(asset), path: 'assets/copy.svg', consumers: [] };
  catalogue.assets.push(copy);
  let result = await validate();
  assert.ok(result.errors.some(error => error.includes('Duplicate ID')));
  assert.ok(result.errors.some(error => error.includes('Unexplained duplicate hash')));
  copy.id = 'source.copy';
  copy.duplicateOf = asset.id;
  assert.equal((await validate()).ok, true);
});
test('missing provenance sources, evidence and source cycles are rejected', async t => {
  const { asset, validate } = await fixture(t);
  asset.sources = ['source.missing', asset.id];
  asset.origin.evidence = [{ path: 'assets/missing-provenance.json' }];
  const result = await validate();
  for (const finding of ['missing source ID', 'missing evidence', 'cyclic sources']) assert.ok(result.errors.some(error => error.includes(finding)), finding);
});
test('a separate generated candidate is valid but cannot silently ship', async t => {
  const { root, catalogue, asset, validate } = await fixture(t);
  const path = 'assets/candidate.svg';
  await writeFile(join(root, path), '<svg width="30" height="15"></svg>');
  const candidate = { ...structuredClone(asset), id: 'candidate.art-v2', path, status: 'generated-candidate', consumers: [], ...await inspectAssetFile(join(root, path)) };
  catalogue.assets.push(candidate);
  assert.equal((await validate()).ok, true);
  candidate.consumers = [{ path: 'index.html', locator: '/assets/art.svg' }];
  assert.ok((await validate()).errors.some(error => error.includes('generated candidate has runtime consumers')));
});
test('approval must bind existing human evidence to these exact bytes', async t => {
  const { root, asset, validate } = await fixture(t);
  asset.status = 'approved';
  asset.approval = { by: 'Human', date: '2026-10-10', scope: 'Main menu', record: 'assets/approval.txt', sha256: '0'.repeat(64) };
  assert.ok((await validate()).errors.some(error => error.includes('exact-byte human approval')));
  asset.approval.sha256 = asset.sha256;
  assert.ok((await validate()).errors.some(error => error.includes('missing approval record')));
  await writeFile(join(root, 'assets/approval.txt'), 'Test approval evidence.');
  // Evidence is also an inventoried source, so this fixture validates the core seam only.
  assert.equal((await validateCatalogue({ schemaVersion: 1, assets: [asset] }, { root, scanRuntime: false })).ok, true);
});
test('paths outside the project and symlink escapes cannot be catalogued', async t => {
  const { root, asset, validate } = await fixture(t);
  asset.path = '../outside.svg';
  assert.ok((await validate()).errors.some(error => error.includes('Unsafe path')));
  asset.path = 'public/assets/art.svg';
  await rm(join(root, asset.path));
  await symlink('/dev/null', join(root, asset.path));
  assert.ok((await validate()).errors.some(error => error.includes('path resolves outside root') || error.includes('Symlink in catalogue scan')));
});
test('bounded GLB templates and relative CSS/manifest atlas consumers are traced', async t => {
  const { root } = await fixture(t);
  await mkdir(join(root, 'public/assets/ui-fourth'));
  await writeFile(join(root, 'src/scene.js'), "const loaded = ['workshop','island','landmarks'].map(name=>load(`${import.meta.env.BASE_URL}assets/${name}.glb`)); const manifest = `${import.meta.env.BASE_URL}assets/ui-fourth/manifest.json`;");
  await writeFile(join(root, 'src/style.css'), '@import url("/assets/ui-fourth/atlas.css");');
  await writeFile(join(root, 'public/assets/ui-fourth/atlas.css'), '.art{background:url("./atlas.png")}');
  await writeFile(join(root, 'public/assets/ui-fourth/manifest.json'), JSON.stringify({ atlas: { url: './atlas.png' }, assets: { wheel: { url: './obsolete-wrapper.svg', rect: [0,0,20,10] } } }));
  const refs = await collectRuntimeReferences(root);
  assert.deepEqual(refs.filter(ref => ref.path.endsWith('.glb')).map(ref => ref.path).sort(), ['public/assets/island.glb','public/assets/landmarks.glb','public/assets/workshop.glb']);
  assert.equal(refs.filter(ref => ref.path === 'public/assets/ui-fourth/atlas.png').length, 2);
  assert.equal(refs.some(ref => ref.path.endsWith('obsolete-wrapper.svg')), false);
});
