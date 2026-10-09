import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.TIDEKIN_BASE_URL || 'http://127.0.0.1:5179/?qa=1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const captureDir = process.env.TIDEKIN_CAPTURE_DIR
  ? path.resolve(projectRoot, process.env.TIDEKIN_CAPTURE_DIR)
  : path.join(projectRoot, 'captures', `expert-${stamp}`);
const profileDir = process.env.TIDEKIN_EXPERT_PROFILE || path.join(os.tmpdir(), 'tidekin-expert-profile');
const evidence = { startedAt: new Date().toISOString(), baseUrl, browser: 'Google Chrome via Playwright', profileDir, actions: [], screenshots: [], sessions: [] };
const points = {
  home: { x: 0, z: 0 },
  'home-driftwood': { x: 4, z: 1 },
  'home-crate': { x: -4, z: 1 },
  'home-timber': { x: 6, z: 6 },
  'home-wreck': { x: -7, z: -5 },
  'home-pearls': { x: 6, z: -9 },
  'home-pearls-west': { x: -6, z: -10 },
  'shoal-east': { x: 18, z: -4 },
  'shoal-west': { x: -16, z: -22 },
  mangrove: { x: 36, z: 0 },
  'mangrove-timber': { x: 38, z: 3 },
  'mangrove-roots': { x: 32, z: -4 },
  'mangrove-crate': { x: 41, z: -3 },
  'mangrove-pearls': { x: 34, z: -7 },
  reef: { x: -28, z: -32 },
  'reef-driftwood': { x: -24, z: -29 },
  'reef-wreck': { x: -32, z: -35 },
  'reef-pearls': { x: -23, z: -37 },
  'reef-pearls-deep': { x: -33, z: -39 },
  horizon: { x: 6, z: 62 },
  'horizon-timber': { x: 10, z: 65 },
  'horizon-wreck': { x: 2, z: 58 },
  'horizon-pearls': { x: 10, z: 56 },
};

let context;
let page;
let sessionStartedAt = null;
let sessionStartGameTime = null;

await mkdir(captureDir, { recursive: true });

function say(value) {
  process.stdout.write(`${typeof value === 'string' ? value : JSON.stringify(value)}\n`);
}

async function launch() {
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  });
  page = context.pages()[0] || await context.newPage();
  page.on('pageerror', error => evidence.actions.push({ kind: 'browser-pageerror', at: new Date().toISOString(), message: error.message }));
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('#main-menu').waitFor({ state: 'visible', timeout: 15000 });
  await page.bringToFront();
  say({ browserReady: true, title: await page.title(), url: page.url(), profileDir });
}

async function readState() {
  return page.evaluate(() => ({
    state: window.__tidekin?.getState?.() ?? null,
    metrics: window.__tidekin?.getMetrics?.() ?? null,
    visible: {
      menu: !document.querySelector('#main-menu')?.hidden,
      game: !document.querySelector('#game-view')?.hidden,
      modal: document.querySelector('#modal-dialog')?.open ?? false,
      panel: document.querySelector('#panel-dialog')?.open ?? false,
      toast: document.querySelector('#toast')?.innerText ?? '',
      tide: document.querySelector('#tide-label')?.innerText ?? '',
      objective: document.querySelector('#objective-name')?.innerText ?? '',
      hint: document.querySelector('#context-hint')?.innerText ?? '',
      forecast: document.querySelector('#tide-forecast')?.innerText ?? '',
      routeOptions: document.querySelector('#route-summary')?.innerText ?? '',
    },
  }));
}

function brief(state) {
  if (!state) return null;
  return {
    time: Number(state.time?.toFixed?.(2) ?? state.time), day: state.day, region: state.region,
    position: state.position, inventory: state.inventory, energy: Number(state.energy?.toFixed?.(1) ?? state.energy),
    upgrades: state.upgrades, discoveries: state.discoveries, rig: state.rig, speed: state.speed, diving: state.diving,
    oxygen: Number(state.oxygen?.toFixed?.(1) ?? state.oxygen), rescues: state.stats?.rescues,
    gathered: state.stats?.gathered, expeditions: state.expeditions, recovery: state.recovery, lastEvent: state.lastEvent,
  };
}

async function snapshot(label) {
  const reading = await readState();
  say({ label, ...reading.visible, state: brief(reading.state), metrics: reading.metrics });
  return reading;
}

async function act(name, fn) {
  const before = await readState();
  const startedAt = new Date().toISOString();
  let result;
  try {
    result = await fn(before);
  } catch (error) {
    result = { error: error.message };
  }
  await page.waitForTimeout(180);
  const after = await readState();
  const entry = {
    name, startedAt, endedAt: new Date().toISOString(),
    before: brief(before.state), after: brief(after.state), visible: after.visible, result,
  };
  evidence.actions.push(entry);
  say({ action: name, result, before: brief(before.state), after: brief(after.state), visible: after.visible });
  return entry;
}

async function screenshot(name) {
  const safeName = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'moment';
  const file = path.join(captureDir, `${safeName}.png`);
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled', timeout: 15000 });
  evidence.screenshots.push({ name: safeName, file: path.relative(projectRoot, file), at: new Date().toISOString(), state: brief((await readState()).state) });
  say({ screenshot: path.relative(projectRoot, file) });
}

