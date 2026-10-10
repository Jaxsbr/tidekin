/** Maintained bounded Low-quality root/published acceptance; preparation is default. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, options, fingerprint, loadGame, state, metrics, viewports, hash } from './runtime.mjs';
import { start, enter, swim } from './input.mjs';
import { inventory } from '../performance/evidence.mjs';
import { freshFixture } from '../performance/fixtures.mjs';

const self = fileURLToPath(import.meta.url);
export const isOceanAtlas = path => /(?:^|\/)ocean-kit-atlas(?:-[\w-]+)?\.png$/.test(path);

export function lowPathOptions(args = []) {
  const extras = ['published-url', 'published-build', 'published-entry', 'published-scene', 'published-css', 'provenance', 'expected-helper'];
  const values = {};
  const rootArgs = [];
  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match || !extras.includes(match[1])) rootArgs.push(arg);
    else {
      assert(!(match[1] in values), `Duplicate --${match[1]}`);
      assert(match[2], `Empty --${match[1]}`);
      values[match[1]] = match[2];
    }
  }
  if (!rootArgs.some(arg => arg.startsWith('--deadline-ms='))) rootArgs.push('--deadline-ms=180000');
  const config = options('gameplay', rootArgs);
  assert(config.deadlineMs <= 180000, 'Low/path deadline must not exceed three minutes');
  if (config.run) {
    assert(args.includes('--outside-benchmark'), 'No benchmark may overlap Low/path QA');
    for (const name of extras) assert(values[name], `Explicit --${name}= required`);
    assert(/^[a-f0-9]{64}$/.test(values['expected-helper']), 'Exact helper SHA256 required');
  }
  if (values['published-url']) {
    const url = new URL(values['published-url']);
    assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname), 'Local HTTP published URL required');
    assert(url.pathname === '/tidekin/' && !url.search && !url.hash && !url.username && !url.password, 'Exact published base /tidekin/ required');
  }
  for (const [name, suffix] of [['published-entry', '.js'], ['published-scene', '.js'], ['published-css', '.css']])
    if (values[name]) assert(!/[\\/]/.test(values[name]) && values[name].endsWith(suffix), `Exact ${name} basename required`);
  if (config.run)
    for (const name of ['expectedEntry', 'expectedScene', 'expectedCss'])
      assert(config[name], `Explicit ${name} required for Low/path`);
  return { ...config, lowPath: values };
}

export function validateAtlasRequests(requests, expectedURL) {
  assert.equal(requests.length, 1, 'Actual page must request exactly one ocean-kit atlas');
  assert.equal(requests[0].url, expectedURL, 'Atlas request must use the selected production base');
  assert.equal(requests[0].status, 200, 'Atlas request must succeed');
}

async function main(args) {
  const config = lowPathOptions(args);
  const helperHash = hash(await readFile(self));
  if (!config.run) {
    console.log(`Low/path prepared only; no browser/network/evidence writes. Helper SHA256=${helperHash}`);
    console.log('Run requires explicit release/build-ready/outside-benchmark, root and /tidekin/ production URL/build/entry/scene/CSS, provenance, expected-helper SHA256 and exclusive output. Four native Low cases; no videos or performance run; deadline at most 180000 ms.');
    return;
  }
  const values = config.lowPath;
  assert.equal(values['expected-helper'], helperHash, 'Helper differs from reviewed bytes');
  const provenancePath = resolve(root, values.provenance);
  const targets = [
    { name: 'root', url: config.url + '/', build: config.build, entry: config.expectedEntry, scene: config.expectedScene, css: config.expectedCss },
    { name: 'published', url: values['published-url'], build: resolve(root, values['published-build']), entry: values['published-entry'], scene: values['published-scene'], css: values['published-css'] },
  ];
  await mkdir(dirname(config.out), { recursive: true });
  await mkdir(config.out); // Exclusive fresh output; prior captures stay intact.
  const started = Date.now();
  const report = {
    schema: 1, kind: 'low-path', status: 'running',
    startedAt: new Date(started).toISOString(), helperHash,
    scope: 'Four native Low-quality cases; synthetic valid fresh save with real steering, pointer entry and swimming. Root/published atlas coverage; no earned progression, motion comparison, art approval or performance claim.',
    settings: { quality: 'low', sound: false, reducedMotion: false, largeText: false },
    atlasPurpose: 'Ocean-kit shared CSS/pickup atlas; keepsake UI sheet is a separate asset and is not counted.',
    errors: [], cases: [],
  };
  const signal = AbortSignal.timeout(config.deadlineMs);
  const saveReport = () => writeFile(resolve(config.out, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  async function proof() {
    const provenanceBytes = await readFile(provenancePath);
    const provenance = JSON.parse(provenanceBytes);
    const rootProof = await fingerprint(config);
    assert.equal(rootProof.sources.hash, provenance.source.hash, 'Current inputs differ from reference-build provenance');
    const paths = {};
    for (const target of targets) {
      const build = await inventory(target.build);
      assert.equal(build.hash, provenance[target.name].hash, `${target.name} output differs from provenance`);
      const prefix = new URL(target.url).pathname;
      const html = await readFile(resolve(target.build, 'index.html'), 'utf8');
      assert(!/\/@vite\/client|\/src\/|\/node_modules\//.test(html));
      assert(html.includes(`${prefix}assets/${target.entry}`));
      assert(html.includes(`${prefix}assets/${target.css}`));
      assert((await readFile(resolve(target.build, 'assets', target.entry), 'utf8')).includes(target.scene));
      const atlases = build.files.filter(file => isOceanAtlas(file.path));
      assert.equal(atlases.length, 1, `${target.name} must ship one atlas`);
      const served = [];
      for (const file of build.files) {
        const response = await fetch(new URL(file.path, target.url), { cache: 'no-store', signal });
        assert.equal(response.status, 200, `Production file missing: ${file.path}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.equal(hash(bytes), file.sha256, `Served file differs: ${file.path}`);
        served.push({ path: file.path, status: response.status, sha256: file.sha256 });
      }
      paths[target.name] = { url: target.url, inventoryHash: build.hash, atlas: atlases[0], served };
    }
    return { root: rootProof, paths, provenanceSha256: hash(provenanceBytes), helperHash: hash(await readFile(self)) };
  }
  let browser, timer;
  let stopping = false;
  const contexts = new Set();
  const stop = () => {
    stopping = true;
    browser?.close().catch(() => {});
  };
  try {
    report.before = await proof();
    await saveReport();
    const Game = await loadGame(config);
    const fixture = freshFixture(Game);
    const save = Game.serializeGame(fixture.state);
    Game.deserializeGame(save);
    report.fixture = { label: fixture.label + '; Low/path diagnostic only', saveSha256: hash(save) };
    signal.throwIfAborted();
    const { chromium } = await import('@playwright/test'); // Only after gates and production proof.
    browser = await chromium.launch({ channel: 'chrome', headless: false, timeout: 30000 });
    report.browser = { channel: 'chrome', version: browser.version() };
    timer = setTimeout(stop, Math.max(1, config.deadlineMs - (Date.now() - started)));
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    for (const target of targets) {
      for (const viewport of viewports) {
        assert(!stopping, 'Diagnostic stopped; no new context allowed');
        const name = `${target.name}-${viewport.width}x${viewport.height}-${report.settings.quality}`;
        const dir = resolve(config.out, name);
        await mkdir(dir);
        const record = { name, viewport, url: target.url, status: 'running', errors: [], inputs: [], observations: [], atlases: [] };
        report.cases.push(record);
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference', serviceWorkers: 'block' });
        contexts.add(context);
        try {
          await context.addInitScript(({ save, settings }) => {
            localStorage.setItem('tidekin.save.v2', save);
            localStorage.setItem('tidekin.settings.v1', JSON.stringify(settings));
          }, { save, settings: report.settings });
          const page = await context.newPage();
          page.setDefaultTimeout(10000);
          page.on('pageerror', error => record.errors.push(String(error)));
          page.on('console', message => { if (message.type() === 'error') record.errors.push(message.text()); });
          page.on('requestfailed', request => record.errors.push(`${request.url()}: ${request.failure()?.errorText}`));
          page.on('response', response => {
            if (response.status() >= 400) record.errors.push(`HTTP ${response.status()}: ${response.url()}`);
            if (isOceanAtlas(new URL(response.url()).pathname))
              record.atlases.push({ url: response.url(), status: response.status() });
          });
          const h = {
            p: page, r: record, state: () => state(page),
            click: selector => page.locator(selector).click(),
            key: async (key, ms = 0) => {
              record.inputs.push({ key, ms, at: Date.now() });
              if (!ms) return page.keyboard.press(key);
              await page.keyboard.down(key);
              try { await page.waitForTimeout(ms); }
              finally { await page.keyboard.up(key); }
            },
            check: (label, ok) => assert(ok, label),
            shot: async label => {
              const m = await metrics(page);
              const s = await state(page);
              assert.equal(m.quality, report.settings.quality, 'Validated preferences must apply selected quality');
              assert.equal(m.viewport.width, viewport.width);
              assert.equal(m.viewport.height, viewport.height);
              assert.equal(m.viewport.devicePixelRatio, 1);
              assert(s.cleanup.attempt?.status !== 'failed', 'Dive must remain viable');
              const bytes = await page.screenshot({ path: resolve(dir, `${label}.png`), scale: 'css', animations: 'allow' });
              assert.equal(bytes.readUInt32BE(16), viewport.width);
              assert.equal(bytes.readUInt32BE(20), viewport.height);
              record.observations.push({ label, at: Date.now(), state: s, metrics: m, sha256: hash(bytes) });
            },
          };
          await page.goto(target.url + '?qa=1', { waitUntil: 'networkidle', timeout: 30000 });
          await start(h, true);
          await h.shot('deck');
          await enter(h, 'home-reef', Game); // Ordinary steering and actual buoy pointer.
          await swim(h, { x: 0, y: -13 });
          await h.shot('deep');
          await page.keyboard.down('d');
          record.inputs.push({ key: 'd', action: 'down', at: Date.now() });
          try {
            await page.waitForTimeout(900);
            await h.shot('swim-right');
          } finally {
            await page.keyboard.up('d');
            record.inputs.push({ key: 'd', action: 'up', at: Date.now() });
          }
          assert.equal(record.observations.at(-1).state.cleanup.attempt.facing.x, 1, 'Ordinary held input must produce right facing');
          assert.deepEqual(record.observations.map(observation => observation.label), ['deck', 'deep', 'swim-right']);
          const expectedAtlasURL = new URL(report.before.paths[target.name].atlas.path, target.url).href;
          validateAtlasRequests(record.atlases, expectedAtlasURL);
          assert.equal(record.errors.length, 0, 'No page/console/network errors');
          record.status = 'pass';
        } catch (error) {
          record.status = 'fail';
          record.failure = String(error.stack ?? error);
        } finally {
          await context.close();
          contexts.delete(context);
          record.contextClosed = true;
          await saveReport();
        }
      }
    }
  } catch (error) {
    report.errors.push(String(error.stack ?? error));
  } finally {
    stopping = true;
    clearTimeout(timer);
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    for (const context of contexts) await context.close().catch(error => report.errors.push(`Context release: ${error}`));
    if (browser) {
      try {
        await browser.close();
        report.browserClosedAt = new Date().toISOString();
        console.log(`Low/path Chrome closed at ${report.browserClosedAt}; GPU returned. Final proof on CPU.`);
        await saveReport();
      } catch (error) { report.errors.push(`Browser release: ${error}`); }
    }
    try {
      report.after = await proof();
      report.unchanged = JSON.stringify(report.before) === JSON.stringify(report.after);
    } catch (error) { report.errors.push(`Final proof: ${error}`); report.unchanged = false; }
    report.finishedAt = new Date().toISOString();
    report.status = report.unchanged && report.browserClosedAt && !report.errors.length &&
      report.cases.length === 4 && report.cases.every(c => c.status === 'pass' && c.contextClosed)
      ? 'complete' : 'failed';
    await saveReport();
  }
  console.log(JSON.stringify({ out: config.out, status: report.status, unchanged: report.unchanged,
    browserClosedAt: report.browserClosedAt, cases: report.cases.map(c => ({ name: c.name, status: c.status })) }, null, 2));
  if (report.status !== 'complete') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === self) await main(process.argv.slice(2));
