import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createGame, getContext, getExpeditionContext, RIGS, serializeGame } from '../src/game.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = (process.env.TIDEKIN_BASE_URL || 'http://127.0.0.1:5181').replace(/\/$/, '');
const waitArg = process.argv.find(arg => arg.startsWith('--wait-ms='));
const readinessMs = waitArg ? Math.max(0, Number(waitArg.slice('--wait-ms='.length)) || 0) : 2500;
const recoveryOnly = process.argv.includes('--recovery-only');
const finalCandidateOnly = process.argv.includes('--final-candidate-only');
const beta3FunctionalOnly = process.argv.includes('--beta3-functional-only');
const beta3FixturesOnly = process.argv.includes('--beta3-fixtures-only');
const beta3FinalRenderOnly = process.argv.includes('--beta3-final-render-only');
const skipFinalBenchmark = process.argv.includes('--skip-final-benchmark');
const benchmarkMs = 20000;
const saveKey = 'tidekin.save.v2';
const requiredFiles = [
  'src/main.js',
  'public/assets/workshop.glb',
  'public/assets/island.glb',
  'public/assets/landmarks.glb',
];
const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const captureDir = path.join(projectRoot, 'captures', 'qa-' + stamp);
const reportPath = path.join(captureDir, 'qa-results.json');
const results = [];
const runtimeErrors = [];
const failedRequests = [];
const httpFailures = [];
const benignNetworkResponses = [];
const expectedRecoveryEvents = [];
const intentionallyBlockedRequests = new WeakSet();
let intentionallyBlockedGlbCount = 0;
let browserName = 'Chromium cached Playwright';
let browser;
let activePage;

function log(message) {
  process.stdout.write(message + '\n');
}

function record(name, status, details = {}) {
  const item = { name, status, ...details };
  results.push(item);
  log(status.toUpperCase() + ' ' + name + (details.note ? ': ' + details.note : ''));
  return item;
}

async function filesReady() {
  const missing = [];
  for (const relative of requiredFiles) {
    try {
      const info = await stat(path.join(projectRoot, relative));
      if (!info.isFile() || info.size === 0) missing.push(relative + ' (empty or not a file)');
    } catch {
      missing.push(relative);
    }
  }
  return missing;
}

async function waitForReadiness() {
  const deadline = Date.now() + readinessMs;
  let missing = await filesReady();
  let serverReady = false;
  while (Date.now() <= deadline) {
    try {
      const response = await fetch(baseUrl + '/', { signal: AbortSignal.timeout(800) });
      serverReady = response.ok;
    } catch {
      serverReady = false;
    }
    missing = await filesReady();
    if (serverReady && missing.length === 0) return { serverReady, missing };
    if (Date.now() >= deadline) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return { serverReady, missing };
}

async function launchBrowser(forceSwiftshader = false) {
  const args = [
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
  ];
  if (forceSwiftshader) args.push('--use-gl=angle', '--use-angle=swiftshader');
  try {
    browser = await chromium.launch({ headless: true, args });
    browserName = forceSwiftshader
      ? 'Chromium cached Playwright with SwiftShader fallback'
      : 'Chromium cached Playwright';
  } catch (cachedError) {
    try {
      browser = await chromium.launch({ headless: true, channel: 'chrome', args });
      browserName = forceSwiftshader
        ? 'Google Chrome channel with SwiftShader fallback'
        : 'Google Chrome channel fallback';
      log('Cached Playwright Chromium did not launch; using installed Chrome channel.');
    } catch (chromeError) {
      throw new Error(
        'Could not launch cached Chromium or installed Chrome' +
        (forceSwiftshader ? ' with SwiftShader enabled' : '') +
        '. Cached error: ' + cachedError.message + ' Chrome error: ' + chromeError.message,
      );
    }
  }
}

async function ensureWebgl() {
  async function probe() {
    const probePage = await browser.newPage();
    try {
      return await probePage.evaluate(() => {
        const canvas = document.createElement('canvas');
        return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
      });
    } finally {
      await probePage.close();
    }
  }
  if (await probe()) return;
  log('WebGL is unavailable in the standard headless launch; retrying with SwiftShader flags.');
  await browser.close();
  await launchBrowser(true);
  if (!(await probe())) throw new Error('WebGL remained unavailable after the SwiftShader fallback.');
}

function attachDiagnostics(page, label) {
  page.on('pageerror', error => runtimeErrors.push({
    page: label, kind: 'pageerror', message: error.message, stack: error.stack,
  }));
  page.on('console', message => {
    if (message.type() !== 'error' || /Failed to load resource: the server responded with a status of \d{3}/i.test(message.text())) return;
    if (label === 'blocked-glb' && intentionallyBlockedGlbCount > 0
      && /Failed to load resource: net::ERR_FAILED/i.test(message.text())) {
      expectedRecoveryEvents.push({ page: label, kind: 'expected-blocked-resource', message: message.text() });
      return;
    }
    if (label === 'blocked-glb' && /Tidekin world loading failed:/i.test(message.text())) {
      expectedRecoveryEvents.push({ page: label, kind: 'expected-load-error', message: message.text() });
      return;
    }
    runtimeErrors.push({ page: label, kind: 'console.error', message: message.text() });
  });
  page.on('response', response => {
    if (!response.url().startsWith(baseUrl) || response.status() < 400) return;
    const item = {
      page: label, url: response.url(), status: response.status(),
      statusText: response.statusText(),
    };
    if (new URL(response.url()).pathname === '/favicon.ico' && response.status() === 404) {
      benignNetworkResponses.push(item);
    } else httpFailures.push(item);
  });
  page.on('requestfailed', request => {
    if (!request.url().startsWith(baseUrl)) return;
    const item = { page: label, url: request.url(), error: request.failure()?.errorText || 'request failed' };
    if (intentionallyBlockedRequests.has(request)) {
      expectedRecoveryEvents.push({ ...item, kind: 'expected-blocked-request' });
      return;
    }
    failedRequests.push(item);
  });
}

async function drainWebglErrors(page) {
  return page.locator('#game-canvas').evaluate(canvas => {
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) throw new Error('WebGL context disappeared before error check');
    const errors = [];
    for (let attempt = 0; attempt < 32; attempt++) {
      const code = gl.getError();
      if (code === gl.NO_ERROR) return errors;
      errors.push({ code, hex: `0x${code.toString(16)}` });
    }
    throw new Error('WebGL error queue did not drain after 32 reads: ' + JSON.stringify(errors));
  });
}

async function screenshot(page, name) {
  const file = path.join(captureDir, name + '.png');
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  return path.relative(projectRoot, file);
}

async function step(name, action) {
  try {
    const details = await action();
    record(name, 'pass', details || {});
    return { ok: true, details };
  } catch (error) {
    let failureScreenshot = null;
    if (activePage) {
      try {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        failureScreenshot = await screenshot(activePage, 'failure-' + slug);
      } catch {}
    }
    const details = { error: error.message, stack: error.stack, failureScreenshot };
    record(name, 'fail', details);
    return { ok: false, details };
  }
}

async function readQa(page) {
  return page.evaluate(() => {
    const hook = window.__tidekin;
    if (hook === undefined) return { present: false };
    const hookKeys = hook && typeof hook === 'object' ? Object.keys(hook) : [];
    const candidates = [];
    try { if (hook && hook.state !== undefined) candidates.push(['state', hook.state]); } catch {}
    try { if (hook && hook.gameState !== undefined) candidates.push(['gameState', hook.gameState]); } catch {}
    for (const key of ['getState', 'getSnapshot', 'snapshot']) {
      try {
        if (hook && typeof hook[key] === 'function') candidates.push([key, hook[key]()]);
      } catch {}
    }
    if (hook && hook.position && hook.inventory) candidates.push(['hook', hook]);
    let stateSource = null;
    let state = null;
    for (const [source, value] of candidates) {
      const candidate = value && (value.state || value.game || value);
      if (candidate && candidate.position && candidate.inventory) {
        try {
          state = JSON.parse(JSON.stringify(candidate));
          stateSource = source;
          break;
        } catch {}
      }
    }
    let rendererStats = null;
    try {
      if (hook && typeof hook.getMetrics === 'function') {
        rendererStats = JSON.parse(JSON.stringify(hook.getMetrics()));
      }
    } catch {}
    return { present: true, hookKeys, stateSource, state, rendererStats };
  });
}

function gameState(reading) {
  assert.equal(reading.present, true, 'QA inspection hook is absent on a qa=1 URL');
  assert.ok(reading.state, 'QA inspection hook exposes no readable game state; keys: ' +
    JSON.stringify(reading.hookKeys));
  return reading.state;
}

function numericText(text) {
  const value = Number(String(text).replace(/[^0-9.-]/g, ''));
  assert.ok(Number.isFinite(value), 'Expected a numeric resource value, received: ' + text);
  return value;
}

async function clickVisibleButton(locator, description) {
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  await locator.click();
  log('  clicked ' + description);
}

async function dialogIsOpen(page, selector) {
  const dialog = page.locator(selector);
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
  return dialog;
}

async function runMenuChecks(page) {
  const result = await step('Menu, settings, and new-voyage confirmation', async () => {
    await page.goto(baseUrl + '/', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    const unflaggedHook = await page.evaluate(() => window.__tidekin !== undefined);
    assert.equal(unflaggedHook, false, 'QA hook is exposed without qa=1');
    await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#continue-voyage').isHidden(), true,
      'Continue should be hidden for a fresh browser context');
    await screenshot(page, 'menu-1440x900');

    await clickVisibleButton(page.locator('#menu-settings'), 'menu Settings');
    let dialog = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await dialog.innerText()).toLowerCase(), /setting|sound|quality|motion/,
      'Settings dialog has no recognizable settings content');
    const quality = dialog.locator('#quality-setting');
    const initialQuality = await quality.inputValue();
    await quality.selectOption('low');
    assert.equal(await quality.inputValue(), 'low', 'World detail setting did not change to Low');
    await quality.selectOption(initialQuality);
    const reducedMotion = dialog.locator('#motion-setting');
    const initialMotion = await reducedMotion.isChecked();
    await reducedMotion.click();
    assert.equal(await reducedMotion.isChecked(), !initialMotion,
      'Reduced motion setting did not toggle');
    await reducedMotion.click();
    assert.equal(await reducedMotion.isChecked(), initialMotion,
      'Reduced motion setting did not restore its original value');
    await screenshot(page, 'settings-1440x900');
    await clickVisibleButton(dialog.getByRole('button', { name: /all comfortable/i }), 'finish Settings');
    await dialog.waitFor({ state: 'hidden' });

    await clickVisibleButton(page.locator('#new-voyage'), 'Start new voyage');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await dialog.innerText()).toLowerCase(), /ready to cast off|first little adventure/,
      'Fresh-voyage welcome dialog is missing');
    await screenshot(page, 'first-voyage-welcome-1440x900');
    await clickVisibleButton(dialog.getByRole('button', { name: /begin voyage/i }), 'begin first voyage');
    await page.locator('#game-view').waitFor({ state: 'visible', timeout: 10000 });
    await dialog.waitFor({ state: 'hidden' });
    await page.locator('#game-canvas').waitFor({ state: 'visible' });
    return {
      screenshot: 'menu-1440x900.png, settings-1440x900.png, first-voyage-welcome-1440x900.png',
      onboardingConfirmed: true,
    };
  });
  return result.ok;
}

