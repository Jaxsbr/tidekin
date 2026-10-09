import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import { createGame, serializeGame, getContext } from '../captures/second-improvement/baseline/source-reference/game.js';
const out = new URL('../captures/second-improvement/baseline/', import.meta.url);
const base = process.env.TIDEKIN_BASE_URL || 'http://127.0.0.1:5181';
const hash = b => createHash('sha256').update(b).digest('hex');
const report = { generatedAt: new Date().toISOString(), base, isolation: 'Fresh browser.newContext per viewport/fixture; no persistent user profiles or user saves', results: [], errors: [], fixtures: [], exactHumanReproduction: false };
await mkdir(out, { recursive: true });
async function fingerprint() {
  const html = await (await fetch(base)).text();
  const paths = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(m => m[1]);
  const files = [{ path: '/', sha256: hash(html), diskMatches: hash(await readFile(new URL('../captures/second-improvement/baseline/dist-beta3/index.html', import.meta.url))) === hash(html) }];
  for (const path of paths) { const b = Buffer.from(await (await fetch(base + path)).arrayBuffer()); files.push({ path, sha256: hash(b), bytes: b.length, diskMatches: hash(await readFile(new URL('../captures/second-improvement/baseline/dist-beta3' + path, import.meta.url))) === hash(b) }); }
  return { files, buildHash: hash(JSON.stringify(files)), production: !html.includes('/@vite/client') && paths.some(p => p.endsWith('.js')) };
}
report.before = await fingerprint();
await writeFile(new URL(process.argv.includes('--fixtures-only') || process.argv.includes('--arrival-only') ? 'fixture-fingerprint.json' : 'fingerprint-before.json', out), JSON.stringify(report.before, null, 2));
let browser;
const args = ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];
try { browser = await chromium.launch({ headless: true, args }); report.launch = 'cached Chromium'; }
catch (e) { report.cachedLaunchFailure = e.message; browser = await chromium.launch({ headless: true, channel: 'chrome', args }); report.launch = 'installed Chrome fallback'; }
report.browser = browser.version(); report.host = { os: os.platform(), release: os.release(), arch: os.arch() };
const state = p => p.evaluate(() => window.__tidekin?.getState());
const metrics = p => p.evaluate(() => window.__tidekin?.getMetrics());
async function shot(p, name) { await p.screenshot({ path: new URL(name + '.png', out).pathname }); }
async function observe(p) { return { state: await state(p), metrics: await metrics(p), ui: await p.evaluate(() => ({ text: document.body.innerText, hint: document.querySelector('#context-hint')?.textContent, title: document.querySelector('#gather-button')?.title, disabled: document.querySelector('#gather-button')?.disabled, scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight], viewport: [innerWidth, innerHeight] })) }; }
async function context(viewport, fixture) {
 const c = await browser.newContext({ viewport, deviceScaleFactor: 1 });
 if (fixture) await c.addInitScript(save => localStorage.setItem('tidekin.save.v2', save), serializeGame(fixture));
 const p = await c.newPage(); p.setDefaultTimeout(15000);
 p.on('pageerror', e => report.errors.push(e.message));
 p.on('requestfailed', r => report.errors.push({ url: r.url(), failure: r.failure() }));
 await p.goto(base + '/?qa=1', { waitUntil: 'networkidle' });
 return { c, p };
}
if (process.argv.includes('--arrival-only')) {
 for (const viewport of [{width:1440,height:900},{width:900,height:900}]) {
 const {c,p} = await context(viewport); const name = `${viewport.width}x${viewport.height}`;
 await p.waitForTimeout(500); await shot(p, `title-stable-${name}`);
 await p.locator('#new-voyage').click(); await p.waitForTimeout(700);
 await shot(p, `new-first-view-stable-${name}`); await c.close();
 }
 await browser.close(); console.log('Stable opening supplements retained; original captures preserved.'); process.exit(0);
}
try {
if (!process.argv.includes('--fixtures-only')) for (const viewport of [{ width: 1440, height: 900 }, { width: 900, height: 900 }]) {
 const name = `${viewport.width}x${viewport.height}`; const { c, p } = await context(viewport);
 try {
 await shot(p, `title-${name}`);
 await p.locator('#new-voyage').click(); await shot(p, `new-first-view-${name}`);
 report.results.push({ name: `new-first-view-${name}`, observation: await observe(p) });
 await p.getByRole('button', { name: /begin voyage/i }).click();
 await p.locator('#game-canvas').waitFor({ state: 'visible' }); await p.waitForTimeout(2000);
 await shot(p, `water-gameplay-${name}`); report.results.push({ name: `water-gameplay-${name}`, observation: await observe(p) });
 await p.keyboard.press('Space'); await p.waitForTimeout(500); await shot(p, `old-dive-${name}`);
 report.results.push({ name: `old-dive-${name}`, observation: await observe(p) });
 await p.keyboard.press('Space');
 if (viewport.width === 1440) {
 report.graphics = await p.locator('#game-canvas').evaluate(canvas => { const gl = canvas.getContext('webgl2') || canvas.getContext('webgl'); const ext = gl?.getExtension('WEBGL_debug_renderer_info'); return gl ? { renderer: gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER), vendor: gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight] } : null; });
 await p.waitForTimeout(5000); const before = await metrics(p);
 const sample = await p.evaluate(() => new Promise(resolve => { const intervals = []; let previous; const start = performance.now(); function frame(now) { if (previous !== undefined) intervals.push(now - previous); previous = now; if (now - start >= 20000) resolve({ elapsed: now - start, intervals }); else requestAnimationFrame(frame); } requestAnimationFrame(frame); }));
 const sorted = [...sample.intervals].sort((a,b) => a-b); const percentile = x => sorted[Math.ceil(sorted.length*x)-1];
 const software = /swiftshader|llvmpipe|software/i.test(JSON.stringify(report.graphics));
 const circuit = []; for (const key of ['d','s','a','w']) { const from = await state(p); await p.keyboard.down(key); await p.waitForTimeout(700); await p.keyboard.up(key); circuit.push({ key, from: from.position, to: (await state(p)).position }); }
 report.benchmark = { warmupMs: 5000, durationMs: sample.elapsed, viewport, dpr: 1, quality: before?.quality, software, medianMs: percentile(.5), p95Ms: percentile(.95), framesOver50ms: sorted.filter(x => x > 50).length, samples: sorted.length, before, afterCircuit: await metrics(p), circuit, hardwareBudgetEvaluated: !software, meetsHardwareBudget: software ? null : percentile(.5) <=20 && percentile(.95)<=33.4, intervals: sample.intervals, caveat: 'rAF sampled stationary surfaced gameplay; circuit measured afterward using real inputs. CPU submit timings are not GPU time.' };
 }
 } catch(e) { report.results.push({ name, status: 'fail', error: e.stack }); await shot(p, `failure-${name}`).catch(()=>{}); } finally { await c.close(); }
}
if (!process.argv.includes('--fixtures-only')) await writeFile(new URL('capture-ready.json', out), JSON.stringify({ readyAt: new Date().toISOString(), build: report.before, results: report.results.map(r=>({name:r.name,status:r.status || 'captured'})) }, null, 2));
console.log('Explicit fixture checks starting; original matched captures remain retained.');
// Each fixture seeds only initial save state. E/Space and wait are real browser inputs;
// no QA action calls, clock overrides, or runtime state mutation.
for (const [label, position] of [['floating-shore', { x:4,z:1 }], ['tidal', {x:6,z:6}], ['overlap-target', {x:5,z:3.6}]]) {
 for (const time of [0,60,90,135,170]) {
 const f = createGame(); f.position = position; f.time = time;
 if (label === 'tidal') { f.collected = ['home-driftwood']; f.stats.gathered.wood = 4; f.inventory.wood += 4; }
 const {c,p} = await context({width:1440,height:900},f);
 try { await p.locator('#continue-voyage').click(); await p.waitForTimeout(350);
 const before = await observe(p); const target = getContext(before.state);
 await p.keyboard.press('e'); await p.waitForTimeout(200); const after = await observe(p);
 const item = { label, seeded: {position,time,collected:f.collected}, input: 'KeyE', before, targeting: { nearest:target.nearest,gatherTarget:target.gatherTarget,nearby:target.nearby,tide:target.tide }, after, added: after.state.collected.filter(id=>!before.state.collected.includes(id)) };
 report.fixtures.push(item); await shot(p, `fixture-${label}-${time}`);
 } catch(e) { report.fixtures.push({label,time,status:'fail',error:e.stack}); await shot(p,`failure-${label}-${time}`).catch(()=>{}); } finally {await c.close();}
 }
}
// Continuous real-time rising/falling sequence near tidal log; no injected clock after entry.
const f = createGame(); f.position = {x:6,z:6}; f.time = 55; f.collected = ['home-driftwood']; f.stats.gathered.wood = 4; f.inventory.wood += 4;
const {c,p} = await context({width:1440,height:900},f);
try { await p.locator('#continue-voyage').click(); await p.waitForFunction(() => window.__tidekin?.getState()?.position); report.continuousSequence = { fixture: 'time55, tidal log position, shore log removed; not human save', samples: [] };
for (const time of [56,90,135,145,150]) { await p.waitForFunction(t => window.__tidekin.getState().time >= t,time,{timeout:60000}); const before = await observe(p); await p.keyboard.press('e'); await p.waitForTimeout(150); report.continuousSequence.samples.push({before, after:await observe(p), input:'KeyE'}); await shot(p,`continuous-tidal-${time}`); console.log('Continuous tide sample '+time); }
} finally {await c.close();}
report.after = await fingerprint(); report.buildUnchanged = report.before.buildHash === report.after.buildHash;
} catch(e) {report.fatal=e.stack;} finally { await browser.close(); await writeFile(new URL(process.argv.includes('--fixtures-only') ? 'fixture-results-final.json' : 'baseline-results.json',out), JSON.stringify(report,null,2)); }
console.log(JSON.stringify({buildHash:report.before.buildHash, unchanged:report.buildUnchanged, graphics:report.graphics, benchmark:report.benchmark && {median:report.benchmark.medianMs,p95:report.benchmark.p95Ms,software:report.benchmark.software}, fixtures:report.fixtures.length, fatal:report.fatal}));