async function click(locator) {
  await locator.waitFor({ state: 'visible', timeout: 5000 });
  if (!(await locator.isEnabled())) throw new Error(`Control is disabled: ${await locator.getAttribute('id')}`);
  await locator.click();
}

async function startNew() {
  return act('start-new-voyage-through-menu', async () => {
    await click(page.locator('#new-voyage'));
    await click(page.locator('[data-modal-action="confirm-new"]'));
    await page.locator('#game-canvas').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForFunction(() => Boolean(window.__tidekin?.getState?.()), null, { timeout: 20000 });
    await page.locator('#game-canvas').click({ position: { x: 720, y: 450 } });
    sessionStartedAt = new Date().toISOString();
    sessionStartGameTime = (await readState()).state?.time ?? 0;
    return { playedThrough: 'Start new voyage and confirmation buttons' };
  });
}

async function continueVoyage() {
  return act('continue-saved-voyage-through-menu', async () => {
    await click(page.locator('#continue-voyage'));
    await page.locator('#game-canvas').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => Boolean(window.__tidekin?.getState?.()), null, { timeout: 10000 });
    await page.locator('#game-canvas').click({ position: { x: 720, y: 450 } });
    sessionStartedAt = new Date().toISOString();
    sessionStartGameTime = (await readState()).state?.time ?? 0;
    return { playedThrough: 'Continue voyage button' };
  });
}

async function steerTo(id) {
  const target = points[id];
  if (!target) throw new Error(`Unknown chart target: ${id}`);
  const start = Date.now();
  const initial = await readState();
  if (initial.visible.panel || initial.visible.modal) throw new Error('Close the open panel or modal before steering.');
  const maxMs = 45000;
  let lastReport = start;
  let current;
  while (Date.now() - start < maxMs) {
    current = (await readState()).state;
    if (!current) throw new Error('Voyage is not active.');
    const dx = target.x - current.position.x;
    const dz = target.z - current.position.z;
    if (Math.hypot(dx, dz) <= 2.25) break;
    const code = `${dx > 0.45 ? 'KeyD' : dx < -0.45 ? 'KeyA' : ''}${dz > 0.45 ? 'KeyS' : dz < -0.45 ? 'KeyW' : ''}`;
    const keys = code.match(/Key[A-Z]/g) || [];
    if (!keys.length) break;
    for (const key of keys) await page.keyboard.down(key);
    await page.waitForTimeout(180);
    for (const key of keys) await page.keyboard.up(key);
    if (Date.now() - lastReport > 2500) {
      lastReport = Date.now();
      say({ steering: id, position: current.position, distance: Number(Math.hypot(dx, dz).toFixed(1)), tide: (await readState()).visible.tide });
    }
  }
  current = (await readState()).state;
  const distance = Math.hypot(target.x - current.position.x, target.z - current.position.z);
  return { target: id, targetPosition: target, finalPosition: current.position, distance: Number(distance.toFixed(2)), wallSeconds: Number(((Date.now() - start) / 1000).toFixed(1)), reachedInteractionRange: distance <= 3 };
}

async function moveTo(id) {
  return act(`steer-to-${id}-with-wasd`, async () => {
    const result = await steerTo(id);
    if (!result.reachedInteractionRange) throw new Error(`Could not reach ${id}; ${result.distance} m away.`);
    return result;
  });
}

async function gather() {
  return act('gather-with-e-key', async () => {
    await page.keyboard.press('e');
    return { input: 'E key', hintBefore: (await readState()).visible.hint };
  });
}

async function dive() {
  return act('dive-with-space-key', async () => {
    await page.keyboard.press('Space');
    return { input: 'Space key' };
  });
}

async function openPanel(name) {
  const hotkey = { workshop: 'b', journal: 'j', chart: 'm' }[name];
  if (!hotkey) throw new Error('Panel must be workshop, journal, or chart.');
  return act(`open-${name}-with-${hotkey}-key`, async () => {
    const title = { workshop: 'The workshop', journal: 'Your tide journal', chart: 'The ocean chart' }[name];
    const isOpen = await page.locator('#panel-dialog').isVisible();
    const currentTitle = isOpen ? await page.locator('#panel-title').innerText() : null;
    if (!isOpen || currentTitle !== title) await page.keyboard.press(hotkey);
    await page.locator('#panel-dialog').waitFor({ state: 'visible', timeout: 4000 });
    return { input: currentTitle === title ? 'already open' : `${hotkey.toUpperCase()} key`, panelTitle: await page.locator('#panel-title').innerText() };
  });
}

async function build(id) {
  const accepted = ['waterwheel', 'crane', 'greenhouse', 'sail', 'beacon'];
  if (!accepted.includes(id)) throw new Error(`Unknown upgrade: ${id}`);
  return act(`build-${id}-through-workshop`, async () => {
    const isWorkshop = await page.locator('#panel-dialog').isVisible()
      && await page.locator('#panel-title').innerText() === 'The workshop';
    if (!isWorkshop) await page.keyboard.press('b');
    await page.locator(`#craft-${id}`).waitFor({ state: 'visible', timeout: 4000 });
    if (!(await page.locator(`#craft-${id}`).isEnabled())) {
      return { built: false, disabled: true, reason: await page.locator(`#recipe-reason-${id}`).innerText() };
    }
    await click(page.locator(`#craft-${id}`));
    return { clickedVisibleBuildButton: id };
  });
}