async function runGameplayChecks(page) {
  await step('QA inspection hook and WebGL renderer', async () => {
    const reading = await readQa(page);
    const state = gameState(reading);
    assert.ok(state.position && Number.isFinite(state.position.x) && Number.isFinite(state.position.z),
      'Hook position is not finite');
    assert.ok(state.inventory && Number.isFinite(state.inventory.wood), 'Hook inventory is missing');
    const graphics = await page.locator('#game-canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return { available: false, width: canvas.width, height: canvas.height };
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        available: true,
        width: canvas.width,
        height: canvas.height,
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      };
    });
    assert.equal(graphics.available, true, 'WebGL context is unavailable');
    assert.ok(graphics.width > 0 && graphics.height > 0, 'Canvas has no drawing buffer');
    await screenshot(page, 'gameplay-1440x900');
    return {
      hookKeys: reading.hookKeys,
      stateSource: reading.stateSource,
      rendererStats: reading.rendererStats,
      graphics,
    };
  });

  await step('Keyboard movement', async () => {
    const before = gameState(await readQa(page));
    const canvas = page.locator('#game-canvas');
    await canvas.click({ position: { x: 100, y: 100 } });
    await page.keyboard.down('d');
    await page.waitForTimeout(550);
    await page.keyboard.up('d');
    const after = gameState(await readQa(page));
    const distance = Math.hypot(after.position.x - before.position.x, after.position.z - before.position.z);
    assert.ok(distance > 0.25, 'Holding D did not move the player; displacement=' + distance);
    return { from: before.position, to: after.position, displacement: distance };
  });

  await step('Contextual gather and inventory feedback', async () => {
    const button = page.locator('#gather-button');
    // The starter driftwood is just outside reach at the anchorage. Walk with
    // ordinary D input in short pulses until the UI offers the action.
    for (let i = 0; i < 4 && !(await button.isEnabled()); i += 1) {
      await page.keyboard.down('d');
      await page.waitForTimeout(160);
      await page.keyboard.up('d');
      await page.waitForTimeout(120);
    }
    assert.equal(await button.isEnabled(), true,
      'Gather stayed disabled after moving toward the visible starter salvage');
    const beforeState = gameState(await readQa(page));
    const beforeWood = numericText(await page.locator('#wood-count').innerText());
    await clickVisibleButton(button, 'contextual Gather');
    await page.waitForFunction(previous => {
      const el = document.querySelector('#wood-count');
      return el && Number(el.textContent) > previous;
    }, beforeWood, { timeout: 5000 });
    const afterState = gameState(await readQa(page));
    assert.ok(afterState.inventory.wood > beforeState.inventory.wood,
      'Gather did not increase wood in the read-only QA snapshot');
    assert.ok(Array.isArray(afterState.collected) && afterState.collected.length > 0,
      'Gather did not record a collected salvage node');
    return {
      beforeWood,
      afterWood: numericText(await page.locator('#wood-count').innerText()),
      position: afterState.position,
      collected: afterState.collected,
    };
  });

  await step('Quest journal, progress, and claim', async () => {
    await clickVisibleButton(page.locator('[data-panel="journal"]'), 'Journal');
    const dialog = await dialogIsOpen(page, '#panel-dialog');
    await dialog.getByText('Something from the sea', { exact: false }).waitFor({ state: 'visible' });
    const body = page.locator('#panel-body');
    const claim = body.getByRole('button', { name: /claim/i }).first();
    await clickVisibleButton(claim, 'claim completed starter quest');
    await page.waitForTimeout(250);
    const state = gameState(await readQa(page));
    assert.ok(state.quest && Array.isArray(state.quest.claimed) && state.quest.claimed.includes('first-salvage'),
      'Starter quest claim is absent from the QA snapshot');
    await clickVisibleButton(page.locator('#close-panel'), 'close Journal');
    return { claimed: state.quest.claimed };
  });

  await step('Workshop panel and earned first upgrade', async () => {
    await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'Workshop');
    const dialog = await dialogIsOpen(page, '#panel-dialog');
    await dialog.getByRole('heading', { name: 'Waterwheel', exact: true }).waitFor({ state: 'visible' });
    assert.match((await page.locator('#panel-body').innerText()).toLowerCase(),
      /build the waterwheel to unlock three expedition rigs/,
      'Workshop does not explain the expedition-rig prerequisite');
    assert.equal(await page.locator('#panel-body [data-game-action="rig"]').count(), 0,
      'Expedition rig choices appeared before the Waterwheel was built');
    const buildButton = page.locator('#craft-waterwheel');
    assert.equal(await buildButton.isEnabled(), true,
      'Waterwheel is not buildable after gathering and claiming the starter reward');
    await clickVisibleButton(buildButton, 'build Waterwheel');
    await page.waitForTimeout(250);
    const state = gameState(await readQa(page));
    assert.equal(state.upgrades?.waterwheel, true, 'Waterwheel was not built through the UI');
    await clickVisibleButton(page.locator('#close-panel'), 'close Workshop');
    return { upgrades: state.upgrades, inventory: state.inventory };
  });

  await step('Workshop rig choices, legal fitting, and tide forecast', async () => {
    await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'reopen Workshop for rig fitting');
    const dialog = await dialogIsOpen(page, '#panel-dialog');
    const rigSpecs = {
      balanced: { name: 'Wanderer', speed: 5, oxygen: 18 },
      skimmer: { name: 'Skimmer', speed: 7, oxygen: 12 },
      diver: { name: 'Pearl diver', speed: 3.5, oxygen: 28 },
    };
    assert.deepEqual(Object.keys(RIGS).sort(), Object.keys(rigSpecs).sort(),
      'QA rig expectations need updating to match the domain rig options');
    const stateBefore = gameState(await readQa(page));
    assert.equal(stateBefore.upgrades?.waterwheel, true, 'Rig fitting is not unlocked after building Waterwheel');
    assert.equal(stateBefore.rig ?? 'balanced', 'balanced', 'Fresh voyage did not use the compatible balanced default');

    const cards = await page.locator('#panel-body article.recipe-card').evaluateAll(elements =>
      elements.map(element => ({
        name: element.querySelector('h3')?.textContent?.trim() || '',
        text: element.innerText,
        actionId: element.querySelector('[data-game-action="rig"]')?.dataset.id || null,
        actionDisabled: element.querySelector('[data-game-action="rig"]')?.disabled ?? null,
        fitted: element.querySelector('.badge')?.textContent?.includes('Fitted') || false,
      })));
    const rigCards = cards.filter(card => Object.values(rigSpecs).some(spec => spec.name === card.name));
    assert.deepEqual(rigCards.map(card => card.name).sort(),
      Object.values(rigSpecs).map(spec => spec.name).sort(),
      'Workshop does not display all three expedition rigs');
    for (const [id, spec] of Object.entries(rigSpecs)) {
      const card = rigCards.find(item => item.name === spec.name);
      assert.match(card.text, new RegExp(`${spec.speed} m/s · ${spec.oxygen}s air`),
        `${spec.name} card does not show its speed and air trade-off`);
      if (id === 'balanced') {
        assert.equal(card.fitted, true, 'Balanced/Wanderer is not marked as the currently fitted rig');
        assert.equal(card.actionId, null, 'The already fitted rig offers a redundant fit action');
      } else {
        assert.equal(card.actionId, id, `${spec.name} does not expose its matching fit choice`);
        assert.equal(card.actionDisabled, false, `${spec.name} is disabled at the home workshop`);
      }
    }

    async function verifyForecast(id) {
      const state = gameState(await readQa(page));
      const tide = getContext(state).tide;
      const name = rigSpecs[id].name;
      const expected = `Shallows ${tide.window === 'closes' ? 'cover' : 'emerge'} in ${Math.ceil(tide.windowSeconds)}s · ${name}`;
      const actual = (await page.locator('#tide-forecast').innerText()).trim();
      assert.equal(actual, expected, `Tide forecast disagrees with the selected rig or current tide: ${actual}`);
      return { actual, tide: { phase: tide.phase, window: tide.window, windowSeconds: tide.windowSeconds } };
    }

    const selections = [];
    for (const id of ['skimmer', 'diver', 'balanced', 'skimmer']) {
      const spec = rigSpecs[id];
      const fitButton = page.locator(`#panel-body [data-game-action="rig"][data-id="${id}"]`);
      await clickVisibleButton(fitButton, `fit ${spec.name} through Workshop`);
      await page.waitForFunction(expected => window.__tidekin?.getState?.()?.rig === expected, id,
        { timeout: 5000 });
      const state = gameState(await readQa(page));
      assert.equal(state.rig, id, `${spec.name} did not become the selected rig`);
      assert.equal(state.speed, spec.speed, `${spec.name} did not apply its sailing speed`);
      assert.ok(state.oxygen > 0 && state.oxygen <= spec.oxygen,
        `${spec.name} oxygen is outside its legal capacity: ${state.oxygen}/${spec.oxygen}`);
      const forecast = await verifyForecast(id);
      const buttons = await page.locator('#panel-body [data-game-action="rig"]').evaluateAll(elements =>
        elements.map(element => ({ id: element.dataset.id, disabled: element.disabled })));
      assert.deepEqual(buttons, Object.keys(rigSpecs).filter(option => option !== id)
        .map(option => ({ id: option, disabled: false })),
      'Workshop offers an unavailable or disabled rig choice for the selected fit');
      selections.push({ id, name: spec.name, speed: state.speed, oxygen: state.oxygen, forecast });
    }
    await screenshot(page, 'workshop-rigs-skimmer-1440x900');
    await clickVisibleButton(page.locator('#close-panel'), 'close Workshop after rig checks');
    return { defaultRig: 'balanced', selections, persistenceRig: 'skimmer' };
  });

  await step('Contextual dive, underwater gather, and surface controls', async () => {
    const target = { x: 6, z: -9 };
    async function sampleDirection(key) {
      const before = gameState(await readQa(page)).position;
      await page.locator('#game-canvas').click({ position: { x: 600, y: 350 } });
      await page.keyboard.down(key);
      await page.waitForTimeout(400);
      await page.keyboard.up(key);
      const after = gameState(await readQa(page)).position;
      return { x: after.x - before.x, z: after.z - before.z };
    }
    const right = await sampleDirection('d');
    const forward = await sampleDirection('w');
    assert.ok(Math.abs(right.x) > 0.1, 'D/A input did not control the x axis: ' + JSON.stringify(right));
    assert.ok(Math.abs(forward.z) > 0.1, 'W/S input did not control the z axis: ' + JSON.stringify(forward));
    const positiveX = right.x > 0 ? 'd' : 'a';
    const negativeZ = forward.z < 0 ? 'w' : 's';
    let position = gameState(await readQa(page)).position;
    for (let i = 0; i < 40 && Math.hypot(position.x - target.x, position.z - target.z) > 2.6; i += 1) {
      const keys = [];
      if (Math.abs(position.x - target.x) > 0.5) {
        keys.push(position.x < target.x
          ? positiveX
          : positiveX === 'd' ? 'a' : 'd');
      }
      if (Math.abs(position.z - target.z) > 0.5) {
        keys.push(position.z > target.z
          ? negativeZ
          : negativeZ === 'w' ? 's' : 'w');
      }
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(180);
      for (const key of keys) await page.keyboard.up(key);
      position = gameState(await readQa(page)).position;
    }
    assert.ok(Math.hypot(position.x - target.x, position.z - target.z) <= 2.6,
      'Could not reach the home pearl bed with keyboard steering; position=' + JSON.stringify(position));

    const dive = page.locator('#dive-button');
    assert.equal(await dive.isEnabled(), true, 'Dive control is disabled at full oxygen');
    await clickVisibleButton(dive, 'Dive');
    await page.locator('#dive-overlay').waitFor({ state: 'visible' });
    let state = gameState(await readQa(page));
    assert.equal(state.diving, true, 'Dive UI did not change diving state');
    assert.match((await page.locator('#dive-label').innerText()).toLowerCase(), /surface/);
    const pearlsBefore = state.inventory.pearls;
    const gather = page.locator('#gather-button');
    assert.equal(await gather.isEnabled(), true,
      'Pearl gather control is disabled while over the underwater bed');
    await clickVisibleButton(gather, 'contextual Gather pearls');
    await page.waitForFunction(previous => {
      const el = document.querySelector('#pearls-count');
      return el && Number(el.textContent) > previous;
    }, pearlsBefore, { timeout: 5000 });
    state = gameState(await readQa(page));
    assert.ok(state.inventory.pearls > pearlsBefore,
      'Underwater gathering did not increase pearls in the read-only QA snapshot');
    await clickVisibleButton(dive, 'Surface');
    await page.locator('#dive-overlay').waitFor({ state: 'hidden' });
    state = gameState(await readQa(page));
    assert.equal(state.diving, false, 'Surface UI did not restore surfaced state');
    return { diving: state.diving, oxygen: state.oxygen, pearls: state.inventory.pearls, position };
  });

  await step('Pause and resume', async () => {
    await clickVisibleButton(page.locator('#pause-button'), 'Pause');
    const dialog = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await dialog.innerText()).toLowerCase(), /pause|voyage|resume|continue/,
      'Pause dialog is missing pause/resume content');
    await screenshot(page, 'pause-1440x900');
    const resume = dialog.getByRole('button', { name: /resume|continue|back to voyage|keep sailing/i });
    await clickVisibleButton(resume, 'Resume voyage');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#game-view').isVisible(), true, 'Resume did not return to the game');
    return { resumed: true };
  });

  await step('Compact 900x700 layout', async () => {
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(200);
    const measurements = await page.evaluate(() => {
      const canvas = document.querySelector('#game-canvas');
      const ids = ['#location-name', '#region-name', '#pause-button', '#objective-card',
        '#gather-button', '#dive-button', '.game-nav'];
      const controls = ids.map(selector => {
        const el = document.querySelector(selector);
        if (!el || el.getClientRects().length === 0) return { selector, visible: false };
        const box = el.getBoundingClientRect();
        return {
          selector, visible: true,
          left: Math.round(box.left), top: Math.round(box.top),
          right: Math.round(box.right), bottom: Math.round(box.bottom),
        };
      });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
        controls,
      };
    });
    assert.ok(measurements.document.width <= 900,
      'Compact layout has horizontal overflow: ' + JSON.stringify(measurements.document));
    assert.ok(measurements.canvas.width > 0 && measurements.canvas.height > 0,
      'Canvas collapsed at the compact viewport');
    const outside = measurements.controls.filter(item => item.visible &&
      (item.left < -1 || item.right > 901 || item.top < -1 || item.bottom > 701));
    assert.deepEqual(outside, [], 'Visible HUD controls extend beyond the compact viewport');
    await screenshot(page, 'gameplay-900x700');
    await page.setViewportSize({ width: 1440, height: 900 });
    return measurements;
  });

  const benchmarkResult = await step('20-second requestAnimationFrame benchmark and renderer counters', async () => {
    await page.waitForTimeout(5000);
    await page.locator('#game-canvas').click({ position: { x: 700, y: 400 } });
    const frameIntervals = await page.evaluate(async duration => {
      const times = [];
      const start = performance.now();
      let previous = null;
      return new Promise(resolve => {
        function sample(now) {
          if (previous !== null) times.push(now - previous);
          previous = now;
          if (now - start >= duration) resolve({ elapsedMs: now - start, intervals: times });
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
    }, benchmarkMs);
    const sorted = [...frameIntervals.intervals].sort((a, b) => a - b);
    const percentile = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null;
    const hook = await readQa(page);
    const graphics = await page.locator('#game-canvas').evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return gl ? {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
      } : null;
    });
    assert.ok(sorted.length > 500, 'Too few animation frames measured: ' + sorted.length);
    const sceneBeforeCircuits = hook.rendererStats;
    async function steerOneCircuit() {
      await page.locator('#game-canvas').click({ position: { x: 700, y: 400 } });
      const start = gameState(await readQa(page)).position;
      const segments = [];
      for (const key of ['d', 's', 'a', 'w']) {
        const from = gameState(await readQa(page)).position;
        await page.keyboard.down(key);
        await page.waitForTimeout(800);
        await page.keyboard.up(key);
        const to = gameState(await readQa(page)).position;
        segments.push({
          key, from, to,
          displacement: Math.hypot(to.x - from.x, to.z - from.z),
        });
        await page.waitForTimeout(100);
      }
      return { start, end: gameState(await readQa(page)).position, segments };
    }
    const stateBeforeCircuits = gameState(await readQa(page));
    const firstCircuit = await steerOneCircuit();
    const stateAfterFirstCircuit = gameState(await readQa(page));
    const rendererAfterFirstCircuit = (await readQa(page)).rendererStats;
    const repeatedCircuit = await steerOneCircuit();
    const stateAfterRepeat = gameState(await readQa(page));
    const rendererAfterRepeat = (await readQa(page)).rendererStats;
    const firstCircuitMoved = firstCircuit.segments.every(segment => segment.displacement > 0.25);
    const repeatedCircuitMoved = repeatedCircuit.segments.every(segment => segment.displacement > 0.25);
    const platform = await page.evaluate(() => ({
      userAgent: navigator.userAgent,
      browserPlatform: navigator.platform,
      devicePixelRatio,
    }));
    const softwareRenderer = /swiftshader|llvmpipe|software/i.test((graphics?.renderer || '') + ' ' + (graphics?.vendor || ''));
    const medianFrameIntervalMs = percentile(0.5);
    const p95FrameIntervalMs = percentile(0.95);
    const benchmark = {
      warmupMs: 5000,
      requestedDurationMs: benchmarkMs,
      elapsedMs: Math.round(frameIntervals.elapsedMs),
      samples: sorted.length,
      medianFrameIntervalMs,
      p95FrameIntervalMs,
      framesOver50ms: sorted.filter(interval => interval > 50).length,
      medianFps: medianFrameIntervalMs ? 1000 / medianFrameIntervalMs : null,
      rendererStats: hook.rendererStats,
      rendererSubmitCpuDiagnosticMs: hook.rendererStats ? {
        median: hook.rendererStats.renderCpuMsMedian,
        p95: hook.rendererStats.renderCpuMsP95,
        interpretation: 'CPU render-submit diagnostic only; not FPS, frame interval, or GPU time.',
      } : null,
      graphics,
      browser: browser.version(),
      browserName,
      platform: { ...platform, os: os.platform(), osRelease: os.release(), architecture: os.arch() },
      viewport: { width: 1440, height: 900, drawingBuffer: graphics?.drawingBuffer },
      quality: hook.rendererStats?.quality || null,
      softwareRenderer,
      hardwareFrameBudget: {
        targetMedianMs: 20,
        targetP95Ms: 33.4,
        evaluated: !softwareRenderer,
        meetsTarget: softwareRenderer ? null
          : medianFrameIntervalMs <= 20 && p95FrameIntervalMs <= 33.4,
      },
      sailingCircuitRendererStats: {
        before: sceneBeforeCircuits,
        afterFirstCircuit: rendererAfterFirstCircuit,
        afterRepeatedCircuit: rendererAfterRepeat,
      },
      sailingCircuitPositions: {
        start: stateBeforeCircuits.position,
        afterFirstCircuit: stateAfterFirstCircuit.position,
        afterRepeatedCircuit: stateAfterRepeat.position,
      },
      sailingCircuitDisplacement: {
        first: firstCircuit.segments,
        repeated: repeatedCircuit.segments,
      },
      caveat: 'A SwiftShader/software run is a separate compatibility profile and cannot validate the hardware-WebGL budget.',
    };
    log('BENCHMARK ' + JSON.stringify(benchmark));
    record('Sailing circuit movement and renderer growth probe',
      firstCircuitMoved && repeatedCircuitMoved ? 'pass' : 'fail',
      {
        firstCircuitMoved,
        repeatedCircuitMoved,
        firstCircuit: firstCircuit.segments,
        repeatedCircuit: repeatedCircuit.segments,
        before: sceneBeforeCircuits,
        afterFirstCircuit: rendererAfterFirstCircuit,
        afterRepeatedCircuit: rendererAfterRepeat,
      });
    return benchmark;
  });
  if (benchmarkResult.ok && benchmarkResult.details) {
    const benchmark = benchmarkResult.details;
    if (benchmark.softwareRenderer) {
      record('Hardware frame-time budget comparison', 'blocked', {
        note: 'This run used software rendering; hardware thresholds do not apply.',
        medianFrameIntervalMs: benchmark.medianFrameIntervalMs,
        p95FrameIntervalMs: benchmark.p95FrameIntervalMs,
        renderer: benchmark.graphics?.renderer,
      });
    } else {
      record('Hardware frame-time budget comparison',
        benchmark.hardwareFrameBudget.meetsTarget ? 'pass' : 'fail',
        {
          targetMedianMs: 20, targetP95Ms: 33.4,
          medianFrameIntervalMs: benchmark.medianFrameIntervalMs,
          p95FrameIntervalMs: benchmark.p95FrameIntervalMs,
          framesOver50ms: benchmark.framesOver50ms,
          renderer: benchmark.graphics?.renderer,
        });
    }
  }

  const saveResult = await step('Saved voyage reload and Continue', async () => {
    const before = gameState(await readQa(page));
    const beforeSerialized = JSON.stringify({
      inventory: before.inventory,
      collected: before.collected,
      upgrades: before.upgrades,
      quest: before.quest,
      rig: before.rig ?? 'balanced',
      speed: before.speed,
    });
    await page.waitForTimeout(1200);
    const storage = await page.evaluate(() => Object.entries(localStorage).map(([key, value]) => ({
      key, value, length: value.length,
    })));
    const candidates = storage.filter(item => {
      if (/save|tidekin/i.test(item.key)) return true;
      try {
        const data = JSON.parse(item.value);
        return Boolean(data && (data.version || data.inventory || data.state?.inventory));
      } catch { return false; }
    });
    assert.ok(candidates.length > 0, 'No saved voyage entry appeared in localStorage');
    const saveEntry = candidates.find(item => {
      try {
        const data = JSON.parse(item.value);
        return Boolean(data && (data.inventory || data.state?.inventory));
      } catch { return false; }
    }) || candidates[0];
    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    const continueButton = page.locator('#continue-voyage');
    assert.equal(await continueButton.isVisible(), true, 'Continue is hidden after saving and reloading');
    await clickVisibleButton(continueButton, 'Continue saved voyage');
    await page.locator('#game-view').waitFor({ state: 'visible', timeout: 10000 });
    const after = gameState(await readQa(page));
    const afterSerialized = JSON.stringify({
      inventory: after.inventory,
      collected: after.collected,
      upgrades: after.upgrades,
      quest: after.quest,
      rig: after.rig ?? 'balanced',
      speed: after.speed,
    });
    assert.equal(afterSerialized, beforeSerialized,
      'Reloaded voyage does not match saved inventory, salvage, upgrades, and quest progress');
    await screenshot(page, 'continued-voyage-1440x900');
    return {
      saveKey: saveEntry.key,
      saveLength: saveEntry.length,
      inventory: after.inventory,
      collected: after.collected,
      upgrades: after.upgrades,
      quest: after.quest,
      rig: after.rig ?? 'balanced',
      speed: after.speed,
    };
  });
  if (saveResult.ok) {
    await step('New-voyage confirmation preserves on cancel and resets on confirm', async () => {
      await clickVisibleButton(page.locator('#pause-button'), 'Pause before returning to title');
      let dialog = await dialogIsOpen(page, '#modal-dialog');
      await clickVisibleButton(dialog.getByRole('button', { name: /save & return to title/i }),
        'Save and return to title');
      await page.locator('#main-menu').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#continue-voyage').isVisible(), true,
        'Saved voyage is not offered after returning to title');
      const saveBeforeCancel = await page.evaluate(key => localStorage.getItem(key), saveResult.details.saveKey);

      await clickVisibleButton(page.locator('#new-voyage'), 'request replacement voyage');
      dialog = await dialogIsOpen(page, '#modal-dialog');
      assert.match((await dialog.innerText()).toLowerCase(), /new beginning|replace your saved progress/,
        'Replacement confirmation does not describe the saved progress at risk');
      await screenshot(page, 'new-voyage-confirm-1440x900');
      await clickVisibleButton(dialog.getByRole('button', { name: /keep my voyage/i }), 'cancel replacement');
      await dialog.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('#main-menu').isVisible(), true,
        'Canceling replacement left the title screen');
      assert.equal(await page.locator('#continue-voyage').isVisible(), true,
        'Canceling replacement hid Continue');
      const saveAfterCancel = await page.evaluate(key => localStorage.getItem(key), saveResult.details.saveKey);
      assert.equal(saveAfterCancel, saveBeforeCancel, 'Canceling replacement changed the saved voyage');

      await clickVisibleButton(page.locator('#new-voyage'), 'request replacement again');
      dialog = await dialogIsOpen(page, '#modal-dialog');
      await clickVisibleButton(dialog.getByRole('button', { name: /begin a new voyage/i }),
        'confirm replacement');
      await page.locator('#game-view').waitFor({ state: 'visible', timeout: 10000 });
      await dialog.waitFor({ state: 'hidden' });
      const fresh = gameState(await readQa(page));
      assert.deepEqual(fresh.inventory, { wood: 4, scrap: 1, pearls: 0 },
        'Confirmed replacement did not start with fresh supplies');
      assert.deepEqual(fresh.collected, [], 'Confirmed replacement retained collected salvage');
      assert.ok(Object.values(fresh.upgrades).every(built => built === false),
        'Confirmed replacement retained an upgrade');
      assert.deepEqual(fresh.quest.claimed, [], 'Confirmed replacement retained claimed quests');
      await screenshot(page, 'new-voyage-fresh-1440x900');
      return { freshInventory: fresh.inventory, collected: fresh.collected, upgrades: fresh.upgrades };
    });
  }
  return saveResult;
}

