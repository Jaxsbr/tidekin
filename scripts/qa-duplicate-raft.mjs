import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createGame, serializeGame } from '../src/game.js';

const base = process.env.TIDEKIN_BASE_URL || 'http://127.0.0.1:5186';
const out = `captures/duplicate-raft/${process.env.RAFT_RUN || 'current'}`;
await mkdir(out, { recursive: true });
const saved = createGame();
Object.keys(saved.upgrades).forEach(id => { saved.upgrades[id] = true; });
if (process.env.RAFT_BEACON_OFF) saved.upgrades.beacon = false;
Object.assign(saved, { position: { x: 6, z: 56 }, region: 'horizon', time: 630, day: 4, departed: true });
saved.heading = Math.PI;
saved.inventory = { wood: 71, scrap: 35, pearls: 17 };
saved.discoveries.push('horizon');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
const report = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 940 } });
  let page = await context.newPage();
  // Expose the real scene only inside this isolated browser, without changing app code.
  await context.route('**/src/scene.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    await route.fulfill({ response, body: source.replace('options.onReady?.();', 'window.__raftScene = {scene, camera, boat, update}; options.onReady?.();') });
  });
  await page.goto(`${base}/?qa=1`);
  await page.evaluate(text => localStorage.setItem('tidekin.save.v2', text), serializeGame(saved));
  await page.reload();
  const check = async label => {
    await page.waitForFunction(() => window.__raftScene && window.__tidekin.getMetrics().frames > 3);
    await page.waitForTimeout(250);
    const result = await page.evaluate(() => {
      const { scene, camera, boat } = window.__raftScene;
      const name = boat.children[0].name;
      const rafts = [];
      scene.traverse(o => {
        if (o.name !== name || !o.getObjectByName('Explorer')) return;
        let visible = true;
        for (let p = o; p; p = p.parent) visible &&= p.visible;
        if (visible) rafts.push({ name: o.name, position: o.getWorldPosition(boat.position.clone()).toArray() });
      });
      return { count: rafts.length, rafts, state: window.__tidekin.getState() };
    });
    report.push({ label, ...result });
    await page.screenshot({ path: `${out}/${label}.png` });
    console.log(`${label}: rendered complete rafts=${result.count}; expected=1`);
  };
  await page.locator('#continue-voyage').click();
  await check('continue-beacon');
  await page.locator('#pause-button').click();
  await page.locator('[data-modal-action="menu"]').click();
  await page.locator('#continue-voyage').click();
  await check('save-continue');
  await page.reload();
  await page.locator('#continue-voyage').click();
  await check('reload-continue');
  for (const region of ['home', 'horizon']) {
    const outcome = await page.evaluate(region => window.__tidekin.action('travel', { region }), region);
    assert.equal(outcome.ok, true, `travel ${region}`);
    await check(`travel-${region}`);
  }
  if (!process.env.RAFT_BEACON_OFF) {
    const beforeBuild = structuredClone(saved);
    beforeBuild.upgrades.beacon = false;
    await page.close();
    page = await context.newPage();
    await page.goto(`${base}/?qa=1`);
    await page.evaluate(text => localStorage.setItem('tidekin.save.v2', text), serializeGame(beforeBuild));
    await page.reload();
    await page.locator('#continue-voyage').click();
    await check('before-beacon-build');
    const build = await page.evaluate(() => window.__tidekin.action('build', { upgrade: 'beacon' }));
    assert.equal(build.ok, true, `beacon build succeeds: ${JSON.stringify(build)}`);
    await check('after-beacon-build');
    await page.waitForFunction(() => !window.__tidekin.getMetrics().buildPresentation.active);
    await check('beacon-build-complete');
  }
  const cameraPosition = () => page.evaluate(() => window.__raftScene.camera.position.toArray());
  const beforeOrbit = await cameraPosition();
  await page.mouse.move(900, 450);
  await page.mouse.down();
  await page.mouse.move(1000, 490, { steps: 5 });
  await page.mouse.up();
  assert.notDeepEqual(await cameraPosition(), beforeOrbit, 'drag orbit retained');
  const beforeZoom = await cameraPosition();
  await page.mouse.wheel(0, -250);
  await page.waitForTimeout(100);
  assert.notDeepEqual(await cameraPosition(), beforeZoom, 'mouse zoom retained');
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  for (const result of report) assert.equal(result.count, 1, `${result.label}: duplicate complete raft rendered`);
} finally { await browser.close(); }