async function fitRig(id) {
  const accepted = ['balanced', 'skimmer', 'diver'];
  if (!accepted.includes(id)) throw new Error(`Unknown rig: ${id}; choose balanced, skimmer, or diver.`);
  return act(`fit-${id}-through-workshop`, async () => {
    const isWorkshop = await page.locator('#panel-dialog').isVisible()
      && await page.locator('#panel-title').innerText() === 'The workshop';
    if (!isWorkshop) await page.keyboard.press('b');
    const button = page.locator(`#panel-body button[data-game-action="rig"][data-id="${id}"]`);
    if (await page.locator(`#panel-body [data-game-action="rig"][data-id="${id}"]`).count()) {
      await click(button);
      return { clickedVisibleRigButton: id };
    }
    const card = page.locator('#panel-body .rig-card').filter({ hasText: ({ balanced: 'Wanderer', skimmer: 'Skimmer', diver: 'Pearl diver' })[id] });
    await card.waitFor({ state: 'visible', timeout: 4000 });
    return { alreadyFitted: true, rig: id, cardText: await card.innerText() };
  });
}

async function closePanel() {
  return act('close-panel-with-visible-button', async () => {
    await click(page.locator('#close-panel'));
    return { input: 'visible Close panel button' };
  });
}

async function travel(id) {
  const accepted = ['home', 'mangrove', 'reef', 'horizon'];
  if (!accepted.includes(id)) throw new Error(`Unknown destination: ${id}`);
  return act(`travel-to-${id}-through-chart`, async () => {
    const isChart = await page.locator('#panel-dialog').isVisible()
      && await page.locator('#panel-title').innerText() === 'The ocean chart';
    if (!isChart) await page.keyboard.press('m');
    const button = page.locator(`#travel-${id}`);
    await button.waitFor({ state: 'visible', timeout: 4000 });
    if (!(await button.isEnabled())) return { travelled: false, disabled: true, reason: await page.locator(`#travel-reason-${id}`).innerText() };
    await click(button);
    return { clickedVisibleChartButton: id };
  });
}

async function claim() {
  return act('claim-ready-journal-reward-through-button', async () => {
    const isJournal = await page.locator('#panel-dialog').isVisible()
      && await page.locator('#panel-title').innerText() === 'Your tide journal';
    if (!isJournal) await page.keyboard.press('j');
    const button = page.locator('#panel-body button[data-game-action="claim"]:not([disabled])').first();
    if (!(await button.count())) return { claimed: false, reason: 'No ready reward was shown.' };
    const id = await button.getAttribute('data-id');
    await click(button);
    return { clickedVisibleClaimButton: id };
  });
}

async function claimAllReady() {
  return act('claim-all-visible-journal-rewards-through-buttons', async () => {
    const isJournal = await page.locator('#panel-dialog').isVisible()
      && await page.locator('#panel-title').innerText() === 'Your tide journal';
    if (!isJournal) await page.keyboard.press('j');
    const claimed = [];
    for (let i = 0; i < 12; i += 1) {
      const button = page.locator('#panel-body button[data-game-action="claim"]:not([disabled])').first();
      if (!(await button.count())) break;
      claimed.push(await button.getAttribute('data-id'));
      await click(button);
    }
    return { claimedVisibleButtons: claimed };
  });
}