async function runInvalidSaveCheck(saveKey) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(key => {
    localStorage.setItem(key, '{ invalid tidekin save');
  }, saveKey);
  const page = await context.newPage();
  attachDiagnostics(page, 'invalid-save');
  try {
    await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    const continueHidden = await page.locator('#continue-voyage').isHidden();
    const notice = (await page.locator('#menu-notice').innerText().catch(() => '')).trim();
    const remainingValue = await page.evaluate(key => localStorage.getItem(key), saveKey);
    assert.equal(continueHidden, true, 'Continue was offered for a malformed save');
    assert.ok(notice.length > 0 || remainingValue === null,
      'Malformed save produced neither a visible recovery notice nor a cleared save');
    await screenshot(page, 'invalid-save-fallback-1440x900');
    record('Malformed-save fallback in disposable context', 'pass', {
      saveKey, continueHidden, notice, cleared: remainingValue === null,
      screenshot: 'invalid-save-fallback-1440x900.png',
    });
  } catch (error) {
    record('Malformed-save fallback in disposable context', 'fail', {
      saveKey, error: error.message, stack: error.stack,
    });
  } finally {
    await context.close();
  }
}

async function isolatedStep(name, label, check) {
  const previousPage = activePage;
  let context;
  try {
    return await step(name, async () => {
      context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: 'no-preference',
      });
      const page = await context.newPage();
      activePage = page;
      page.setDefaultTimeout(5000);
      attachDiagnostics(page, label);
      return await check(context, page);
    });
  } finally {
    await context?.close();
    activePage = previousPage;
  }
}

async function beginFreshVoyage(page, { navigate = true } = {}) {
  if (navigate) await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('#main-menu').waitFor({ state: 'visible' });
  await clickVisibleButton(page.locator('#new-voyage'), 'Start new voyage');
  const dialog = await dialogIsOpen(page, '#modal-dialog');
  assert.match((await dialog.innerText()).toLowerCase(), /ready to cast off|first little adventure/,
    'Fresh-voyage welcome dialog is missing');
  await clickVisibleButton(dialog.getByRole('button', { name: /begin voyage/i }), 'begin first voyage');
  await page.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
  await dialog.waitFor({ state: 'hidden' });
  await page.locator('#game-canvas').waitFor({ state: 'visible' });
}

function beta3SaveFixture(kind) {
  const state = createGame();
  if (kind === 'fresh') return serializeGame(state);
  if (kind === 'old-v2') {
    const oldSave = JSON.parse(serializeGame(state));
    delete oldSave.expeditions;
    return JSON.stringify(oldSave);
  }

  state.upgrades.waterwheel = true;
  if (kind === 'active-index') {
    state.time = 1;
    state.expeditions.active = { id: 'current-run', index: 1, ready: false, startedAt: 0 };
  } else if (kind === 'ready') {
    state.time = 1;
    state.expeditions.active = { id: 'current-run', index: 4, ready: true, startedAt: 0 };
  } else if (kind === 'past-completions') {
    state.time = 360;
    state.day = 3;
    state.expeditions.completed['current-run'] = 3;
    state.expeditions.lastCompletedDay['current-run'] = 3;
  } else if (/^past-completions-[135]$/.test(kind)) {
    const total = Number(kind.slice('past-completions-'.length));
    state.time = (total - 1) * 180;
    state.day = total;
    state.expeditions.completed['current-run'] = total;
    state.expeditions.lastCompletedDay['current-run'] = total;
  } else if (kind === 'high-water') {
    state.time = 90;
  } else if (kind === 'route-ui-low') {
    // Exact center fixture: Direct ~18s / Around ~14s after upward rounding;
    // the expert's nearby in-game position produced the observed ~13s route.
    state.time = 10;
    state.position = { x: 34, z: -12 };
    state.expeditions.active = { id: 'current-run', index: 2, ready: false, startedAt: 0 };
  } else if (kind === 'low-water') {
    state.time = 20;
  } else {
    throw new Error('Unknown beta3 save fixture: ' + kind);
  }
  return serializeGame(state);
}

async function seedSaveOnNextNavigation(page, value, label) {
  await page.addInitScript(({ key, save, marker }) => {
    if (sessionStorage.getItem(marker) === '1') return;
    localStorage.setItem(key, save);
    sessionStorage.setItem(marker, '1');
  }, {
    key: saveKey,
    save: value,
    marker: `${saveKey}.qa-${label}-${stamp}`,
  });
}

async function returnToTitleWithSave(page) {
  await clickVisibleButton(page.locator('#pause-button'), 'pause before saving the fixture voyage');
  const dialog = await dialogIsOpen(page, '#modal-dialog');
  await clickVisibleButton(dialog.getByRole('button', { name: /save & return to title/i }),
    'Save & return to title');
  await page.locator('#main-menu').waitFor({ state: 'visible' });
}

async function resumeSavedVoyage(page) {
  await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
  await page.locator('#main-menu').waitFor({ state: 'visible' });
  await page.locator('#continue-voyage').waitFor({ state: 'visible' });
  await clickVisibleButton(page.locator('#continue-voyage'), 'Continue the saved voyage');
  await page.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForFunction(() => window.__tidekin?.getState?.() !== undefined, null, { timeout: 5000 });
}

async function moveEastUntil(page, predicate, { timeoutMs = 18000, pollMs = 200 } = {}) {
  await page.locator('#game-canvas').click({ position: { x: 120, y: 120 } });
  const start = gameState(await readQa(page)).position;
  const deadline = Date.now() + timeoutMs;
  await page.keyboard.down('d');
  try {
    while (Date.now() < deadline) {
      const state = gameState(await readQa(page));
      if (await predicate(state)) return { start, end: state.position, state };
      await page.waitForTimeout(pollMs);
    }
  } finally {
    await page.keyboard.up('d');
  }
  const endState = gameState(await readQa(page));
  throw new Error(`Keyboard sailing did not reach the requested state within ${timeoutMs} ms: ` +
    JSON.stringify({ start, end: endState.position, region: endState.region, discoveries: endState.discoveries }));
}

async function measureResponsiveLayout(page, width, height, screenshotName) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(200);
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('#panel-dialog');
    const body = document.querySelector('#panel-body');
    const rect = element => {
      if (!element || !element.open) return null;
      const box = element.getBoundingClientRect();
      return { left: Math.round(box.left), right: Math.round(box.right), width: Math.round(box.width) };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      document: { width: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth },
      panel: rect(panel),
      panelBody: body ? { clientWidth: body.clientWidth, scrollWidth: body.scrollWidth } : null,
      trackVisible: !document.querySelector('#track-expedition').hidden,
    };
  });
  assert.ok(layout.document.width <= width && layout.document.bodyWidth <= width,
    `Horizontal page overflow at ${width}x${height}: ${JSON.stringify(layout)}`);
  if (layout.panel) {
    assert.ok(layout.panel.left >= 0 && layout.panel.right <= width,
      `Panel extends past the viewport at ${width}x${height}: ${JSON.stringify(layout.panel)}`);
    assert.ok(layout.panelBody.scrollWidth <= layout.panelBody.clientWidth + 1,
      `Panel contents overflow horizontally at ${width}x${height}: ${JSON.stringify(layout.panelBody)}`);
  }
  await screenshot(page, screenshotName);
  return layout;
}

