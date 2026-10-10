import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lowPathOptions, isOceanAtlas, validateAtlasRequests } from '../scripts/qa/low-path.mjs';

const released = [
  '--run', '--browser-released', '--build-ready', '--outside-benchmark',
  '--url=http://127.0.0.1:5182', '--build=.scratch/selected-root',
  '--expected-entry=index-selected.js', '--expected-scene=scene-selected.js',
  '--expected-css=index-selected.css', '--out=captures/qa-low-guard-only',
  '--published-url=http://127.0.0.1:5183/tidekin/',
  '--published-build=.scratch/selected-published',
  '--published-entry=index-published.js', '--published-scene=scene-published.js',
  '--published-css=index-published.css', '--provenance=.scratch/selected-provenance.json',
  '--expected-helper=' + 'a'.repeat(64),
];

test('Low/path prepares and imports without activating browser or evidence writes', () => {
  assert.equal(lowPathOptions().run, false);
  const result = spawnSync(process.execPath, ['scripts/qa/low-path.mjs', '--prepare'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /prepared only; no browser\/network\/evidence writes/);
});

test('Low/path release requires every independent activation and identity gate', () => {
  const config = lowPathOptions(released);
  assert.equal(config.run, true);
  assert.equal(config.deadlineMs, 180000);
  for (const missing of released.filter(arg => arg !== '--run'))
    assert.throws(() => lowPathOptions(released.filter(arg => arg !== missing)), undefined, missing);
});

test('Low/path rejects unsafe published origins, paths and ambiguous identities', () => {
  const replace = (prefix, value) => released.map(arg => arg.startsWith(prefix) ? prefix + value : arg);
  for (const url of [
    'https://example.com/tidekin/', 'http://127.0.0.1:5183/',
    'http://127.0.0.1:5183/tidekin/?qa=1', 'http://user:pass@localhost/tidekin/',
  ]) assert.throws(() => lowPathOptions(replace('--published-url=', url)));
  for (const value of ['../index.js', 'index.css'])
    assert.throws(() => lowPathOptions(replace('--published-entry=', value)));
  assert.throws(() => lowPathOptions([...released, '--published-entry=other.js']));
  assert.throws(() => lowPathOptions(replace('--published-css=', '')));
  assert.throws(() => lowPathOptions(replace('--expected-helper=', 'not-a-hash')));
  assert.throws(() => lowPathOptions([...released, '--deadline-ms=180001']));
  assert.throws(() => lowPathOptions([...released, '--diagnostic-mode=art-rest-waterline']));
});

test('Low/path atlas identity rejects the previous keepsake-sheet false requirement', () => {
  assert(isOceanAtlas('/assets/ui-fourth/ocean-kit-atlas.png'));
  assert(isOceanAtlas('/tidekin/assets/ocean-kit-atlas-Ab_12.png'));
  assert(!isOceanAtlas('/assets/ui/keepsakes-atlas.png'));
  assert(!isOceanAtlas('/assets/not-ocean-kit-atlas.png'));
  const expected = 'http://127.0.0.1:5183/tidekin/assets/ui-fourth/ocean-kit-atlas.png';
  const ok = { url: expected, status: 200 };
  validateAtlasRequests([ok], expected);
  for (const requests of [
    [], [ok, ok], [{ ...ok, status: 404 }],
    [{ ...ok, url: expected.replace('/tidekin/', '/') }],
    [{ ...ok, url: expected.replace('ocean-kit-atlas', 'keepsakes-atlas') }],
  ]) assert.throws(() => validateAtlasRequests(requests, expected));
});