async function assertBuilt(id) {
  const current = await readState();
  if (!current.state?.upgrades?.[id]) throw new Error(`${id} is not built; current recipe feedback: ${await page.locator(`#recipe-reason-${id}`).innerText().catch(() => 'workshop not open')}`);
}

async function alignToLowTide() {
  const lowStart = 180 - Math.acos(1 - 2 * .35) / (2 * Math.PI) * 180;
  const lowEnd = 180 - lowStart;
  for (let i = 0; i < 4; i += 1) {
    const state = (await readState()).state;
    const phase = state.time % 180;
    if (phase <= lowEnd || phase >= lowStart) return { phase: Number(phase.toFixed(2)), waited: false };
    const remaining = lowStart - phase + 1;
    const seconds = Math.min(60, Math.ceil(remaining));
    await waitSeconds(seconds);
  }
  const phase = (await readState()).state.time % 180;
  return { phase: Number(phase.toFixed(2)), waited: true };
}

async function runRigRoute(rig) {
  if (!['skimmer', 'diver'].includes(rig)) throw new Error('Rig route requires skimmer or diver.');
  const before = await readState();
  if (!before.state?.upgrades?.waterwheel) throw new Error('The imported route must already have an earned waterwheel.');
  if (before.state?.region !== 'home' || Math.hypot(before.state?.position?.x ?? 0, before.state?.position?.z ?? 0) > 7) await travel('home');
  await fitRig(rig);
  await closePanel();
  await screenshot(`beta2-${rig}-route-start`);
  const tideAlignment = await alignToLowTide();
  const start = await readState();
  const startWall = Date.now();
  await screenshot(`beta2-${rig}-route-go`);
  await moveTo('shoal-east');
  await screenshot(`beta2-${rig}-first-shoal`);
  await moveTo('shoal-west');
  await screenshot(`beta2-${rig}-second-shoal`);
  await moveTo('reef-pearls');
  await diveGatherSurface();
  await screenshot(`beta2-${rig}-reef-pearls`);
  const end = await readState();
  const summary = {
    rig, speed: end.state.speed, oxygenCapacity: rig === 'diver' ? 28 : 12,
    route: ['home', 'shoal-east', 'shoal-west', 'reef-pearls'], tideAlignment,
    startState: brief(start.state), endState: brief(end.state),
    gameSeconds: Number((end.state.time - start.state.time).toFixed(2)),
    wallSeconds: Number(((Date.now() - startWall) / 1000).toFixed(2)),
    tideStart: start.visible.tide, tideEnd: end.visible.tide,
    forecastEnd: await page.locator('#tide-forecast').innerText(),
    contextHintEnd: end.visible.hint,
  };
  evidence.actions.push({ name: `beta2-rig-route-summary-${rig}`, at: new Date().toISOString(), result: summary });
  say({ rigRouteComplete: summary });
}

async function runFreshBeta2Route() {
  await reloadPage();
  await startNew();
  await screenshot('beta2-fresh-start');
  await moveTo('home-driftwood');
  await gather();
  await claimAllReady();
  await build('waterwheel');
  await assertBuilt('waterwheel');
  await claimAllReady();
  await closePanel();
  await moveTo('home-crate');
  await gather();
  await build('crane');
  await assertBuilt('crane');
  await claimAllReady();
  await closePanel();
  await moveTo('home-pearls');
  await diveGatherSurface();
  await screenshot('beta2-home-pearls-earned');
  await claimAllReady();
  await travel('mangrove');
  await claimAllReady();
  await closePanel();
  await moveTo('mangrove-timber');
  await gather();
  await moveTo('mangrove-crate');
  await gather();
  await moveTo('mangrove-pearls');
  await diveGatherSurface();
  await screenshot('beta2-mangrove-pearls-earned');
  await travel('home');
  await build('greenhouse');
  await assertBuilt('greenhouse');
  await claimAllReady();
  await build('sail');
  await assertBuilt('sail');
  await claimAllReady();
  await openPanel('workshop');
  await screenshot('beta2-fresh-beacon-shortfall-before-outside-pearls');
  const preOutsideBeacon = await readState();
  evidence.actions.push({ name: 'beta2-beacon-requirements-before-outside-pearls', at: new Date().toISOString(), result: {
    state: brief(preOutsideBeacon.state), beaconCard: await page.locator('.recipe-card').filter({ hasText: 'Beacon' }).innerText().catch(() => 'Beacon card not found'),
  } });
  await closePanel();
  await travel('reef');
  await moveTo('reef-pearls');
  const beforeReefPearls = await readState();
  await diveGatherSurface();
  const afterReefPearls = await readState();
  const reefPearlDelta = afterReefPearls.state.inventory.pearls - beforeReefPearls.state.inventory.pearls;
  if (reefPearlDelta !== 4) throw new Error(`Expected the Reef pearl bed to add 4 pearls; observed ${reefPearlDelta}.`);
  await screenshot('beta2-reef-outside-pearls-earned');
  evidence.actions.push({ name: 'beta2-outside-pearls-delta', at: new Date().toISOString(), result: {
    node: 'reef-pearls', region: afterReefPearls.state.region, amountGained: reefPearlDelta,
    totalPearls: afterReefPearls.state.inventory.pearls, gathered: afterReefPearls.state.gathered,
  } });
  await travel('home');
  await openPanel('workshop');
  await screenshot('beta2-fresh-post-pearl-beacon-recipe');
  const preBeacon = await readState();
  evidence.actions.push({ name: 'beta2-pre-beacon-workshop-state', at: new Date().toISOString(), result: {
    state: brief(preBeacon.state), beaconCard: await page.locator('.recipe-card').filter({ hasText: 'Beacon' }).innerText().catch(() => 'Beacon card not found'),
  } });
  await closePanel();
  await travel('horizon');
  await moveTo('horizon-wreck');
  await gather();
  await moveTo('horizon-timber');
  await gather();
  await claimAllReady();
  await travel('home');
  await openPanel('workshop');
  await screenshot('beta2-fresh-beacon-resources-ready');
  await build('beacon');
  await assertBuilt('beacon');
  await screenshot('beta2-fresh-beacon-built');
  await finishSession();
  await launch();
  await reloadPage();
  await continueVoyage();
  await screenshot('beta2-fresh-after-continue');
  await finishSession();
  await saveEvidence();
}


// Beta3 preparation: no domain imports/actions, save writes, or clock acceleration.
// Run only after the parent confirms the final build, with TIDEKIN_BETA3_FINAL=1.
const expeditionRoutes = {
  'current-run': [{ x: 18, z: -4 }, { x: 34, z: -12 }, { x: -16, z: -22 }, { x: 0, z: 0 }],
  'pearl-trail': [{ x: 8, z: -12 }, { x: 24, z: -24 }, { x: 8, z: -42 }, { x: -16, z: -32 }],
};
points['pearl-trail-start'] = expeditionRoutes['pearl-trail'][0];

async function required(operation) {
  const entry = await operation;
  if (entry?.result?.error) throw new Error(`${entry.name}: ${entry.result.error}`);
  return entry;
}

async function beta3Checkpoint(label, result = {}) {
  evidence.actions.push({ name: label, at: new Date().toISOString(), result,
    state: brief((await readState()).state) });
  await screenshot(label);
  await saveEvidence();
}

async function expeditionButton(action, id) {
  return required(act(`beta3-ui-${action}-${id || 'active'}`, async () => {
    await required(openPanel('journal'));
    const board = page.locator('details.expedition-board');
    await board.waitFor({ state: 'visible', timeout: 4000 });
    if (await board.getAttribute('open') === null) await click(board.locator('summary'));
    const selector = `[data-game-action="${action}"]${id ? `[data-id="${id}"]` : ''}`;
    const button = board.locator(selector);
    await click(button);
    return { clickedVisibleButton: selector, journal: await board.innerText() };
  }));
}

async function followExpedition() {
  if ((await readState()).visible.panel) {
    await click(page.locator('[data-follow-expedition]'));
  } else {
    await click(page.locator('#track-expedition'));
  }
}

async function steerMarker(id, index) {
  const target = expeditionRoutes[id]?.[index];
  if (!target) throw new Error(`Unknown expedition marker ${id}:${index}`);
  return required(act(`beta3-steer-${id}-marker-${index + 1}`, async () => {
    const initial = await readState();
    if (initial.visible.panel || initial.visible.modal) throw new Error('Close panels before marker steering.');
    const rescues = initial.state.stats.rescues;
    const started = Date.now();
    let outcome = 'timeout';
    while (Date.now() - started < 45000) {
      const state = (await readState()).state;
      if (state.stats.rescues > rescues) { outcome = 'rescued'; break; }
      const active = state.expeditions?.active;
      if (active?.id !== id) throw new Error('Active expedition changed unexpectedly.');
      if (active.index > index) { outcome = 'marker-reached'; break; }
      if (id === 'pearl-trail' && !state.diving) { outcome = 'surfaced-or-reset'; break; }
      const dx = target.x - state.position.x, dz = target.z - state.position.z;
      const keys = [];
      if (Math.abs(dx) > .3) keys.push(dx > 0 ? 'KeyD' : 'KeyA');
      if (Math.abs(dz) > .3) keys.push(dz > 0 ? 'KeyS' : 'KeyW');
      try {
        for (const key of keys) await page.keyboard.down(key);
        await page.waitForTimeout(100);
      } finally {
        for (const key of keys) await page.keyboard.up(key);
      }
    }
    const state = (await readState()).state;
    if (outcome === 'timeout') throw new Error(`Marker ${index + 1} timed out at ${JSON.stringify(state.position)}`);
    return { outcome, target, wallSeconds: (Date.now() - started) / 1000,
      oxygen: state.oxygen, active: state.expeditions.active };
  }));
}

async function waitForNextExpeditionDay(id) {
  const initial = (await readState()).state;
  if (initial.expeditions.lastCompletedDay[id] < initial.day) return;
  const limit = Date.now() + 190000;
  while ((await readState()).state.day <= initial.day) {
    if (Date.now() > limit) throw new Error('Next-day wait exceeded 190 real seconds.');
    await required(waitSeconds(10));
    say({ beta3WaitingForNextDay: true, state: brief((await readState()).state) });
  }
}

async function runPearlTrail(rig, expectSuccess) {
  await required(fitRig(rig));
  await required(closePanel());
  await expeditionButton('start-expedition', 'pearl-trail');
  await followExpedition();
  await required(moveTo('pearl-trail-start'));
  await beta3Checkpoint(`beta3-${rig}-before-one-breath`);
  const before = (await readState()).state;
  const startWall = Date.now();
  await required(dive());
  const markers = [];
  for (let i = 0; i < 4; i++) {
    const step = await steerMarker('pearl-trail', i);
    markers.push(step.result);
    if (step.result.outcome !== 'marker-reached') break;
  }
  const end = (await readState()).state;
  const success = Boolean(end.expeditions.active?.ready);
  const result = { rig, expected: expectSuccess ? 'one-breath-success' : 'failure-or-reset', success,
    markers, gameSeconds: end.time - before.time, wallSeconds: (Date.now() - startWall) / 1000,
    oxygenRemaining: end.oxygen, rescuesAdded: end.stats.rescues - before.stats.rescues,
    inventoryBefore: before.inventory, inventoryAfter: end.inventory,
    completedBefore: before.expeditions.completed, completedAfter: end.expeditions.completed };
  await beta3Checkpoint(`beta3-${rig}-one-breath-result`, result);
  if (success !== expectSuccess) throw new Error(`Unexpected ${rig} trail outcome; evidence retained.`);
  if (end.diving) await required(dive());
  if (success) {
    await required(moveTo('home'));
    await expeditionButton('claim-expedition');
    const claimed = (await readState()).state;
    if (claimed.expeditions.completed['pearl-trail'] !== before.expeditions.completed['pearl-trail'] + 1)
      throw new Error('Pearl expedition completion tally did not advance.');
    await beta3Checkpoint(`beta3-${rig}-claimed`);
    await required(closePanel());
  } else {
    if (end.expeditions.active?.index !== 0) throw new Error('Failed trail did not reset to its first marker.');
    for (const resource of ['wood', 'scrap', 'pearls']) {
      if (end.inventory[resource] < before.inventory[resource]) throw new Error(`Rescue lost ${resource}.`);
    }
    await expeditionButton('abandon-expedition');
    await required(closePanel());
  }
}

async function runFreshBeta3Route() {
  if (process.env.TIDEKIN_BETA3_FINAL !== '1' || new URL(baseUrl).port !== '5181')
    throw new Error('Beta3 route is gated until final-build confirmation: use port 5181 and TIDEKIN_BETA3_FINAL=1.');
  await required(reloadPage());
  if (await page.locator('#continue-voyage').isVisible()) throw new Error('Use a new isolated profile for the beta3 fresh route.');
  await required(startNew());
  await beta3Checkpoint('beta3-fresh-start');
  await required(moveTo('home-driftwood'));
  await required(gather());
  await required(claimAllReady());
  await required(build('waterwheel'));
  await assertBuilt('waterwheel');
  await required(claimAllReady());
  await required(openPanel('chart'));
  if (await page.locator('#travel-mangrove').isEnabled()) throw new Error('Undiscovered Mangrove permits chart passage.');
  await beta3Checkpoint('beta3-undiscovered-shore-disabled', {
    reason: await page.locator('#travel-reason-mangrove').innerText() });
  await expeditionButton('start-expedition', 'current-run');
  await followExpedition();
  await beta3Checkpoint('beta3-current-run-navigation', {
    routeOptions: await page.locator('#route-summary').innerText(),
    bypassVisible: await page.locator('#route-bypass').isVisible() });
  // Select an actual route button; later compare its shown estimate with observed travel.
  if (await page.locator('#route-direct').isVisible()) await click(page.locator('#route-direct'));
  await steerMarker('current-run', 0);
  const saved = (await readState()).state;
  await beta3Checkpoint('beta3-active-expedition-before-reload');
  await finishSession();
  await launch();
  await required(continueVoyage());
  const restored = (await readState()).state;
  if (JSON.stringify(saved.expeditions) !== JSON.stringify(restored.expeditions))
    throw new Error('Active expedition progress changed across menu/browser return.');
  await beta3Checkpoint('beta3-active-expedition-restored');
  await followExpedition();
  for (let i = restored.expeditions.active.index; i < 4; i++) await steerMarker('current-run', i);
  await expeditionButton('claim-expedition');
  if ((await readState()).state.expeditions.completed['current-run'] !== 1)
    throw new Error('Surface expedition completion tally did not increment.');
  await beta3Checkpoint('beta3-surface-expedition-claimed');
  await required(closePanel());
  await runPearlTrail('diver', true);
  // Claiming a route prevents another start that day. Wait in live game, never edit time.
  await waitForNextExpeditionDay('pearl-trail');
  await runPearlTrail('skimmer', false);
  await required(openPanel('chart'));
  const discoveredBefore = (await readState()).state.discoveries.includes('mangrove');
  await click(page.locator('#track-mangrove'));
  await required(moveTo('mangrove'));
  if (!(await readState()).state.discoveries.includes('mangrove')) throw new Error('Sailing did not discover Mangrove.');
  await beta3Checkpoint('beta3-island-discovered-by-sailing', { discoveredBefore });
  await required(travel('home'));
  await required(travel('mangrove'));
  if ((await readState()).state.region !== 'mangrove') throw new Error('Discovered-island chart passage failed.');
  await beta3Checkpoint('beta3-known-island-chart-passage');
  await finishSession();
  await launch();
  await required(continueVoyage());
  const final = (await readState()).state;
  if (final.expeditions.completed['current-run'] !== 1 || final.expeditions.completed['pearl-trail'] !== 1)
    throw new Error('Claimed expedition tallies did not survive final reload.');
  await beta3Checkpoint('beta3-final-tallies-after-continue');
  await finishSession();
  await saveEvidence();
}


async function runBeta3SurfaceRepeat() {
  if (process.env.TIDEKIN_BETA3_FINAL !== '1') throw new Error('Final-build confirmation required.');
  await required(travel('home'));
  await required(fitRig('balanced'));
  await required(closePanel());
  await waitForNextExpeditionDay('current-run');
  const before = (await readState()).state;
  await expeditionButton('start-expedition', 'current-run');
  await followExpedition();
  await steerMarker('current-run', 0);
  await steerMarker('current-run', 1);
  // Wait only when necessary to exercise the existing exposed-shoal choice.
  const limit = Date.now() + 150000;
  while (!(await page.locator('#route-bypass').isVisible())) {
    if (Date.now() > limit) throw new Error('No bypass offered in bounded tide wait.');
    await required(waitSeconds(10));
  }
  const offered = await page.locator('#route-summary').innerText();
  await click(page.locator('#route-bypass'));
  await beta3Checkpoint('beta3-bypass-selected', { offered,
    guidance: await page.locator('#navigation-distance').innerText() });
  const started = (await readState()).state.time;
  const deadline = Date.now() + 40000;
  while (await page.locator('#navigation-name').innerText() === 'Around the shoal') {
    if (Date.now() > deadline) throw new Error('Bypass compass steering exceeded 40 seconds.');
    const guidance = await page.locator('#navigation-distance').innerText();
    const direction = guidance.match(/m\s+(N|NE|E|SE|S|SW|W|NW)\s*·/)?.[1];
    if (!direction) throw new Error(`Unreadable visible compass guidance: ${guidance}`);
    const keys = [...direction].map(letter => ({ N: 'KeyW', S: 'KeyS', E: 'KeyD', W: 'KeyA' })[letter]);
    try {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(100);
    } finally {
      for (const key of keys) await page.keyboard.up(key);
    }
  }
  await steerMarker('current-run', 2);
  await beta3Checkpoint('beta3-bypass-marker-reached', {
    offered, observedGameSeconds: (await readState()).state.time - started,
    method: 'Actual Around shoal button; visible compass directions to bend, then WASD to marker.' });
  await steerMarker('current-run', 3);
  await expeditionButton('claim-expedition');
  const after = (await readState()).state;
  if (after.expeditions.completed['current-run'] !== before.expeditions.completed['current-run'] + 1)
    throw new Error('Next-day Current run claim did not increase tally.');
  await beta3Checkpoint('beta3-next-day-third-completion', { before: brief(before), after: brief(after) });
  await required(closePanel());
  await beta3Checkpoint('beta3-three-completions-pennant-view');
  await finishSession();
  await launch();
  await required(continueVoyage());
  await beta3Checkpoint('beta3-repeat-tallies-after-continue');
  await finishSession();
  await saveEvidence();
}

async function waitSeconds(seconds) {
  const duration = Math.min(60, Math.max(0, Number(seconds) || 0));
  return act(`wait-${duration}-seconds-in-live-game`, async () => {
    await page.waitForTimeout(duration * 1000);
    return { liveGameSeconds: duration };
  });
}

async function finishSession() {
  const before = await readState();
  if (before.state && before.visible.game) {
    if (before.visible.panel) await click(page.locator('#close-panel'));
    await click(page.locator('#pause-button'));
    await click(page.locator('[data-modal-action="menu"]'));
    await page.locator('#main-menu').waitFor({ state: 'visible', timeout: 5000 });
  }
  const after = await readState();
  const session = {
    startedAt: sessionStartedAt,
    endedAt: new Date().toISOString(),
    wallSeconds: sessionStartedAt ? Number(((Date.now() - Date.parse(sessionStartedAt)) / 1000).toFixed(1)) : null,
    gameSeconds: before.state && sessionStartGameTime !== null ? Number((before.state.time - sessionStartGameTime).toFixed(1)) : null,
    endState: brief(before.state),
    titleSummary: after.visible,
  };
  evidence.sessions.push(session);
  sessionStartedAt = null;
  sessionStartGameTime = null;
  await screenshot(`session-${evidence.sessions.length}-save-on-title`);
  await context.close();
  context = null;
  page = null;
  say({ sessionClosed: session });
}

async function reloadPage() {
  return act('browser-reload', async () => {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.locator('#main-menu').waitFor({ state: 'visible', timeout: 10000 });
    return { persistedContinueVisible: !(await page.locator('#continue-voyage').isHidden()) };
  });
}

async function exportSave() {
  if (new URL(baseUrl).port !== '5179') throw new Error('Exact baseline save export is limited to the 5179 baseline.');
  const rawSave = await page.evaluate(() => localStorage.getItem('tidekin.save.v2'));
  if (!rawSave) throw new Error('No earned baseline save was found in this browser profile.');
  const file = path.join(captureDir, 'baseline-save-transfer.json');
  const transfer = {
    label: 'Exact earned Tidekin baseline save for beta2 comparison; payload is unmodified.',
    source: 'http://127.0.0.1:5179/?qa=1',
    exportedAt: new Date().toISOString(),
    rawSave,
  };
  await writeFile(file, JSON.stringify(transfer, null, 2) + '\n');
  say({ exportedExactSave: path.relative(projectRoot, file), bytes: Buffer.byteLength(rawSave) });
}

async function importSave(fileArg) {
  if (new URL(baseUrl).port !== '5180') throw new Error('Save transfer is limited to the separate 5180 beta2 context.');
  if (!fileArg) throw new Error('Provide the baseline-save-transfer.json path.');
  const transfer = JSON.parse(await readFile(path.resolve(projectRoot, fileArg), 'utf8'));
  if (typeof transfer.rawSave !== 'string' || !transfer.rawSave) throw new Error('Transfer file has no exact raw save text.');
  const outcome = await page.evaluate(rawSave => {
    const key = 'tidekin.save.v2';
    const current = localStorage.getItem(key);
    if (current !== null && current !== rawSave) return { imported: false, reason: 'This isolated profile already contains a different save.' };
    localStorage.setItem(key, rawSave);
    return { imported: true, bytes: new Blob([rawSave]).size };
  }, transfer.rawSave);
  if (!outcome.imported) throw new Error(outcome.reason);
  evidence.actions.push({ name: 'beta2-exact-save-transfer', at: new Date().toISOString(), source: transfer.source, transferPath: fileArg, outcome, note: 'Unmodified raw save copied into a fresh 5180-origin isolated profile; progression was not granted or edited.' });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.locator('#main-menu').waitFor({ state: 'visible', timeout: 10000 });
  say({ beta2SaveTransfer: outcome, continueVisible: !(await page.locator('#continue-voyage').isHidden()), source: transfer.source });
}

async function diveGatherSurface() {
  return act('dive-gather-surface-with-space-e-space', async () => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    const atDive = (await readState()).state;
    if (!atDive?.diving) throw new Error('Dive did not start through the Space key.');
    await page.keyboard.press('e');
    await page.waitForTimeout(120);
    const afterGather = (await readState()).state;
    if (afterGather?.diving) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(120);
    }
    return { inputs: ['Space', 'E', ...(afterGather?.diving ? ['Space'] : [])], oxygenAtStart: atDive.oxygen, stateAfter: brief((await readState()).state) };
  });
}