async function runBeta3FunctionalChecks({ fixturesOnly = false } = {}) {
  const previousActivePage = activePage;
  let context = null;
  if (!fixturesOnly) {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(7000);
    attachDiagnostics(page, 'beta3-functional');
  }
  try {
    if (!fixturesOnly) {
      const page = activePage;
    const gameplay = await step('Legal discovery, chart permission, and expedition navigation', async () => {
      await beginFreshVoyage(page);

      // Obtain the Waterwheel through the same visible Find, Gather, Journal, and Workshop controls as a player.
      await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'open Workshop');
      let panel = await dialogIsOpen(page, '#panel-dialog');
      await clickVisibleButton(page.locator('#panel-body [data-find-resource="wood"]').first(), 'Find driftwood');
      await panel.waitFor({ state: 'hidden' });
      const gather = page.locator('#gather-button');
      for (let attempt = 0; attempt < 16 && !(await gather.isEnabled()); attempt += 1) {
        await page.locator('#game-canvas').click({ position: { x: 120, y: 120 } });
        await page.keyboard.down('d');
        await page.waitForTimeout(150);
        await page.keyboard.up('d');
        await page.waitForTimeout(100);
      }
      assert.equal(await gather.isEnabled(), true, 'Starter driftwood did not become gatherable through keyboard movement');
      const beforeGather = gameState(await readQa(page));
      await clickVisibleButton(gather, 'Gather nearby driftwood');
      await page.waitForFunction(previous =>
        Number(document.querySelector('#wood-count')?.textContent) > previous,
      beforeGather.inventory.wood, { timeout: 5000 });

      await clickVisibleButton(page.locator('[data-panel="journal"]'), 'open Journal for earned supply reward');
      panel = await dialogIsOpen(page, '#panel-dialog');
      await clickVisibleButton(panel.getByRole('button', { name: /claim/i }).first(), 'claim earned starter reward');
      await page.waitForTimeout(150);
      await clickVisibleButton(page.locator('#close-panel'), 'close Journal');
      await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'open Workshop to build Waterwheel');
      panel = await dialogIsOpen(page, '#panel-dialog');
      const waterwheel = page.locator('#craft-waterwheel');
      assert.equal(await waterwheel.isEnabled(), true, 'Earned supplies did not enable the Waterwheel');
      await clickVisibleButton(waterwheel, 'Build Waterwheel');
      await page.waitForFunction(() => window.__tidekin?.getState?.()?.upgrades?.waterwheel === true,
        null, { timeout: 5000 });
      await clickVisibleButton(page.locator('#close-panel'), 'close Workshop');

      // Return to a known physical location through the chart's legal free-home action.
      await clickVisibleButton(page.locator('[data-panel="chart"]'), 'open Chart before first discovery');
      panel = await dialogIsOpen(page, '#panel-dialog');
      const homeTravel = page.locator('#travel-home');
      if (await homeTravel.isEnabled()) {
        await clickVisibleButton(homeTravel, 'use free Return home');
        await page.waitForTimeout(100);
      } else await clickVisibleButton(page.locator('#close-panel'), 'close Chart at home');

      await clickVisibleButton(page.locator('[data-panel="chart"]'), 'inspect undiscovered Mangrove permission');
      panel = await dialogIsOpen(page, '#panel-dialog');
      const mangroveTravel = page.locator('#travel-mangrove');
      assert.equal(await mangroveTravel.isDisabled(), true,
        'Chart allowed fast travel to Mangrove Reach before physical discovery');
      assert.match((await mangroveTravel.innerText()).toLowerCase(), /sail there first/,
        'Undiscovered Mangrove action does not explain the physical-discovery requirement');
      const permissionBefore = getContext(gameState(await readQa(page))).destinations.find(item => item.id === 'mangrove');
      assert.equal(permissionBefore?.available, false, 'Domain permission allowed undiscovered chart travel');
      assert.equal(permissionBefore?.reason, 'undiscovered_region', 'Domain permission returned an unexpected block reason');
      await clickVisibleButton(page.locator('#track-mangrove'), 'Track Mangrove Reach before discovery');
      await panel.waitFor({ state: 'hidden' });
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Mangrove Reach',
        'Track did not point the navigator at the undiscovered destination');
      const routeOptions = page.locator('#route-options');
      await routeOptions.waitFor({ state: 'visible', timeout: 5000 });
      await clickVisibleButton(page.locator('#route-bypass'), 'choose Around the shoal route');
      assert.equal(await page.locator('#route-bypass').getAttribute('aria-pressed'), 'true',
        'Around the shoal did not expose its pressed state');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Around the shoal',
        'Around the shoal did not change the navigation target');
      await clickVisibleButton(page.locator('#route-direct'), 'restore Direct route');
      assert.equal(await page.locator('#route-direct').getAttribute('aria-pressed'), 'true',
        'Direct did not restore its pressed state');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Mangrove Reach',
        'Direct did not restore the tracked destination');
      const moved = await moveEastUntil(page,
        state => state.discoveries.includes('mangrove'), { timeoutMs: 18000, pollMs: 200 });
      const permissionAfter = getContext(moved.state).destinations.find(item => item.id === 'mangrove');
      assert.equal(permissionAfter?.available, true, 'Physical arrival did not grant chart permission');
      assert.ok(moved.state.position.x >= 26,
        `Discovery happened without sailing near Mangrove Reach: ${JSON.stringify(moved)}`);

      await clickVisibleButton(page.locator('[data-panel="chart"]'), 'open Chart after physical discovery');
      panel = await dialogIsOpen(page, '#panel-dialog');
      assert.equal(await mangroveTravel.isEnabled(), true, 'Chart did not enable Mangrove after physical discovery');
      assert.match((await mangroveTravel.innerText()).toLowerCase(), /quick passage/,
        'Discovered destination did not offer quick passage');
      await clickVisibleButton(mangroveTravel, 'use discovered Mangrove quick passage');
      let state = gameState(await readQa(page));
      assert.equal(state.region, 'mangrove', 'Quick passage did not travel to Mangrove Reach');
      assert.ok(state.discoveries.includes('mangrove'), 'Quick passage lost the first-visit discovery');

      await clickVisibleButton(page.locator('[data-panel="chart"]'), 'open Chart to return home');
      panel = await dialogIsOpen(page, '#panel-dialog');
      await clickVisibleButton(page.locator('#travel-home'), 'Return home from chart');
      state = gameState(await readQa(page));
      assert.equal(state.region, 'home', 'Free chart return did not arrive at home');

      await clickVisibleButton(page.locator('[data-panel="journal"]'), 'open Journal for native expedition disclosure');
      panel = await dialogIsOpen(page, '#panel-dialog');
      const board = panel.locator('details.expedition-board');
      await board.waitFor({ state: 'visible' });
      assert.equal(await board.evaluate(element => element.tagName), 'DETAILS',
        'Expedition content is not implemented as native disclosure');
      assert.equal(await board.evaluate(element => element.open), false,
        'Inactive expedition board should start collapsed');
      await clickVisibleButton(board.locator('summary'), 'open native Expeditions disclosure');
      assert.equal(await board.evaluate(element => element.open), true, 'Native summary did not open expedition choices');
      const currentRun = page.locator('#expedition-current-run');
      assert.equal(await currentRun.isEnabled(), true, 'Current run cannot start from home after Waterwheel unlock');
      await clickVisibleButton(currentRun, 'Start Current run through Journal');
      await page.waitForFunction(() => window.__tidekin?.getState?.()?.expeditions?.active?.id === 'current-run',
        null, { timeout: 5000 });

      const follow = page.locator('#track-expedition');
      assert.equal(await follow.isVisible(), true, 'Active expedition did not expose its Follow control');
      await clickVisibleButton(follow, 'Follow active expedition');
      assert.match((await page.locator('#navigation-name').innerText()).trim(), /Current run\s*·\s*1\/4/,
        'Follow did not target the first Current run marker');
      await screenshot(page, 'beta3-expedition-navigation-1440x900');

      const routeSave = JSON.parse(await page.evaluate(key => localStorage.getItem(key), saveKey));
      assert.deepEqual(routeSave.expeditions.active,
        { id: 'current-run', index: 0, ready: false, startedAt: routeSave.expeditions.active.startedAt },
        'Starting the route did not persist the active route at marker zero');
      await returnToTitleWithSave(page);
      await resumeSavedVoyage(page);
      state = gameState(await readQa(page));
      assert.deepEqual(state.expeditions.active, routeSave.expeditions.active,
        'Continue did not restore the legally started route and marker index');

      // Test the responsive map/HUD plus native Journal while the route is active.
      const layouts = [];
      layouts.push(await measureResponsiveLayout(page, 1440, 900, 'beta3-gameplay-1440x900'));
      layouts.push(await measureResponsiveLayout(page, 900, 700, 'beta3-gameplay-900x700'));
      layouts.push(await measureResponsiveLayout(page, 390, 844, 'beta3-gameplay-390x844'));
      await clickVisibleButton(page.locator('[data-panel="journal"]'), 'open Journal at mobile width');
      panel = await dialogIsOpen(page, '#panel-dialog');
      const mobileBoard = panel.locator('details.expedition-board');
      assert.equal(await mobileBoard.evaluate(element => element.open), true,
        'Active expedition Journal did not preserve its expanded status');
      layouts.push(await measureResponsiveLayout(page, 390, 844, 'beta3-expeditions-390x844'));
      await clickVisibleButton(page.locator('#close-panel'), 'close mobile Journal');

      const beforeAbandon = gameState(await readQa(page));
      await clickVisibleButton(page.locator('[data-panel="journal"]'), 'reopen Journal for abandon check');
      panel = await dialogIsOpen(page, '#panel-dialog');
      await clickVisibleButton(panel.getByRole('button', { name: /abandon route/i }), 'abandon the unearned test route');
      state = gameState(await readQa(page));
      assert.equal(state.expeditions.active, null, 'Abandon did not clear the active route');
      assert.deepEqual(state.inventory, beforeAbandon.inventory, 'Abandon changed the inventory');
      assert.equal(Object.values(state.expeditions.completed).reduce((sum, value) => sum + value, 0), 0,
        'Abandon counted as an earned completion');
      return {
        waterwheelEarnedThroughUi: true,
        chartBeforeDiscovery: { disabled: true, reason: permissionBefore.reason, trackWorked: true },
        chartAfterDiscovery: { enabled: permissionAfter.available, region: 'mangrove', quickPassageUsed: true },
        routeStartedAndSaved: routeSave.expeditions.active,
        routeChoice: { directRestored: true, bypassSelected: true },
        responsiveLayouts: layouts,
        abandon: { activeCleared: true, inventoryUnchanged: true, completionCount: 0 },
        captures: ['beta3-expedition-navigation-1440x900.png', 'beta3-gameplay-900x700.png',
          'beta3-gameplay-390x844.png', 'beta3-expeditions-390x844.png'],
      };
    });
    }

    const previousPage = activePage;
    const fixtureContext = await browser.newContext({
      viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    });
    const fixturePage = await fixtureContext.newPage();
    activePage = fixturePage;
    fixturePage.setDefaultTimeout(7000);
    attachDiagnostics(fixturePage, 'beta3-save-fixtures');
    await fixtureContext.addInitScript(() => {
      window.__qaAudioOscillators = [];
      const prototype = window.OscillatorNode?.prototype;
      if (!prototype || typeof prototype.start !== 'function') return;
      const originalStart = prototype.start;
      Object.defineProperty(prototype, 'start', {
        configurable: true,
        writable: true,
        value: function (...args) {
          window.__qaAudioOscillators.push(Number(this.frequency.value));
          return originalStart.apply(this, args);
        },
      });
    });
    try {
      await fixtureContext.addInitScript(({ key, save }) => {
        const seeded = `${key}.qa-initial-seed`;
        if (sessionStorage.getItem(seeded) === '1') return;
        localStorage.setItem(key, save);
        sessionStorage.setItem(seeded, '1');
      },
        { key: saveKey, save: beta3SaveFixture(fixturesOnly ? 'fresh' : 'old-v2') });
      await fixturePage.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
      await fixturePage.locator('#main-menu').waitFor({ state: 'visible' });

      if (!fixturesOnly) await step('Older v2 save without beta3 expedition fields migrates on Continue', async () => {
        assert.equal(await fixturePage.locator('#continue-voyage').isVisible(), true,
          'A valid earlier v2 save without expedition data was not offered to Continue');
        await clickVisibleButton(fixturePage.locator('#continue-voyage'), 'Continue old-v2 fixture');
        await fixturePage.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
        const state = gameState(await readQa(fixturePage));
        assert.deepEqual(state.expeditions, {
          active: null,
          completed: { 'current-run': 0, 'pearl-trail': 0 },
          lastCompletedDay: { 'current-run': 0, 'pearl-trail': 0 },
        }, 'Older v2 save did not receive safe default expedition fields');
        const normalized = JSON.parse(await fixturePage.evaluate(key => localStorage.getItem(key), saveKey));
        assert.deepEqual(normalized.expeditions, state.expeditions,
          'Continue did not persist the normalized v2 save shape');
        await screenshot(fixturePage, 'beta3-save-migration-old-v2-1440x900');
        await returnToTitleWithSave(fixturePage);
        return { fixture: 'valid prior v2 serialization with only expeditions omitted', migrated: state.expeditions };
      });

      await step('Active expedition index persists across Continue', async () => {
        await seedSaveOnNextNavigation(fixturePage, beta3SaveFixture('active-index'), 'active-index');
        await resumeSavedVoyage(fixturePage);
        let state = gameState(await readQa(fixturePage));
        assert.deepEqual(state.expeditions.active,
          { id: 'current-run', index: 1, ready: false, startedAt: 0 },
          'Continue lost the fixture route marker index');
        const context = getExpeditionContext(state);
        assert.equal(context.active.index, 1, 'Domain expedition context lost the persisted index');
        const persisted = JSON.parse(await fixturePage.evaluate(key => localStorage.getItem(key), saveKey));
        assert.deepEqual(persisted.expeditions.active, state.expeditions.active,
          'Loaded active index was not retained in localStorage');
        await screenshot(fixturePage, 'beta3-save-active-index-1440x900');
        await returnToTitleWithSave(fixturePage);
        return { fixture: 'valid coverage fixture; not a route earned in this QA', active: state.expeditions.active };
      });

      await step('Ready expedition fixture persists; claim toast, chime, and next-pennant copy', async () => {
        await seedSaveOnNextNavigation(fixturePage, beta3SaveFixture('ready'), 'ready');
        await resumeSavedVoyage(fixturePage);
        let state = gameState(await readQa(fixturePage));
        assert.deepEqual(state.expeditions.active,
          { id: 'current-run', index: 4, ready: true, startedAt: 0 },
          'Continue lost the ready expedition state');
        assert.equal(getExpeditionContext(state).canClaim, true,
          'Domain context did not allow claiming a ready-at-home fixture');
        await clickVisibleButton(fixturePage.locator('[data-panel="journal"]'), 'open ready expedition Journal');
        let panel = await dialogIsOpen(fixturePage, '#panel-dialog');
        const claim = panel.getByRole('button', { name: /claim expedition/i });
        assert.equal(await claim.isEnabled(), true, 'Ready expedition does not expose an enabled Claim action');
        assert.match((await panel.innerText()).toLowerCase(),
          /next workshop pennant:\s*0\s*\/\s*1 completed voyages/,
          'Journal does not identify the first pennant threshold before a completion');
        const normalized = JSON.parse(await fixturePage.evaluate(key => localStorage.getItem(key), saveKey));
        assert.deepEqual(normalized.expeditions.active, state.expeditions.active,
          'Ready state did not remain persisted after Continue');
        await fixturePage.evaluate(() => window.__qaAudioOscillators?.splice(0));
        await clickVisibleButton(claim, 'claim the ready-state coverage fixture');
        state = gameState(await readQa(fixturePage));
        assert.equal(state.expeditions.active, null, 'Fixture Claim did not clear the active expedition');
        assert.equal(state.expeditions.completed['current-run'], 1, 'Fixture Claim did not record one completion');
        const claimToast = (await fixturePage.locator('#toast-text').innerText()).toLowerCase();
        assert.match(claimToast, /new pennant is flying/, 'Claim toast did not announce the newly earned pennant');
        const chime = await fixturePage.evaluate(() => ({
          frequencies: window.__qaAudioOscillators ?? [],
        }));
        assert.deepEqual(chime.frequencies, [392, 523.25, 659.25],
          'Claim did not emit the three-tone celebration chime: ' + JSON.stringify(chime));
        panel = await dialogIsOpen(fixturePage, '#panel-dialog');
        const boardAfterClaim = panel.locator('details.expedition-board');
        assert.equal(await boardAfterClaim.evaluate(element => element.open), true,
          'Claim collapsed the native expedition disclosure that was open beforehand');
        let copy = (await panel.innerText()).toLowerCase();
        assert.match(copy, /next workshop pennant:\s*1\s*\/\s*3 completed voyages/,
          'Journal does not identify the next pennant threshold after one completion');
        await screenshot(fixturePage, 'beta3-pennant-progress-1-of-3-1440x900');
        await clickVisibleButton(fixturePage.locator('#close-panel'), 'close Journal after Claim copy check');
        await returnToTitleWithSave(fixturePage);
        return {
          fixture: 'valid ready-route coverage fixture; completion is test data, not an expedition earned in this QA',
          claimEnabled: true, claimedCount: state.expeditions.completed['current-run'], claimToast, chime,
          nextPennantCopy: '1 / 3', journalDisclosureRemainedOpen: true,
        };
      });

      await step('Pennant progress copy and 1/3/5 fixture thresholds', async () => {
        const thresholds = [];
        for (const total of [3, 5]) {
          await seedSaveOnNextNavigation(fixturePage, beta3SaveFixture(`past-completions-${total}`), `pennants-${total}`);
          await resumeSavedVoyage(fixturePage);
          const state = gameState(await readQa(fixturePage));
          assert.equal(getExpeditionContext(state).total, total, `Completion fixture ${total} did not restore`);
          await clickVisibleButton(fixturePage.locator('[data-panel="journal"]'), `open Journal for ${total} completions`);
          const panel = await dialogIsOpen(fixturePage, '#panel-dialog');
          const board = panel.locator('details.expedition-board');
          await clickVisibleButton(board.locator('summary'), `expand ${total}-completion Journal`);
          const copy = (await panel.innerText()).toLowerCase();
          const expectedCopy = total === 3 ? /next workshop pennant:\s*3\s*\/\s*5 completed voyages/
            : /all three workshop pennants earned/;
          const medal = total === 3 ? /tide wanderer/ : /ocean pathfinder/;
          assert.match(copy, expectedCopy, `Journal next-pennant copy is wrong at ${total} completions`);
          assert.match(copy, medal, `Journal progression badge is wrong at ${total} completions`);
          const saved = JSON.parse(await fixturePage.evaluate(key => localStorage.getItem(key), saveKey));
          assert.equal(saved.expeditions.completed['current-run'], total,
            `Completion tally ${total} changed during reload and Journal rendering`);
          const capture = `beta3-pennant-progress-${total}-of-5-1440x900`;
          await screenshot(fixturePage, capture);
          thresholds.push({
            fixture: `${total}-completion valid save fixture; not earned in this QA`, total,
            medal: total === 3 ? 'Tide wanderer' : 'Ocean pathfinder',
            nextPennantCopy: total === 3 ? '3 / 5' : 'All three pennants earned',
            screenshot: capture + '.png',
          });
          await clickVisibleButton(fixturePage.locator('#close-panel'), `close ${total}-completion Journal`);
          if (total !== 5) await returnToTitleWithSave(fixturePage);
        }
        return { thresholds: [
          { total: 1, nextPennantCopy: '1 / 3', screenshot: 'beta3-pennant-progress-1-of-3-1440x900.png' },
          ...thresholds,
        ] };
      });

    } finally {
      await fixtureContext.close();
      activePage = previousPage;
    }
  } finally {
    await context?.close();
    activePage = previousActivePage;
  }
}

async function runBeta3FinalRenderChecks() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(7000);
  attachDiagnostics(page, 'beta3-final-render');
  await context.addInitScript(() => {
    const diagnostics = { shaderCompiles: [], programLinks: [], glErrors: [] };
    Object.defineProperty(window, '__qaWebglDiagnostics', { configurable: false, value: diagnostics });
    for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Context) continue;
      const prototype = Context.prototype;
      const wrap = (methodName, wrapped) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
        if (!descriptor || typeof descriptor.value !== 'function') return;
        Object.defineProperty(prototype, methodName, { ...descriptor, value: wrapped(descriptor.value) });
      };
      wrap('compileShader', original => function (shader) {
        const result = original.call(this, shader);
        const succeeded = this.getShaderParameter(shader, this.COMPILE_STATUS);
        diagnostics.shaderCompiles.push({ succeeded, infoLog: succeeded ? '' : this.getShaderInfoLog(shader) });
        return result;
      });
      wrap('linkProgram', original => function (program) {
        const result = original.call(this, program);
        const succeeded = this.getProgramParameter(program, this.LINK_STATUS);
        diagnostics.programLinks.push({ succeeded, infoLog: succeeded ? '' : this.getProgramInfoLog(program) });
        return result;
      });
      wrap('getError', original => function () {
        const error = original.call(this);
        if (error !== this.NO_ERROR) diagnostics.glErrors.push({ code: error, hex: `0x${error.toString(16)}` });
        return error;
      });
    }
  });
  await context.addInitScript(({ key, save }) => {
    const marker = `${key}.qa-final-render-fixture`;
    if (sessionStorage.getItem(marker) === '1') return;
    localStorage.setItem(key, save);
    sessionStorage.setItem(marker, '1');
  }, { key: saveKey, save: beta3SaveFixture('route-ui-low') });

  const fingerprintJobs = [];
  const assetResponses = new Map();
  page.on('response', response => {
    let url;
    try { url = new URL(response.url()); } catch { return; }
    if (url.origin !== new URL(baseUrl).origin) return;
    const pathname = url.pathname;
    const glb = pathname.match(/\/assets\/(workshop|island|landmarks)\.glb$/);
    if (glb) assetResponses.set(glb[1], { status: response.status(), path: pathname });
    if (!/^\/$|\/index\.html$|\/assets\/[^/]+\.(?:js|css|glb|png)$/.test(pathname)) return;
    fingerprintJobs.push((async () => {
      let bytes = null;
      try { if (response.ok()) bytes = await response.body(); } catch {}
      return {
        path: pathname,
        status: response.status(),
        bytes: bytes?.byteLength ?? null,
        sha256: bytes ? createHash('sha256').update(bytes).digest('hex') : null,
      };
    })());
  });

  try {
    const renderResult = await step('Final beta3 render assets, route-control conditions, shaders, and sustained hardware rAF', async () => {
      await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
      await page.locator('#main-menu').waitFor({ state: 'visible' });
      await clickVisibleButton(page.locator('#continue-voyage'), 'Continue expert low-water route-control fixture');
      await page.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
      await page.waitForFunction(() => ['workshop', 'island', 'landmarks'].every(model =>
        performance.getEntriesByType('resource').some(entry => entry.name.endsWith(`/assets/${model}.glb`))),
      null, { timeout: 15000 });
      const stateAtStart = gameState(await readQa(page));
      const initialMetrics = (await readQa(page)).rendererStats;
      assert.equal(stateAtStart.upgrades.waterwheel, true, 'Valid route-control fixture did not unlock chart waters');
      assert.deepEqual(stateAtStart.position, { x: 34, z: -12 }, 'Route fixture did not restore the reviewed position');
      assert.deepEqual(stateAtStart.expeditions.active,
        { id: 'current-run', index: 2, ready: false, startedAt: 0 },
        'Route fixture did not restore Current run waypoint 3');
      assert.equal(initialMetrics?.quality, 'high', 'Final benchmark did not start at High quality');

      // This expert geometry/tide combination is an eligible route case. The
      // exact-center UI estimate is Direct ~18s / Around ~14s. Every selection
      // and invalidation below is driven through rendered controls and live clock.
      const routeOptions = page.locator('#route-options');
      await routeOptions.waitFor({ state: 'visible', timeout: 5000 });
      assert.match((await page.locator('#navigation-name').innerText()).trim(), /^Current run\s*·\s*3\/4$/,
        'Continue did not track the active expedition waypoint');
      const routeSummary = (await page.locator('#route-summary').innerText()).trim();
      assert.match(routeSummary, /Direct ~18s · Around ~14s/,
        'The exact (34,-12) route fixture should display the rounded 17.8466s direct and 13.2443s bypass estimates');
      await clickVisibleButton(page.locator('#route-direct'), 'select the direct route for the active waypoint');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Current run · 3/4',
        'Direct route selection did not restore the expedition marker label');
      await clickVisibleButton(page.locator('#route-bypass'), 'select the low-water shoal bypass');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Around the shoal',
        'The detour selection was not reflected in the navigator');
      await clickVisibleButton(page.locator('#route-direct'), 'restore direct marker before selecting the detour again');
      await clickVisibleButton(page.locator('#route-bypass'), 'select detour before diving');
      await clickVisibleButton(page.locator('#dive-button'), 'dive while a detour is selected');
      await page.waitForFunction(() => window.__tidekin?.getState?.()?.diving === true, null, { timeout: 5000 });
      assert.equal(await routeOptions.isHidden(), true, 'Detour controls remained available underwater');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Current run · 3/4',
        'Diving hid the controls but kept the stale Around the shoal target');
      await clickVisibleButton(page.locator('#dive-button'), 'surface after detour-clear check');
      await page.waitForFunction(() => window.__tidekin?.getState?.()?.diving === false, null, { timeout: 5000 });
      assert.notEqual((await page.locator('#navigation-name').innerText()).trim(), 'Around the shoal',
        'The cleared detour returned after surfacing');
      await routeOptions.waitFor({ state: 'visible', timeout: 5000 });

      await clickVisibleButton(page.locator('#route-bypass'), 'select detour before tide changes');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Around the shoal',
        'Could not select a detour for the natural tide transition check');
      await page.waitForFunction(() => (window.__tidekin?.getState?.()?.time ?? 0) > 38,
        null, { timeout: 45000, polling: 100 });
      const stateAtHighWater = gameState(await readQa(page));
      assert.equal(await routeOptions.isHidden(), true,
        'Detour controls remained visible after the live tide removed the alternative');
      assert.equal((await page.locator('#navigation-name').innerText()).trim(), 'Current run · 3/4',
        'High water hid the controls but retained the stale detour target');
      await screenshot(page, 'beta3-final-route-high-water-clear-detour-1440x900');

      const graphics = await page.locator('#game-canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl ? {
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
        } : null;
      });
      assert.ok(graphics && graphics.drawingBuffer.width > 0 && graphics.drawingBuffer.height > 0,
        'Final renderer has no WebGL drawing buffer');
      const errorsAfterScene = await drainWebglErrors(page);
      const diagnostics = await page.evaluate(() => window.__qaWebglDiagnostics);
      assert.ok(diagnostics.shaderCompiles.length > 0, 'Final renderer did not compile any shaders');
      assert.ok(diagnostics.programLinks.length > 0, 'Final renderer did not link any programs');
      assert.ok(diagnostics.shaderCompiles.every(item => item.succeeded),
        'Final renderer had failed shader compiles: ' + JSON.stringify(diagnostics.shaderCompiles.filter(item => !item.succeeded)));
      assert.ok(diagnostics.programLinks.every(item => item.succeeded),
        'Final renderer had failed program links: ' + JSON.stringify(diagnostics.programLinks.filter(item => !item.succeeded)));
      assert.deepEqual(errorsAfterScene, [], 'WebGL error queue was not clean after final scene load');
      assert.deepEqual(diagnostics.glErrors, [], 'WebGL reported errors while loading/rendering the final scene');

      const glbStatus = Object.fromEntries(['workshop', 'island', 'landmarks'].map(name => [name, assetResponses.get(name) || null]));
      for (const [name, response] of Object.entries(glbStatus)) {
        assert.ok(response, `Final scene did not request ${name}.glb`);
        assert.equal(response.status, 200, `${name}.glb returned HTTP ${response.status}`);
      }

      await screenshot(page, 'beta3-final-render-1440x900');
      const platform = await page.evaluate(() => ({ userAgent: navigator.userAgent, browserPlatform: navigator.platform, devicePixelRatio }));
      await page.waitForTimeout(5000);
      const frameSample = await page.evaluate(duration => new Promise(resolve => {
        const intervals = [];
        const start = performance.now();
        let previous = null;
        function sample(now) {
          if (previous !== null) intervals.push(now - previous);
          previous = now;
          if (now - start >= duration) resolve({ elapsedMs: now - start, intervals });
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }), benchmarkMs);
      const sorted = [...frameSample.intervals].sort((a, b) => a - b);
      const percentile = p => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null;
      assert.ok(sorted.length > 500, `Too few real rAF intervals in the sustained sample: ${sorted.length}`);
      const median = percentile(.5), p95 = percentile(.95);
      const measuredMetrics = (await readQa(page)).rendererStats;
      const softwareRenderer = /swiftshader|llvmpipe|software/i.test(`${graphics.renderer} ${graphics.vendor}`);
      const benchmark = {
        profile: 'Chrome headless WebGL; 1440x900 CSS px, DPR 1, High quality',
        warmupMs: 5000, requestedDurationMs: benchmarkMs,
        elapsedMs: Math.round(frameSample.elapsedMs), samples: sorted.length,
        medianFrameIntervalMs: median, p95FrameIntervalMs: p95,
        medianFps: median ? 1000 / median : null,
        framesOver50ms: sorted.filter(value => value > 50).length,
        rendererStats: measuredMetrics,
        rendererSubmitCpuDiagnosticMs: measuredMetrics ? {
          median: measuredMetrics.renderCpuMsMedian ?? null,
          p95: measuredMetrics.renderCpuMsP95 ?? null,
          meaning: 'CPU render-submit timing only; separate from measured rAF intervals, FPS, and GPU time.',
        } : null,
        graphics, browser: browser.version(), browserName,
        platform: { ...platform, os: os.platform(), osRelease: os.release(), architecture: os.arch() },
        viewport: { width: 1440, height: 900, drawingBuffer: graphics.drawingBuffer },
        quality: measuredMetrics?.quality || null,
        softwareRenderer,
        hardwareBudget: {
          medianMaxMs: 20, p95MaxMs: 33.4, evaluated: !softwareRenderer,
          meetsTarget: softwareRenderer ? null : median <= 20 && p95 <= 33.4,
        },
        limitation: softwareRenderer
          ? 'Software rendering is a compatibility result and cannot validate the hardware budget.'
          : 'One machine/browser profile only; this does not establish a device matrix.',
      };
      assert.equal(benchmark.quality, 'high', 'Quality changed during the sustained sample');

      async function sailOneCircuit() {
        await page.locator('#game-canvas').click({ position: { x: 700, y: 400 } });
        const segments = [];
        for (const key of ['d', 's', 'a', 'w']) {
          const from = gameState(await readQa(page)).position;
          await page.keyboard.down(key);
          await page.waitForTimeout(800);
          await page.keyboard.up(key);
          const to = gameState(await readQa(page)).position;
          segments.push({ key, from, to, displacement: Math.hypot(to.x - from.x, to.z - from.z) });
          await page.waitForTimeout(100);
        }
        return segments;
      }
      const statsBeforeCircuit = (await readQa(page)).rendererStats;
      const firstCircuit = await sailOneCircuit();
      const statsAfterFirstCircuit = (await readQa(page)).rendererStats;
      const repeatedCircuit = await sailOneCircuit();
      const statsAfterRepeatedCircuit = (await readQa(page)).rendererStats;
      assert.ok(firstCircuit.every(segment => segment.displacement > .25),
        'The final renderer did not respond to every first-circuit keyboard direction');
      assert.ok(repeatedCircuit.every(segment => segment.displacement > .25),
        'The final renderer did not respond to every repeated-circuit keyboard direction');
      const errorsAfterCircuits = await drainWebglErrors(page);
      assert.deepEqual(errorsAfterCircuits, [], 'WebGL error queue was not clean after benchmark and sailing circuit');
      await screenshot(page, 'beta3-final-render-after-sailing-circuit-1440x900');

      const fingerprints = await Promise.all(fingerprintJobs);
      const servedWorkshop = fingerprints.find(item => item.path.endsWith('/workshop.glb'));
      assert.equal(servedWorkshop?.sha256, '20b2323fc211c83c4a7cd053238fe2f193b7fec9e1c62b39f170cd203564e561',
        '5181 did not serve the final artist-verified Workshop GLB');
      const mainBundle = fingerprints.find(item => /\/assets\/index-[^/]+\.js$/.test(item.path));
      const sceneBundle = fingerprints.find(item => /\/assets\/scene-[^/]+\.js$/.test(item.path));
      assert.ok(mainBundle?.sha256 && sceneBundle?.sha256,
        'Could not fingerprint the served main and scene JavaScript bundles');

      const routeChecks = {
        fixture: 'valid Waterwheel save at (34,-12), time 10, Current run index 2; coverage fixture, not player-earned',
        routeSummary,
        directAndBypassSelectable: true,
        bypassSelectable: true,
        divingHidesAndClearsDetour: true,
        surfacedRouteRemainsTracked: true,
        naturalHighWaterAtGameTime: stateAtHighWater.time,
        highWaterHidesAndClearsDetour: true,
      };
      const rendererCounts = {
        beforeCircuit: statsBeforeCircuit,
        afterFirstCircuit: statsAfterFirstCircuit,
        afterRepeatedCircuit: statsAfterRepeatedCircuit,
      };
      log('BENCHMARK ' + JSON.stringify(benchmark));
      log('FINAL ASSET FINGERPRINTS ' + JSON.stringify(fingerprints));
      log('FINAL RENDERER COUNTS ' + JSON.stringify(rendererCounts));
      return {
        routeChecks, benchmark, rendererCounts,
        finalModels: glbStatus,
        webglDiagnostics: { ...diagnostics, errorsAfterScene, errorsAfterCircuits },
        servedFingerprints: fingerprints,
        sailingCircuit: { first: firstCircuit, repeated: repeatedCircuit },
        screenshots: ['beta3-final-route-high-water-clear-detour-1440x900.png',
          'beta3-final-render-1440x900.png', 'beta3-final-render-after-sailing-circuit-1440x900.png'],
      };
    });

    if (renderResult.ok && renderResult.details?.benchmark) {
      const benchmark = renderResult.details.benchmark;
      if (benchmark.softwareRenderer) {
        record('Final hardware frame-time budget comparison', 'blocked', {
          note: 'Software-rendering samples cannot validate the hardware threshold.',
          renderer: benchmark.graphics.renderer,
          medianFrameIntervalMs: benchmark.medianFrameIntervalMs,
          p95FrameIntervalMs: benchmark.p95FrameIntervalMs,
        });
      } else {
        record('Final hardware frame-time budget comparison', benchmark.hardwareBudget.meetsTarget ? 'pass' : 'fail', {
          targetMedianMs: 20, targetP95Ms: 33.4,
          medianFrameIntervalMs: benchmark.medianFrameIntervalMs,
          p95FrameIntervalMs: benchmark.p95FrameIntervalMs,
          framesOver50ms: benchmark.framesOver50ms,
          renderer: benchmark.graphics.renderer,
        });
      }
    }
  } finally {
    await context.close();
    activePage = null;
  }
}