async function saveEvidence() {
  evidence.endedAt = new Date().toISOString();
  evidence.sessionsOpenAtEnd = sessionStartedAt ? {
    startedAt: sessionStartedAt,
    gameStartedAt: sessionStartGameTime,
    currentState: brief((await readState()).state),
  } : null;
  const file = path.join(captureDir, 'playtest-run.json');
  await writeFile(file, JSON.stringify(evidence, null, 2) + '\n');
  say({ evidenceFile: path.relative(projectRoot, file), captures: captureDir });
}

async function handle(line) {
  const [command, ...parts] = line.trim().split(/\s+/);
  if (!command) return;
  const arg = parts.join(' ');
  if (command === 'help') {
    say('Commands: inspect | screenshot NAME | start | continue | move-to TARGET | gather | dive | dive-gather-surface | surface | workshop | fit-rig balanced|skimmer|diver | rig-route skimmer|diver | fresh-beta2-route | fresh-beta3-route (final-build gate) | beta3-repeat-surface | expedition-board | journal | chart | build UPGRADE | travel home|mangrove|reef|horizon | claim | claim-all | wait SECONDS | reload | close-panel | export-save | import-save FILE | end-session | new-session | finish');
  } else if (command === 'inspect') await snapshot('inspect');
  else if (command === 'screenshot') await screenshot(arg || 'moment');
  else if (command === 'start') await startNew();
  else if (command === 'continue') await continueVoyage();
  else if (command === 'move-to') await moveTo(arg);
  else if (command === 'gather') await gather();
  else if (command === 'dive') await dive();
  else if (command === 'dive-gather-surface') await diveGatherSurface();
  else if (command === 'surface') await dive();
  else if (command === 'workshop' || command === 'journal' || command === 'chart') await openPanel(command);
  else if (command === 'fit-rig') await fitRig(arg);
  else if (command === 'rig-route') await runRigRoute(arg);
  else if (command === 'fresh-beta2-route') await runFreshBeta2Route();
  else if (command === 'fresh-beta3-route') {
    try { await runFreshBeta3Route(); }
    catch (error) { await saveEvidence(); throw error; }
  }
  else if (command === 'beta3-repeat-surface') {
    try { await runBeta3SurfaceRepeat(); }
    catch (error) { await saveEvidence(); throw error; }
  }
  else if (command === 'expedition-board') {
    await required(openPanel('journal'));
    const board = page.locator('details.expedition-board');
    if (await board.getAttribute('open') === null) await click(board.locator('summary'));
    await beta3Checkpoint('beta3-expedition-board', { text: await board.innerText() });
  }
  else if (command === 'build') await build(arg);
  else if (command === 'travel') await travel(arg);
  else if (command === 'claim') await claim();
  else if (command === 'claim-all') await claimAllReady();
  else if (command === 'wait') await waitSeconds(arg);
  else if (command === 'reload') await reloadPage();
  else if (command === 'close-panel') await closePanel();
  else if (command === 'export-save') await exportSave();
  else if (command === 'import-save') await importSave(arg);
  else if (command === 'end-session') await finishSession();
  else if (command === 'new-session') {
    if (context) throw new Error('End the current browser session first.');
    await launch();
  } else if (command === 'finish') {
    await saveEvidence();
    if (context) await context.close();
    process.exit(0);
  } else say(`Unknown command: ${command}`);
}

try {
  await launch();
  say(`Captures: ${path.relative(projectRoot, captureDir)}`);
  say('Type help for controls. Commands cause real keyboard/button input; state/metrics are read-only.');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  let commandQueue = Promise.resolve();
  rl.on('line', line => {
    commandQueue = commandQueue.then(() => handle(line)).catch(error => say({ commandError: error.message }));
  });
  rl.on('close', async () => {
    await saveEvidence().catch(() => {});
    if (context) await context.close().catch(() => {});
  });
} catch (error) {
  say({ launchError: error.message, stack: error.stack });
  process.exitCode = 1;
}