async function runQuotaFailureCheck() {
  return isolatedStep('Quota failure warning and in-session recovery', 'quota-save', async (context, page) => {
    await context.addInitScript(key => {
      const originalSetItem = Storage.prototype.setItem;
      window.__qaStorageQuotaBlocked = true;
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value(keyName, value) {
          if (keyName === key && window.__qaStorageQuotaBlocked) {
            throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
          }
          return originalSetItem.call(this, keyName, value);
        },
      });
    }, saveKey);
    await beginFreshVoyage(page);
    await page.waitForTimeout(200);
    const failureBanner = page.locator('#save-banner');
    assert.equal(await failureBanner.isVisible(), true,
      'A failed automatic save did not leave a durable visible warning after the welcome toast');
    assert.equal(await failureBanner.getAttribute('role'), 'alert',
      'A failed save warning is not exposed as an alert');
    assert.equal(await failureBanner.evaluate(element => element.classList.contains('save-error')), true,
      'A failed save warning is not visually distinguished from a successful save');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /not saved/,
      'Failed save banner falsely claims the voyage was saved');
    await page.waitForTimeout(2400);
    assert.equal(await failureBanner.isVisible(), true,
      'The failed-save warning disappeared without a successful save or user dismissal');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /not saved/,
      'A later welcome toast or action replaced the durable failed-save warning');
    await clickVisibleButton(page.locator('#pause-button'), 'Pause in quota-failure context');
    let dialog = await dialogIsOpen(page, '#modal-dialog');
    await clickVisibleButton(dialog.getByRole('button', { name: /save & return to title/i }),
      'request save and return to title');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    const warning = (await dialog.innerText()).trim();
    assert.match(warning.toLowerCase(), /save didn.t reach shore/,
      'Quota failure did not show the persistent save-recovery dialog');
    assert.match(warning.toLowerCase(), /progress is still here in this session/,
      'Save warning does not explain that progress remains in this session');
    assert.match(warning.toLowerCase(), /browser could not store it/,
      'Save warning does not disclose that browser storage failed');
    assert.equal(await dialog.isVisible(), true, 'Save warning disappeared without a user choice');
    assert.equal(await failureBanner.isVisible(), true,
      'The failed-save warning disappeared when the recovery dialog opened');
    assert.equal(await failureBanner.evaluate(element => element.classList.contains('save-error')), true,
      'The recovery dialog was accompanied by a success-styled save banner');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /not saved/,
      'The recovery dialog was accompanied by a banner falsely claiming the voyage was saved');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), null,
      'The quota-failure fixture unexpectedly stored a voyage');
    await screenshot(page, 'quota-save-recovery-1440x900');

    await clickVisibleButton(dialog.getByRole('button', { name: /return to title/i }),
      'return to title with session-only voyage');
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#continue-voyage').isVisible(), true,
      'The in-memory voyage is not available from Continue after save failure');
    assert.match((await page.locator('#save-summary').innerText()).toLowerCase(), /this session/,
      'Continue does not distinguish the session-only voyage from a stored save');
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey), null,
      'Returning to title falsely persisted the quota-failed voyage');
    await clickVisibleButton(page.locator('#continue-voyage'), 'Continue session-only voyage');
    await page.locator('#game-view').waitFor({ state: 'visible' });
    const state = gameState(await readQa(page));
    await page.evaluate(() => { window.__qaStorageQuotaBlocked = false; });
    await clickVisibleButton(page.locator('#pause-button'), 'Pause before retrying a successful save');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    await clickVisibleButton(dialog.getByRole('button', { name: /^save voyage$/i }), 'retry Save after quota recovery');
    const recoveredBanner = page.locator('#save-banner');
    assert.equal(await recoveredBanner.isVisible(), true, 'Successful retry did not show save confirmation');
    assert.equal(await recoveredBanner.getAttribute('role'), 'status',
      'Successful retry did not restore status semantics');
    assert.equal(await recoveredBanner.evaluate(element => element.classList.contains('save-error')), false,
      'Successful retry did not clear the failure styling');
    assert.equal((await recoveredBanner.locator('span').first().innerText()).trim(), '✓',
      'Successful retry did not restore the save check icon');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /voyage saved/,
      'Successful retry did not replace the failed-save warning');
    assert.ok(await page.evaluate(key => localStorage.getItem(key), saveKey),
      'Successful retry still did not persist the voyage');
    await page.waitForTimeout(2400);
    assert.equal(await recoveredBanner.isHidden(), true,
      'Successful save confirmation did not clear after its display interval');
    return {
      warningBannerVisibleAfterMs: 2600,
      failedSaveClaimedSuccess: false,
      saveRecovered: true,
      successIconRestored: true,
      successBannerCleared: true,
      inSessionContinue: true,
      rig: state.rig ?? 'balanced',
    };
  });
}

async function runBlockedGlbRecoveryCheck() {
  return isolatedStep('Blocked GLB error, menu, and reload retry', 'blocked-glb', async (context, page) => {
    let blocked = false;
    let retryLoads = 0;
    await page.route('**/assets/island.glb', async route => {
      if (!blocked) {
        blocked = true;
        intentionallyBlockedGlbCount += 1;
        intentionallyBlockedRequests.add(route.request());
        await route.abort('failed');
      } else {
        retryLoads += 1;
        await route.continue();
      }
    });
    await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    await clickVisibleButton(page.locator('#new-voyage'), 'start voyage with one blocked model request');
    let dialog = await dialogIsOpen(page, '#modal-dialog');
    await clickVisibleButton(dialog.getByRole('button', { name: /begin voyage/i }), 'begin model-load attempt');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    await page.waitForFunction(() => /ocean couldn.t open/i.test(document.querySelector('#modal-title')?.textContent || ''),
      undefined, { timeout: 15000 });
    const firstError = (await dialog.innerText()).trim();
    assert.match(firstError.toLowerCase(), /workshop and island models/,
      'Blocked GLB did not produce a usable, explanatory error state');
    assert.equal(blocked, true, 'The configured GLB request was not blocked');
    assert.equal(await dialog.getByRole('button', { name: /reload tidekin/i }).isVisible(), true,
      'Load error does not offer a reload retry');
    assert.equal(await dialog.getByRole('button', { name: /back to the menu/i }).isVisible(), true,
      'Load error does not offer a route back to the menu');
    await screenshot(page, 'blocked-glb-load-error-1440x900');

    await clickVisibleButton(dialog.getByRole('button', { name: /back to the menu/i }), 'return to title after GLB error');
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#new-voyage').isVisible(), true,
      'The menu is unusable after the model-load error');
    await screenshot(page, 'blocked-glb-menu-recovery-1440x900');

    await clickVisibleButton(page.locator('#new-voyage'), 'retry from the recovered menu');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    await clickVisibleButton(dialog.getByRole('button', { name: /begin voyage/i }), 'retry failed scene promise');
    await page.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
    await page.locator('#modal-dialog').waitFor({ state: 'hidden', timeout: 20000 });
    assert.ok(retryLoads >= 1, 'The GLB request did not proceed on the reload retry');
    assert.ok(expectedRecoveryEvents.some(event => event.page === 'blocked-glb'
      && event.kind === 'expected-blocked-request'),
    'The intentionally blocked model request did not report its expected network failure');
    assert.equal(await page.locator('#game-view').isVisible(), true,
      'The app did not recover into a playable world after the model retry');
    assert.equal(await page.locator('#modal-dialog').isVisible(), false,
      'The load error remained over the successfully recovered game');
    await screenshot(page, 'blocked-glb-successful-retry-1440x900');
    return { firstLoadBlocked: blocked, errorModal: true, menuRecovery: true, retryLoads, playableAfterMenuRetry: true };
  });
}

async function runHiddenDiveRecoveryCheck() {
  return isolatedStep('Hidden/blur pause preserves an active dive', 'hidden-dive', async (_context, page) => {
    await beginFreshVoyage(page);
    const dive = page.locator('#dive-button');
    assert.equal(await dive.isEnabled(), true, 'Dive is not available in the fresh voyage');
    await clickVisibleButton(dive, 'Dive before simulated tab hiding');
    await page.locator('#dive-overlay').waitFor({ state: 'visible' });
    const beforeHidden = gameState(await readQa(page));
    assert.equal(beforeHidden.diving, true, 'The player did not enter a dive before the hidden-tab test');
    await page.evaluate(() => {
      window.__qaVisibilityDescriptors = {
        hidden: Object.getOwnPropertyDescriptor(document, 'hidden'),
        visibilityState: Object.getOwnPropertyDescriptor(document, 'visibilityState'),
      };
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    let pause = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await pause.innerText()).toLowerCase(), /paused while you were away/,
      'Hidden-tab transition did not show the safety pause');
    assert.equal((await readQa(page)).rendererStats?.paused, true,
      'The game did not report paused while the document was hidden');
    const hiddenOxygen = gameState(await readQa(page)).oxygen;
    await page.waitForTimeout(1200);
    const afterHiddenWait = gameState(await readQa(page));
    assert.equal(afterHiddenWait.diving, true, 'Hidden-tab pause ended the active dive');
    assert.ok(Math.abs(afterHiddenWait.oxygen - hiddenOxygen) <= 0.02,
      `Oxygen changed while hidden and paused: ${hiddenOxygen} -> ${afterHiddenWait.oxygen}`);
    await screenshot(page, 'hidden-dive-paused-1440x900');
    await page.evaluate(() => {
      for (const key of ['hidden', 'visibilityState']) {
        const descriptor = window.__qaVisibilityDescriptors?.[key];
        if (descriptor) Object.defineProperty(document, key, descriptor);
        else delete document[key];
      }
      delete window.__qaVisibilityDescriptors;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await clickVisibleButton(pause.getByRole('button', { name: /resume voyage/i }), 'resume after hidden-tab pause');
    await pause.waitFor({ state: 'hidden' });
    const beforeBlur = gameState(await readQa(page));
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    pause = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await pause.innerText()).toLowerCase(), /paused while you were away/,
      'Window blur did not pause the active voyage');
    await page.waitForTimeout(800);
    const afterBlur = gameState(await readQa(page));
    assert.equal(afterBlur.diving, true, 'Blur pause ended the active dive');
    assert.ok(Math.abs(afterBlur.oxygen - beforeBlur.oxygen) <= 0.02,
      `Oxygen changed during the blur pause: ${beforeBlur.oxygen} -> ${afterBlur.oxygen}`);
    await clickVisibleButton(pause.getByRole('button', { name: /resume voyage/i }), 'resume after blur pause');
    await pause.waitFor({ state: 'hidden' });
    await clickVisibleButton(dive, 'Surface after both focus-loss recoveries');
    await page.locator('#dive-overlay').waitFor({ state: 'hidden' });
    const surfaced = gameState(await readQa(page));
    assert.equal(surfaced.diving, false, 'The player could not surface after focus-loss recovery');
    return { hiddenPaused: true, hiddenOxygenStable: true, blurPaused: true, blurOxygenStable: true, surfaced: true };
  });
}

async function runLowQualityAffordanceCheck() {
  return isolatedStep('Low quality preserves gameplay affordances', 'low-quality', async (_context, page) => {
    await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    await clickVisibleButton(page.locator('#menu-settings'), 'open Settings for low-quality check');
    let dialog = await dialogIsOpen(page, '#modal-dialog');
    await dialog.locator('#quality-setting').selectOption('low');
    await clickVisibleButton(dialog.getByRole('button', { name: /all comfortable/i }), 'apply Low world detail');
    await dialog.waitFor({ state: 'hidden' });
    await beginFreshVoyage(page);
    const metrics = (await readQa(page)).rendererStats;
    assert.equal(metrics?.quality, 'low', 'The rendered scene did not apply the Low quality setting');
    assert.ok(metrics.width > 0 && metrics.height > 0, 'Low quality collapsed the WebGL drawing buffer');
    const affordances = ['#tide-forecast', '.objective-card', '#gather-button', '#dive-button',
      '.game-nav [data-panel="workshop"]', '.game-nav [data-panel="journal"]', '.game-nav [data-panel="chart"]'];
    for (const selector of affordances) {
      const control = page.locator(selector);
      assert.equal(await control.isVisible(), true, `Low quality hid gameplay affordance ${selector}`);
    }
    for (const selector of ['#dive-button', '.game-nav [data-panel="workshop"]',
      '.game-nav [data-panel="journal"]', '.game-nav [data-panel="chart"]']) {
      assert.equal(await page.locator(selector).isEnabled(), true,
        `Low quality disabled available gameplay control ${selector}`);
    }
    const gather = page.locator('#gather-button');
    for (let i = 0; i < 5 && !(await gather.isEnabled()); i += 1) {
      await page.locator('#game-canvas').click({ position: { x: 100, y: 100 } });
      await page.keyboard.down('d');
      await page.waitForTimeout(150);
      await page.keyboard.up('d');
      await page.waitForTimeout(100);
    }
    assert.equal(await gather.isEnabled(), true,
      'Low quality removed contextual access to the visible starter salvage');
    const before = gameState(await readQa(page));
    await clickVisibleButton(gather, 'gather starter driftwood at Low quality');
    await page.waitForFunction(previous => Number(document.querySelector('#wood-count')?.textContent) > previous,
      before.inventory.wood, { timeout: 5000 });
    const after = gameState(await readQa(page));
    assert.ok(after.inventory.wood > before.inventory.wood,
      'Low quality prevented the contextual gather action');
    await screenshot(page, 'quality-low-affordances-1440x900');
    return {
      quality: metrics.quality,
      drawingBuffer: { width: metrics.width, height: metrics.height },
      visibleAffordances: affordances,
      contextualGather: { beforeWood: before.inventory.wood, afterWood: after.inventory.wood },
    };
  });
}

async function runFinalCandidateChecks() {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  activePage = page;
  page.setDefaultTimeout(7000);
  attachDiagnostics(page, 'final-candidate');
  await page.addInitScript(() => {
    const diagnostics = { shaderCompiles: [], programLinks: [], glErrors: [] };
    Object.defineProperty(window, '__qaWebglDiagnostics', { configurable: false, value: diagnostics });
    for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!Context) continue;
      const prototype = Context.prototype;
      const wrap = (methodName, wrapped) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
        if (!descriptor || typeof descriptor.value !== 'function') return;
        Object.defineProperty(prototype, methodName, {
          ...descriptor, value: wrapped(descriptor.value),
        });
      };
      wrap('compileShader', original => function (shader) {
        const result = original.call(this, shader);
        const succeeded = this.getShaderParameter(shader, this.COMPILE_STATUS);
        diagnostics.shaderCompiles.push({ succeeded, infoLog: succeeded ? '' : this.getShaderInfoLog(shader) });
        return result;
      });
      wrap('linkProgram', original => function (program) {
        const result = original.call(this, program);
        const succeeded = this.getProgramParameter(program, this.LINK_STATUS);
        diagnostics.programLinks.push({ succeeded, infoLog: succeeded ? '' : this.getProgramInfoLog(program) });
        return result;
      });
      wrap('getError', original => function () {
        const error = original.call(this);
        if (error !== this.NO_ERROR) diagnostics.glErrors.push({ code: error, hex: `0x${error.toString(16)}` });
        return error;
      });
    }
  });
  const assetResponses = new Map();
  page.on('response', response => {
    const match = new URL(response.url()).pathname.match(/\/assets\/(workshop|island|landmarks)\.glb$/);
    if (match) assetResponses.set(match[1], { status: response.status(), url: response.url() });
  });

  try {
    const introAndAssets = await step('Final candidate staged intro, large-text setting, and three authored GLBs', async () => {
      await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
      await page.locator('#main-menu').waitFor({ state: 'visible' });
      await screenshot(page, 'final-menu-1440x900');
      const baselineA11y = await page.evaluate(() => {
        const visibleButtons = [...document.querySelectorAll('button')].filter(element => element.getClientRects().length);
        return {
          lang: document.documentElement.lang,
          title: document.title,
          h1Count: document.querySelectorAll('h1').length,
          unnamedButtons: visibleButtons.filter(element =>
            !(element.getAttribute('aria-label') || element.innerText.trim() || element.title))
            .map(element => element.outerHTML.slice(0, 140)),
        };
      });
      assert.equal(baselineA11y.lang, 'en', 'Document language is missing');
      assert.match(baselineA11y.title, /Tidekin/i, 'Document title does not identify Tidekin');
      assert.equal(baselineA11y.h1Count, 1, 'Title screen should have one primary heading');
      assert.deepEqual(baselineA11y.unnamedButtons, [], 'A visible title-screen button has no accessible name');
      await page.getByRole('button', { name: /start new voyage/i }).waitFor({ state: 'visible' });
      await page.getByRole('button', { name: /^settings/i }).waitFor({ state: 'visible' });

      await clickVisibleButton(page.locator('#menu-settings'), 'open final-candidate Settings');
      let dialog = await dialogIsOpen(page, '#modal-dialog');
      assert.equal(await dialog.getAttribute('aria-labelledby'), 'modal-title',
        'Settings dialog is not programmatically labelled by its heading');
      const largeText = dialog.getByRole('switch', { name: /larger text/i });
      const fontBefore = await dialog.locator('.settings-note').evaluate(element =>
        Number.parseFloat(getComputedStyle(element).fontSize));
      await largeText.focus();
      await page.keyboard.press('Space');
      assert.equal(await largeText.isChecked(), true, 'Keyboard activation did not enable Larger text');
      const fontAfter = await dialog.locator('.settings-note').evaluate(element =>
        Number.parseFloat(getComputedStyle(element).fontSize));
      assert.ok(fontAfter > fontBefore, `Larger text did not increase settings copy (${fontBefore}px -> ${fontAfter}px)`);
      assert.equal(await page.locator('html').evaluate(element => element.classList.contains('large-text')), true,
        'Larger text did not apply to the document');
      const storedSettings = await page.evaluate(() => JSON.parse(localStorage.getItem('tidekin.settings.v1') || '{}'));
      assert.equal(storedSettings.largeText, true, 'Larger text preference was not persisted');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement?.dataset?.modalAction), 'settings-done',
        'Keyboard focus did not proceed from the switch to the Settings completion action');
      const focusIndicator = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement);
        return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
      });
      assert.equal(focusIndicator.outlineStyle, 'solid', 'Keyboard focus has no visible outline');
      assert.ok(Number.parseFloat(focusIndicator.outlineWidth) >= 2,
        `Keyboard focus outline is too thin to measure: ${JSON.stringify(focusIndicator)}`);
      await screenshot(page, 'final-settings-large-text-1440x900');
      await page.keyboard.press('Enter');
      await dialog.waitFor({ state: 'hidden' });
      await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
      await page.locator('#main-menu').waitFor({ state: 'visible' });
      assert.equal(await page.locator('html').evaluate(element => element.classList.contains('large-text')), true,
        'Larger text did not persist after a title-screen reload');
      await clickVisibleButton(page.locator('#menu-settings'), 'reopen Settings to verify text preference');
      dialog = await dialogIsOpen(page, '#modal-dialog');
      assert.equal(await dialog.getByRole('switch', { name: /larger text/i }).isChecked(), true,
        'Settings did not restore the Larger text selection');
      await clickVisibleButton(dialog.getByRole('button', { name: /all comfortable/i }), 'close Settings');
      await dialog.waitFor({ state: 'hidden' });

      await clickVisibleButton(page.locator('#new-voyage'), 'open staged first-voyage intro');
      dialog = await dialogIsOpen(page, '#modal-dialog');
      assert.equal(await dialog.getAttribute('aria-labelledby'), 'modal-title',
        'First-voyage introduction is not programmatically labelled');
      const introText = (await dialog.innerText()).toLowerCase();
      assert.match(introText, /ready to cast off/, 'Staged introduction does not set up the first voyage');
      assert.match(introText, /driftwood/, 'Introduction does not identify the first task');
      assert.match(introText, /wasd/, 'Introduction omits keyboard steering instructions');
      assert.match(introText, /within < 3 m|within 3 m/, 'Introduction omits the gathering distance');
      await screenshot(page, 'final-staged-intro-1440x900');
      const introActions = await dialog.locator('button').allInnerTexts();
      assert.ok(introActions.some(text => /begin voyage/i.test(text)), 'Intro has no begin action');
      assert.ok(introActions.some(text => /not yet/i.test(text)), 'Intro has no cancel/back action');
      await clickVisibleButton(dialog.getByRole('button', { name: /not yet/i }), 'cancel staged intro');
      await dialog.waitFor({ state: 'hidden' });
      await page.locator('#main-menu').waitFor({ state: 'visible' });
      await clickVisibleButton(page.locator('#new-voyage'), 'reopen staged intro');
      dialog = await dialogIsOpen(page, '#modal-dialog');
      await clickVisibleButton(dialog.getByRole('button', { name: /begin voyage/i }), 'begin final-candidate voyage');
      await page.locator('#game-view').waitFor({ state: 'visible', timeout: 20000 });
      await dialog.waitFor({ state: 'hidden' });
      await page.locator('#game-canvas').waitFor({ state: 'visible' });
      await page.waitForFunction(() =>
        ['workshop', 'island', 'landmarks'].every(model =>
          performance.getEntriesByType('resource').some(entry => entry.name.endsWith(`/assets/${model}.glb`))),
      null, { timeout: 15000 });
      const loadedModels = Object.fromEntries(['workshop', 'island', 'landmarks'].map(model =>
        [model, assetResponses.get(model) || null]));
      for (const [model, response] of Object.entries(loadedModels)) {
        assert.ok(response, `The ${model} GLB was not requested by the final scene`);
        assert.equal(response.status, 200, `The ${model} GLB returned HTTP ${response.status}`);
      }
      const reading = await readQa(page);
      const state = gameState(reading);
      assert.ok(reading.rendererStats?.geometries > 0, 'Final world has no live renderer geometry');
      const graphics = await page.locator('#game-canvas').evaluate(canvas => {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        return gl ? {
          renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
          vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
          drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
        } : null;
      });
      assert.ok(graphics && graphics.drawingBuffer.width > 0 && graphics.drawingBuffer.height > 0,
        'Final candidate did not initialize a WebGL drawing buffer');
      const pendingGlErrors = await drainWebglErrors(page);
      const webglDiagnostics = await page.evaluate(() => window.__qaWebglDiagnostics);
      assert.ok(webglDiagnostics.shaderCompiles.length > 0, 'No WebGL shader compilations were observed');
      assert.ok(webglDiagnostics.programLinks.length > 0, 'No WebGL program links were observed');
      assert.ok(webglDiagnostics.shaderCompiles.every(result => result.succeeded),
        'A WebGL shader failed to compile: ' + JSON.stringify(webglDiagnostics.shaderCompiles.filter(result => !result.succeeded)));
      assert.ok(webglDiagnostics.programLinks.every(result => result.succeeded),
        'A WebGL program failed to link: ' + JSON.stringify(webglDiagnostics.programLinks.filter(result => !result.succeeded)));
      assert.deepEqual(pendingGlErrors, [], 'WebGL reported pending errors after scene creation');
      assert.deepEqual(webglDiagnostics.glErrors, [], 'WebGL reported errors during scene creation');
      await screenshot(page, 'final-gameplay-1440x900');
      return {
        introActions, introContainsFirstTask: true, loadedModels, state: {
          region: state.region, inventory: state.inventory, rig: state.rig || 'balanced',
        }, graphics, accessibilityProbe: baselineA11y,
        largerText: { fontBefore, fontAfter, persisted: true, keyboardToggled: true },
        keyboardFocusIndicator: focusIndicator,
        webglDiagnostics: { ...webglDiagnostics, pendingGlErrors },
      };
    });

    if (!introAndAssets.ok) {
      record('Resource Find buttons, legal rig unlock, and save-return', 'blocked', {
        note: 'The staged intro and three-model world did not reach a usable voyage.',
      });
      record('Final responsive layouts and captures', 'blocked', {
        note: 'The staged intro and three-model world did not reach a usable voyage.',
      });
      record('Final 20-second active-play hardware rAF benchmark', 'blocked', {
        note: 'The staged intro and three-model world did not reach a usable voyage.',
      });
    } else {
      const featureFlow = await step('Resource Find buttons, legal rig unlock, compact cards, and prominent save-return', async () => {
        await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'open Workshop resource finders');
        let panel = await dialogIsOpen(page, '#panel-dialog');
        const finders = [];
        for (const [type, expectedName, expectedHint] of [
          ['wood', 'Driftwood', /gather within 3 m/i],
          ['scrap', 'Salvage crate', /gather within 3 m/i],
          ['pearls', 'Pearl bed', /dive for pearls/i],
        ]) {
          const finder = page.locator(`#panel-body [data-find-resource="${type}"]`).first();
          await finder.waitFor({ state: 'visible' });
          assert.match((await finder.innerText()).trim(), new RegExp(`find ${type === 'pearls' ? 'pearls' : type}`, 'i'),
            `The ${type} locator button has the wrong label`);
          assert.equal(await finder.isEnabled(), true, `Find ${type} is disabled despite reachable home salvage`);
          if (finders.length === 0) await screenshot(page, 'final-workshop-find-resources-1440x900');
          await clickVisibleButton(finder, `Find ${type}`);
          await panel.waitFor({ state: 'hidden' });
          assert.match((await page.locator('#toast-text').innerText()).toLowerCase(),
            new RegExp(`map now points to ${type}`), `Find ${type} did not confirm map tracking`);
          assert.equal((await page.locator('#navigation-name').innerText()).trim(), expectedName,
            `Find ${type} pointed the navigator at the wrong salvage type`);
          assert.match((await page.locator('#navigation-distance').innerText()).toLowerCase(), expectedHint,
            `Find ${type} did not show the correct access hint`);
          finders.push({ type, target: expectedName, hint: (await page.locator('#navigation-distance').innerText()).trim() });
          await clickVisibleButton(page.locator('[data-panel="workshop"]'), `reopen Workshop after Find ${type}`);
          panel = await dialogIsOpen(page, '#panel-dialog');
        }
        const stateBeforeGather = gameState(await readQa(page));
        await clickVisibleButton(page.locator('#close-panel'), 'close Workshop before earned rig unlock');
        const gather = page.locator('#gather-button');
        for (let attempt = 0; attempt < 12 && !(await gather.isEnabled()); attempt += 1) {
          await page.locator('#game-canvas').click({ position: { x: 110, y: 100 } });
          await page.keyboard.down('d');
          await page.waitForTimeout(150);
          await page.keyboard.up('d');
          await page.waitForTimeout(100);
        }
        assert.equal(await gather.isEnabled(), true, 'Visible starter driftwood never became gatherable by keyboard');
        const woodBefore = stateBeforeGather.inventory.wood;
        await clickVisibleButton(gather, 'gather driftwood for the legal Waterwheel route');
        await page.waitForFunction(previous =>
          Number(document.querySelector('#wood-count')?.textContent) > previous, woodBefore, { timeout: 5000 });
        await clickVisibleButton(page.locator('[data-panel="journal"]'), 'open journal to claim earned starter supply');
        panel = await dialogIsOpen(page, '#panel-dialog');
        const claim = panel.getByRole('button', { name: /claim/i }).first();
        await clickVisibleButton(claim, 'claim starter salvage reward');
        await page.waitForTimeout(150);
        await clickVisibleButton(page.locator('#close-panel'), 'close Journal');
        await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'build from earned supplies');
        panel = await dialogIsOpen(page, '#panel-dialog');
        const wheel = page.locator('#craft-waterwheel');
        assert.equal(await wheel.isEnabled(), true, 'Earned starter supplies did not unlock the Waterwheel');
        await clickVisibleButton(wheel, 'build Waterwheel through Workshop');
        await page.waitForFunction(() => window.__tidekin?.getState?.()?.upgrades?.waterwheel === true,
          null, { timeout: 5000 });
        await clickVisibleButton(page.locator('#close-panel'), 'close Workshop after building Waterwheel');
        await clickVisibleButton(page.locator('[data-panel="workshop"]'), 'inspect unlocked compact rig cards');
        panel = await dialogIsOpen(page, '#panel-dialog');
        const rigCards = await page.locator('#panel-body .rig-card').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect();
          const button = element.querySelector('button[data-game-action="rig"]');
          return {
            name: element.querySelector('h3')?.textContent?.trim(),
            height: Math.round(box.height), width: Math.round(box.width),
            buttonMinHeight: button ? Math.round(button.getBoundingClientRect().height) : null,
          };
        }));
        assert.equal(rigCards.length, 3, 'The earned Waterwheel did not reveal all three rig cards');
        assert.ok(rigCards.every(card => card.height > 0 && card.height <= 155),
          'Unlocked rig cards are not compact: ' + JSON.stringify(rigCards));
        assert.ok(rigCards.filter(card => card.buttonMinHeight !== null).every(card => card.buttonMinHeight >= 38),
          'Rig fit actions became too small to operate');
        await screenshot(page, 'final-workshop-compact-rig-cards-1440x900');
        await clickVisibleButton(page.locator('#close-panel'), 'close Workshop before save-return check');
        await clickVisibleButton(page.locator('#pause-button'), 'pause for prominent save-return check');
        const pause = await dialogIsOpen(page, '#modal-dialog');
        const saveReturn = pause.getByRole('button', { name: /save & return to title/i });
        await saveReturn.waitFor({ state: 'visible' });
        const saveReturnStyle = await saveReturn.evaluate(element => {
          const box = element.getBoundingClientRect(), style = getComputedStyle(element);
          return {
            className: element.className,
            width: Math.round(box.width), height: Math.round(box.height),
            background: style.backgroundColor, color: style.color,
            primaryStyle: element.classList.contains('button-primary'),
          };
        });
        assert.ok(saveReturnStyle.width >= 280 && saveReturnStyle.height >= 44,
          'Save & return is not a full-size, reachable pause action: ' + JSON.stringify(saveReturnStyle));
        await screenshot(page, 'final-pause-save-return-1440x900');
        await clickVisibleButton(saveReturn, 'Save & return to title');
        await page.locator('#main-menu').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#continue-voyage').isVisible(), true,
          'Save & return did not leave the earned voyage available on the title screen');
        const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('tidekin.save.v2') || 'null'));
        assert.equal(saved?.upgrades?.waterwheel, true, 'Save & return did not persist the earned Waterwheel');
        await clickVisibleButton(page.locator('#continue-voyage'), 'Continue after Save & return');
        await page.locator('#game-view').waitFor({ state: 'visible' });
        const resumed = gameState(await readQa(page));
        assert.equal(resumed.upgrades?.waterwheel, true, 'Continue did not restore the earned Waterwheel');
        await screenshot(page, 'final-gameplay-1440x900');
        await clickVisibleButton(page.locator('#pause-button'), 'pause to open How to play');
        const pauseAfterContinue = await dialogIsOpen(page, '#modal-dialog');
        await clickVisibleButton(pauseAfterContinue.getByRole('button', { name: /how to play/i }), 'open How to play');
        const tutorial = await dialogIsOpen(page, '#modal-dialog');
        const tutorialText = (await tutorial.innerText()).toLowerCase();
        for (const [control, pattern] of [
          ['movement', /wasd\s*\/\s*arrow keys/], ['gather', /press e to gather/],
          ['dive and surface', /space.*dives or surfaces/], ['workshop', /press b to build/],
          ['journal', /\bj\b.{0,20}journal/], ['chart', /\bm\b.{0,20}chart/],
          ['pause', /escape pauses/],
        ]) assert.match(tutorialText, pattern, `How to play omits ${control} controls`);
        await screenshot(page, 'final-how-to-play-1440x900');
        await clickVisibleButton(tutorial.getByRole('button', { name: /let’s make a little home/i }),
          'dismiss How to play and resume');
        await tutorial.waitFor({ state: 'hidden' });
        assert.equal(await page.locator('#game-view').isVisible(), true,
          'How to play completion failed to return to the active voyage');
        return {
          finders, earnedBuild: { woodBefore, woodAfter: resumed.inventory.wood, waterwheel: resumed.upgrades.waterwheel },
          rigCards, saveReturnStyle, savedVoyageContinued: true,
          howToPlay: { movement: true, gather: true, diveSurface: true, workshop: true, journal: true, chart: true, pause: true },
        };
      });

      if (!featureFlow.ok) {
        record('Final responsive layouts and captures', 'blocked', {
          note: 'The new workshop or save-return feature flow did not reach its responsive checks.',
        });
        record('Final 20-second active-play hardware rAF benchmark', 'blocked', {
          note: 'The new workshop or save-return feature flow did not reach a stable benchmark scene.',
        });
      } else {
        await step('Final responsive gameplay at 1440x900, 900x700, and 390x844', async () => {
          const viewports = [];
          for (const viewport of [
            { width: 1440, height: 900, name: '1440x900' },
            { width: 900, height: 700, name: '900x700' },
            { width: 390, height: 844, name: '390x844' },
          ]) {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(250);
            const layout = await page.evaluate(() => {
              const selectors = ['#pause-button', '#gather-button', '#dive-button', '.game-nav'];
              const controls = selectors.map(selector => {
                const element = document.querySelector(selector);
                if (!element || element.getClientRects().length === 0) return { selector, visible: false };
                const box = element.getBoundingClientRect();
                return {
                  selector, visible: true,
                  left: Math.round(box.left), top: Math.round(box.top),
                  right: Math.round(box.right), bottom: Math.round(box.bottom),
                  width: Math.round(box.width), height: Math.round(box.height),
                };
              });
              const canvas = document.querySelector('#game-canvas');
              return {
                viewport: { width: innerWidth, height: innerHeight },
                document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
                canvas: { width: canvas.clientWidth, height: canvas.clientHeight },
                controls,
              };
            });
            assert.ok(layout.document.width <= viewport.width,
              `${viewport.name} has horizontal overflow: ${JSON.stringify(layout.document)}`);
            assert.ok(layout.canvas.width > 0 && layout.canvas.height > 0,
              `${viewport.name} collapsed the game canvas`);
            const missing = layout.controls.filter(control => !control.visible);
            assert.deepEqual(missing, [], `${viewport.name} hides critical gameplay controls`);
            const outside = layout.controls.filter(control => control.left < -1 || control.right > viewport.width + 1
              || control.top < -1 || control.bottom > viewport.height + 1);
            assert.deepEqual(outside, [], `${viewport.name} clips critical gameplay controls`);
            await screenshot(page, `final-gameplay-${viewport.name}`);
            viewports.push(layout);
          }
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.waitForTimeout(200);
          return { viewports };
        });

        if (skipFinalBenchmark) {
          record('Final 20-second active-play hardware rAF benchmark', 'deferred', {
            note: 'Deliberately held until the render-only shoal/landscape candidate is rebuilt; this run retains the pre-polish functional evidence.',
          });
        } else await step('Final 20-second active-play hardware rAF benchmark', async () => {
          const startMetrics = (await readQa(page)).rendererStats;
          const graphics = await page.locator('#game-canvas').evaluate(canvas => {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            const ext = gl?.getExtension('WEBGL_debug_renderer_info');
            return gl ? {
              renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
              vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
              drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
            } : null;
          });
          assert.ok(graphics, 'WebGL context was unavailable for final benchmark');
          await page.waitForTimeout(5000);
          const measurement = await page.evaluate(async duration => {
            const intervals = [];
            const start = performance.now();
            let previous = null;
            return new Promise(resolve => {
              function sample(now) {
                if (previous !== null) intervals.push(now - previous);
                previous = now;
                if (now - start >= duration) resolve({ elapsedMs: now - start, intervals });
                else requestAnimationFrame(sample);
              }
              requestAnimationFrame(sample);
            });
          }, benchmarkMs);
          const sorted = [...measurement.intervals].sort((a, b) => a - b);
          const percentile = p => sorted.length
            ? sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] : null;
          const medianMs = percentile(.5), p95Ms = percentile(.95);
          assert.ok(sorted.length > 500, 'Too few rAF samples for final benchmark: ' + sorted.length);
          const softwareRenderer = /swiftshader|llvmpipe|software/i.test(graphics.renderer + ' ' + graphics.vendor);
          const movement = [];
          for (const key of ['d', 's', 'a', 'w']) {
            const before = gameState(await readQa(page)).position;
            await page.keyboard.down(key);
            await page.waitForTimeout(700);
            await page.keyboard.up(key);
            const after = gameState(await readQa(page)).position;
            movement.push({
              key, from: before, to: after,
              displacement: Math.hypot(after.x - before.x, after.z - before.z),
            });
            await page.waitForTimeout(100);
          }
          const endMetrics = (await readQa(page)).rendererStats;
          const pendingGlErrors = await drainWebglErrors(page);
          const endWebglDiagnostics = await page.evaluate(() => window.__qaWebglDiagnostics);
          assert.deepEqual(pendingGlErrors, [], 'WebGL error queue was not empty after the sustained benchmark');
          assert.deepEqual(endWebglDiagnostics.glErrors, [],
            'WebGL errors were observed by the end of the sustained benchmark');
          assert.ok(endWebglDiagnostics.shaderCompiles.every(result => result.succeeded)
            && endWebglDiagnostics.programLinks.every(result => result.succeeded),
          'Shader compilation or program linking failed during the candidate run');
          const platform = await page.evaluate(() => ({
            userAgent: navigator.userAgent, browserPlatform: navigator.platform, devicePixelRatio,
          }));
          const report = {
            warmupMs: 5000, requestedDurationMs: benchmarkMs,
            elapsedMs: Math.round(measurement.elapsedMs), samples: sorted.length,
            medianFrameIntervalMs: medianMs, p95FrameIntervalMs: p95Ms,
            framesOver50ms: sorted.filter(interval => interval > 50).length,
            medianFps: medianMs ? 1000 / medianMs : null,
            graphics, browser: browser.version(), browserName,
            platform: { ...platform, os: os.platform(), osRelease: os.release(), architecture: os.arch() },
            viewport: { width: 1440, height: 900, drawingBuffer: graphics.drawingBuffer },
            quality: startMetrics?.quality || null, softwareRenderer,
            rendererStats: startMetrics,
            webglDiagnostics: { ...endWebglDiagnostics, pendingGlErrors },
            rendererAfterOneSailingCircuit: endMetrics,
            circuitSegments: movement,
            rendererSubmitCpuDiagnosticMs: startMetrics ? {
              median: startMetrics.renderCpuMsMedian, p95: startMetrics.renderCpuMsP95,
              interpretation: 'CPU render-submit diagnostic only; not FPS, frame interval, or GPU time.',
            } : null,
            hardwareFrameBudget: {
              targetMedianMs: 20, targetP95Ms: 33.4, evaluated: !softwareRenderer,
              meetsTarget: softwareRenderer ? null : medianMs <= 20 && p95Ms <= 33.4,
            },
            caveat: 'One headless Chrome run on this Apple M4 Pro/ANGLE Metal host is a local hardware profile, not a cross-device guarantee; software-rendered runs do not validate the hardware budget.',
          };
          assert.ok(movement.every(segment => segment.displacement > 0.2),
            'Final benchmark circuit did not move in all four directions');
          record('Final hardware frame-time budget', softwareRenderer ? 'blocked'
            : report.hardwareFrameBudget.meetsTarget ? 'pass' : 'fail', {
            medianFrameIntervalMs: medianMs, p95FrameIntervalMs: p95Ms,
            framesOver50ms: report.framesOver50ms, renderer: graphics.renderer,
            meetsTarget: report.hardwareFrameBudget.meetsTarget,
          });
          log('FINAL_BENCHMARK ' + JSON.stringify(report));
          return report;
        });
      }
    }

    await runGeneralizedStorageFailureCheck();
  } finally {
    await context.close();
    activePage = null;
  }
}

async function runGeneralizedStorageFailureCheck() {
  return isolatedStep('Generalized storage-failure and Save & return recovery', 'final-storage-guard', async (context, page) => {
    await context.addInitScript(() => {
      const originalSetItem = Storage.prototype.setItem;
      window.__qaBlockAllStorageWrites = true;
      Object.defineProperty(Storage.prototype, 'setItem', {
        configurable: true, writable: true,
        value(key, value) {
          if (window.__qaBlockAllStorageWrites) {
            throw new DOMException('Storage unavailable', 'QuotaExceededError');
          }
          return originalSetItem.call(this, key, value);
        },
      });
    });
    await page.goto(baseUrl + '/?qa=1', { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    await clickVisibleButton(page.locator('#menu-settings'), 'open settings with all storage writes blocked');
    let dialog = await dialogIsOpen(page, '#modal-dialog');
    const textSwitch = dialog.getByRole('switch', { name: /larger text/i });
    await textSwitch.focus();
    await page.keyboard.press('Space');
    assert.equal(await textSwitch.isChecked(), true,
      'Settings stopped applying when browser storage failed');
    assert.match((await page.locator('#toast-text').innerText()).toLowerCase(),
      /could not save them/, 'Settings storage failure had no user-visible explanation');
    assert.equal(await page.locator('html').evaluate(element => element.classList.contains('large-text')), true,
      'Storage failure rolled back the in-memory accessibility setting');
    await clickVisibleButton(dialog.getByRole('button', { name: /all comfortable/i }), 'close storage-blocked Settings');
    await dialog.waitFor({ state: 'hidden' });
    await beginFreshVoyage(page);
    const banner = page.locator('#save-banner');
    await banner.waitFor({ state: 'visible' });
    assert.equal(await banner.getAttribute('role'), 'alert', 'Failed automatic save did not use alert semantics');
    assert.equal(await banner.evaluate(element => element.classList.contains('save-error')), true,
      'Failed automatic save did not show error styling');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /not saved/,
      'Failed automatic save made a false success claim');
    await clickVisibleButton(page.locator('#pause-button'), 'pause with all storage writes blocked');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    const saveReturn = dialog.getByRole('button', { name: /save & return to title/i });
    await saveReturn.waitFor({ state: 'visible' });
    const saveReturnBox = await saveReturn.boundingBox();
    assert.ok(saveReturnBox && saveReturnBox.width >= 280 && saveReturnBox.height >= 44,
      'Save & return action is not a full-size, reachable button');
    await clickVisibleButton(saveReturn, 'Save & return while persistence is unavailable');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    assert.match((await dialog.innerText()).toLowerCase(), /save didn.t reach shore/,
      'Failed Save & return did not offer explicit recovery choices');
    assert.equal(await page.locator('#game-view').isVisible(), true,
      'Failed Save & return silently discarded the active voyage');
    await screenshot(page, 'final-storage-failure-save-return-1440x900');
    await clickVisibleButton(dialog.getByRole('button', { name: /^return to title$/i }),
      'choose session-only return to title');
    await page.locator('#main-menu').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#continue-voyage').isVisible(), true,
      'Session-only voyage was not resumable after choosing Return to title');
    assert.match((await page.locator('#save-summary').innerText()).toLowerCase(), /this session/,
      'Title screen did not identify the unsaved session-only voyage');
    await page.evaluate(() => { window.__qaBlockAllStorageWrites = false; });
    await clickVisibleButton(page.locator('#continue-voyage'), 'continue session-only voyage to retry Save');
    await page.locator('#game-view').waitFor({ state: 'visible' });
    await clickVisibleButton(page.locator('#pause-button'), 'open pause menu for successful retry');
    dialog = await dialogIsOpen(page, '#modal-dialog');
    await clickVisibleButton(dialog.getByRole('button', { name: /^save voyage$/i }), 'retry Save after storage recovery');
    const saved = await page.evaluate(() => localStorage.getItem('tidekin.save.v2'));
    assert.ok(saved, 'Save retry did not persist the active voyage');
    assert.equal(await page.locator('#save-banner').evaluate(element => element.classList.contains('save-error')), false,
      'Successful retry did not clear the durable save error');
    assert.match((await page.locator('#save-banner-text').innerText()).toLowerCase(), /voyage saved/,
      'Successful retry did not confirm the new save');
    return {
      settingsStillApplied: true,
      unsavedVoyageRemainedInSession: true,
      titleOfferedSessionOnlyContinue: true,
      saveReturnButton: { width: Math.round(saveReturnBox.width), height: Math.round(saveReturnBox.height) },
      recoveredSave: true,
    };
  });
}

async function main() {
  const ready = await waitForReadiness();
  if (!ready.serverReady || ready.missing.length > 0) {
    record('Readiness preflight', 'blocked', {
      baseUrl, serverResponding: ready.serverReady, missingFiles: ready.missing,
      waitMs: readinessMs,
      note: 'Waiting for the app entry point, all three GLBs, and local Vite server.',
    });
    await mkdir(captureDir, { recursive: true });
    await writeFile(reportPath, JSON.stringify({
      generatedAt: now.toISOString(), baseUrl, status: 'blocked',
      browser: null, results, runtimeErrors, failedRequests,
    }, null, 2));
    log('QA deferred. See ' + path.relative(projectRoot, reportPath));
    process.exitCode = 2;
    return;
  }

  await mkdir(captureDir, { recursive: true });
  await launchBrowser();
  await ensureWebgl();
  let context;
  if (finalCandidateOnly) {
    await runFinalCandidateChecks();
  } else if (beta3FinalRenderOnly) {
    await runBeta3FinalRenderChecks();
  } else if (beta3FixturesOnly) {
    await runBeta3FunctionalChecks({ fixturesOnly: true });
  } else if (beta3FunctionalOnly) {
    await runBeta3FunctionalChecks();
    record('Final hardware rAF benchmark', 'deferred', {
      note: 'Awaiting the artist limb-pivot scene rebuild; this functional-only run deliberately collected no performance samples.',
    });
  } else if (!recoveryOnly) {
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    activePage = page;
    page.setDefaultTimeout(5000);
    attachDiagnostics(page, 'primary');

    const menuReady = await runMenuChecks(page);
    let primarySaveKey = null;
    let saveResult = null;
    if (menuReady) {
      const gameResult = await runGameplayChecks(page);
      if (gameResult.ok && gameResult.details) {
        saveResult = gameResult.details;
        primarySaveKey = saveResult.saveKey || null;
      }
      if (primarySaveKey) await runInvalidSaveCheck(primarySaveKey);
      else record('Malformed-save fallback in disposable context', 'blocked', {
        note: 'The primary playthrough did not expose a saved voyage key.',
      });
    } else {
      record('Gameplay sequence', 'blocked', { note: 'Menu and new-voyage flow did not reach the game.' });
    }
  }

  if (!finalCandidateOnly && !beta3FunctionalOnly && !beta3FixturesOnly && !beta3FinalRenderOnly) {
    await runQuotaFailureCheck();
    await runBlockedGlbRecoveryCheck();
    await runHiddenDiveRecoveryCheck();
    await runLowQualityAffordanceCheck();
  }

  const readinessInfo = {
    browser: browser.version(),
    browserName,
    baseUrl,
    mode: beta3FinalRenderOnly ? 'beta3-final-render-only'
      : beta3FixturesOnly ? 'beta3-fixtures-only'
        : beta3FunctionalOnly ? 'beta3-functional-only'
      : finalCandidateOnly ? (skipFinalBenchmark ? 'final-candidate-functional' : 'final-candidate')
        : recoveryOnly ? 'recovery-only' : 'full',
    viewport: { width: 1440, height: 900 },
    captures: path.relative(projectRoot, captureDir),
  };
  if (runtimeErrors.length > 0 || failedRequests.length > 0 || httpFailures.length > 0) {
    record('Runtime errors and local request failures', 'fail', {
      runtimeErrors, failedRequests, httpFailures, benignNetworkResponses, expectedRecoveryEvents,
    });
  } else {
    record('Runtime errors and local request failures', 'pass', {
      runtimeErrors: 0, failedRequests: 0, httpFailures: 0, benignNetworkResponses, expectedRecoveryEvents,
    });
  }
  const report = {
    generatedAt: now.toISOString(),
    status: results.some(item => item.status === 'fail') ? 'fail'
      : results.some(item => ['blocked', 'deferred'].includes(item.status)) ? 'partial' : 'pass',
    ...readinessInfo,
    results,
    runtimeErrors,
    failedRequests,
    httpFailures,
    benignNetworkResponses,
    expectedRecoveryEvents,
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  log('Runtime errors: ' + runtimeErrors.length + '; failed local requests: ' + failedRequests.length);
  log('Report: ' + path.relative(projectRoot, reportPath));
  log('Captures: ' + path.relative(projectRoot, captureDir));
  await context?.close();
  await browser.close();
  if (report.status === 'fail') process.exitCode = 1;
}

main().catch(async error => {
  log('FATAL ' + error.message);
  if (browser) await browser.close().catch(() => {});
  await mkdir(captureDir, { recursive: true }).catch(() => {});
  await writeFile(reportPath, JSON.stringify({
    generatedAt: now.toISOString(), status: 'fatal', baseUrl,
    error: error.message, stack: error.stack, results, runtimeErrors, failedRequests,
    httpFailures, benignNetworkResponses,
  }, null, 2)).catch(() => {});
  process.exitCode = 1;
});
