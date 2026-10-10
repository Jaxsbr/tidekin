import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as Game from '../src/game.js';
import { createPersistence, SAVE_KEY } from '../src/persistence.js';
import { createLoadProfile } from '../src/load-profile.js';
import { createCharacterArt } from '../src/character-art.js';
import { createCleanupScene } from '../src/cleanup-scene.js';
import { createBuildCinematic } from '../src/build-cinematic.js';
import { releaseScene } from '../src/render-resources.js';

// Independent CPU lifecycle checks. Execute current adapter functions, not a
// copied startup implementation. Bounds are named declarations, never offsets
// or a particular statement inside the implementation. No DOM/GPU is created.
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const sceneSource = readFileSync(new URL('../src/scene.js', import.meta.url), 'utf8');
function declaration(source, name, next) {
  const start = source.search(new RegExp(`^(?:export )?(?:async )?function ${name}\\s*\\(`, 'm'));
  const end = next ? source.search(new RegExp(`^(?:export )?(?:async )?function ${next}\\s*\\(`, 'm')) : source.length;
  assert.ok(start >= 0 && end > start, `Cannot locate ${name} declaration bounds; update adapter if moved to a module`);
  return source.slice(start, end).replace(/^export /, '');
}
const adapterSource = [
  declaration(mainSource, 'applySettings', 'storeSettings'),
  declaration(mainSource, 'saveGame', 'savedBanner'),
  declaration(mainSource, 'startGame', 'showTutorial'),
].join('\n');
const noop = () => {};
function inertNode() {
  return { hidden: false, open: false, textContent: '', innerHTML: '', dataset: {},
    isConnected: true, firstElementChild: { textContent: '' },
    classList: { add: noop, remove: noop, toggle: noop },
    focus: noop, setAttribute: noop, append: noop, querySelector: () => null,
    showModal() { this.open = true; }, close() { this.open = false; } };
}
function faultAt(phase) {
  const error = new Error(`Injected ${phase} failure`);
  let hits = 0;
  return { error, get hits() { return hits; },
    check(at) { if (at === phase && hits === 0) { hits++; throw error; } } };
}

function startupFixture({ phase, live = false, createScene } = {}) {
  const initial = Game.createGame(); initial.inventory.wood = 42;
  let raw = Game.serializeGame(initial);
  const writes = [], errors = [], operations = [];
  const persistence = createPersistence({ storage: {
    getItem: key => key === SAVE_KEY ? raw : null,
    setItem(key, text) { assert.equal(key, SAVE_KEY); raw = text; writes.push(text); },
  } });
  const prepared = persistence.prepareVoyage({ continueSave: true });
  assert.equal(prepared.ok, true);
  // This test deliberately uses the author's real transaction API. Pending
  // preparation must not authorize a failed candidate or revoke the live one.
  assert.equal(prepared.commit(), true);
  const previousState = live ? prepared.state : null;
  if (live) {
    assert.equal(Game.act(previousState, 'enter-cleanup', { siteId: 'home-reef' }).ok, true);
    const target = Game.getCleanupSite(previousState).trash[0];
    Object.assign(previousState.cleanup.attempt, { x: target.x, y: target.y });
    Game.steerGame(previousState, .05, { interact: true, targetId: target.id });
    Game.updateGame(previousState, .05);
    assert.ok(previousState.cleanup.attempt.actionProgress > 0);
    assert.equal(persistence.saveGame(previousState).ok, true);
  }
  writes.length = 0;
  const previousRaw = raw, previousAttempt = previousState?.cleanup.attempt;
  const previousSnapshot = previousState && structuredClone(previousState);
  const fault = faultAt(phase);
  const nodes = new Map();
  const $ = id => { if (!nodes.has(id)) nodes.set(id, inertNode()); return nodes.get(id); };
  const menu = $('main-menu'), gameView = $('game-view'), canvas = $('game-canvas');
  menu.hidden = live; gameView.hidden = !live;
  const panelDialog = $('panel-dialog'), modalDialog = $('modal-dialog');
  let context, disposalCount = 0;
  const operation = at => {
    operations.push({ at, loading: context.loading,
      saveResult: vm.runInContext('saveGame()', context), writes: writes.length });
    fault.check(at);
  };
  const renderer = {
    setQuality: () => operation('setQuality'), setReducedMotion: noop,
    resize: () => operation('resize'), update: () => operation('first-render'),
    setView: noop, dispose() { disposalCount++; },
  };
  canvas.focus = () => operation('focus');
  const previousScene = live ? renderer : null;
  const profile = createLoadProfile();
  // The only intercepted dependency is the dynamic scene-module import. Every
  // other span uses the real profiler and invokes its actual operation.
  const loadProfile = { snapshot: profile.snapshot,
    run: (name, operation) => profile.run(name, name === 'scene-module'
      ? () => ({ createScene: createScene ?? (async (_canvas, options) => {
        options.onReady?.(); return renderer;
      }) }) : operation) };
  context = vm.createContext({ Game, persistence, loadProfile,
    state: previousState, scene: previousScene,
    scenePromise: live ? Promise.resolve(previousScene) : null,
    loading: false, fatalError: false, modalKind: null, activePanel: null,
    menu, gameView, canvas, panelDialog, modalDialog, $, settings: {
      quality: 'high', sound: false, reducedMotion: false, largeText: false,
    }, audioContext: null,
    document: { hidden: false, activeElement: canvas, documentElement: inertNode() },
    knownTrophies: new Set(), keepsakeTimer: null, lastCleanupStatus: null,
    lastEventKey: null, trackedTarget: 'home', rafIntervals: [], renderedFrames: 0,
    saveBannerTimer: null, lastTimestamp: null, lastHudUpdate: -Infinity,
    clearTimeout: noop, resetInput: noop, closePanel: () => panelDialog.close(),
    closeModal: () => { operation('closeModal'); context.modalKind = null; modalDialog.close(); },
    showModal: kind => { context.modalKind = kind; modalDialog.showModal(); },
    refreshHud: () => operation('refreshHud'), savedBanner: noop, showToast: noop,
    inspectSave: () => persistence.inspectSave(), confirmNewVoyage: noop,
    modalTemplate: () => '', escapeHTML: String,
    console: { error: (...args) => errors.push(args.at(-1)) },
  });
  vm.runInContext(adapterSource, context, { filename: 'main-startup-adapter.js' });
  return { context, fault, writes, errors, operations, renderer, previousScene,
    previousState, previousAttempt, previousSnapshot, previousRaw,
    get raw() { return raw; }, get disposalCount() { return disposalCount; },
    replaceStoredSave: text => { raw = text; },
    run: () => vm.runInContext('startGame(false, { confirmed: true })', context),
    saveLater: () => vm.runInContext('saveGame()', context),
  };
}

for (const phase of ['first-render', 'resize', 'setQuality', 'closeModal', 'refreshHud', 'focus']) {
  test(`startup rollback: ${phase} failure preserves the old live voyage and partial dive`, async () => {
    const f = startupFixture({ phase, live: true });
    await f.run();
    const beforeRetry = f.raw;
    const savedLater = f.saveLater(); // Actual main autosave/pagehide adapter.
    assert.equal(f.fault.hits, 1, 'Requested fault was reached');
    assert.ok(f.errors.includes(f.fault.error), 'Original injected error reached the loading handler');
    assert.strictEqual(f.context.state, f.previousState, 'Failed candidate replaced live voyage reference');
    assert.strictEqual(f.context.state.cleanup.attempt, f.previousAttempt, 'Partial dive identity lost');
    assert.deepEqual(f.context.state, f.previousSnapshot, 'Failed startup mutated previous progress');
    assert.equal(beforeRetry, f.previousRaw, 'Failure changed stored bytes');
    assert.equal(savedLater, true, 'Previous voyage lost save authorization after cancellation');
    assert.equal(f.raw, f.previousRaw, 'Later save wrote the failed candidate');
    assert.ok(f.writes.every(text => text === f.previousRaw));
    assert.strictEqual(f.context.scene, f.previousScene, 'Healthy previous scene lost');
    assert.equal(f.disposalCount, 0, 'Reused healthy scene was disposed');
    assert.equal(f.context.menu.hidden, true);
    assert.equal(f.context.gameView.hidden, false);
    assert.equal(f.context.loading, false, 'Failure left future startup inhibited');
    assert.equal(f.context.fatalError, false, 'Healthy voyage was marked fatal');
    assert.ok(f.operations.every(o => o.loading && o.saveResult === false && o.writes === 0),
      'Saving was enabled while initialization was still pending');
  });

  test(`startup quarantine: ${phase} failure disposes a new scene once and cannot autosave it`, async () => {
    const f = startupFixture({ phase });
    await f.run();
    f.saveLater(); f.saveLater();
    assert.equal(f.fault.hits, 1, 'Requested fault was reached');
    assert.ok(f.errors.includes(f.fault.error));
    assert.equal(f.raw, f.previousRaw, 'The 42-wood save was replaced');
    assert.equal(Game.deserializeGame(f.raw).inventory.wood, 42);
    assert.equal(f.writes.length, 0, 'Later autosave wrote a failed candidate');
    assert.strictEqual(f.context.state, null, 'Failed candidate was published');
    assert.strictEqual(f.context.scene, null, 'Disposed scene remains resumable');
    assert.equal(f.disposalCount, 1, 'New failed renderer must be disposed exactly once');
    assert.equal(f.context.scenePromise, null, 'Failed scene promise prevents retry');
    assert.equal(f.context.menu.hidden, false);
    assert.equal(f.context.gameView.hidden, true);
    assert.equal(f.context.loading, false);
    assert.ok(f.operations.every(o => o.loading && o.saveResult === false && o.writes === 0),
      'Saving was enabled while initialization was still pending');
  });
}

for (const live of [false, true]) {
  test(`startup success: ${live ? 'reused' : 'new'} world commits and saves only after setup`, async () => {
    const f = startupFixture({ live });
    await f.run();
    assert.equal(f.errors.length, 0);
    assert.notStrictEqual(f.context.state, f.previousState);
    assert.equal(f.context.state.inventory.wood, 0);
    assert.strictEqual(f.context.scene, f.renderer);
    assert.equal(f.context.loading, false);
    assert.equal(f.context.menu.hidden, true);
    assert.equal(f.context.gameView.hidden, false);
    assert.equal(f.disposalCount, 0);
    assert.equal(f.writes.length, 1, 'Successful candidate must save exactly once after setup');
    assert.equal(Game.deserializeGame(f.raw).inventory.wood, 0);
    assert.ok(f.operations.every(o => o.loading && o.saveResult === false && o.writes === 0),
      'Autosave escaped the pending startup guard');
    assert.equal(f.saveLater(), true, 'Committed live identity was not authorized');
  });

  test(`startup cancelled commit: late callback cancels preparation in ${live ? 'reused' : 'new'} world`, async () => {
    const f = startupFixture({ live });
    const prepare = f.context.persistence.prepareVoyage;
    let pending;
    f.context.persistence.prepareVoyage = options => { pending = prepare(options); return pending; };
    f.context.canvas.focus = () => {
      assert.equal(f.context.loading, true, 'Late UI callback escaped save inhibition');
      assert.equal(f.saveLater(), false);
      assert.equal(pending.cancel(), true);
    };
    await f.run();
    assert.equal(pending.commit(), false, 'Commit revived the cancelled transaction');
    assert.ok(f.errors.some(error => /cancelled/i.test(error.message)), 'False commit was ignored');
    assert.strictEqual(f.context.state, f.previousState);
    assert.strictEqual(f.context.scene, f.previousScene);
    if (live) {
      assert.strictEqual(f.context.state.cleanup.attempt, f.previousAttempt);
      assert.deepEqual(f.context.state, f.previousSnapshot);
    }
    assert.equal(f.disposalCount, live ? 0 : 1);
    assert.equal(f.context.menu.hidden, live);
    assert.equal(f.context.gameView.hidden, !live);
    assert.equal(f.raw, f.previousRaw);
    assert.equal(f.writes.length, 0, 'Cancelled candidate wrote a save');
    assert.equal(f.saveLater(), live, 'Cancellation lost the former save authorization');
    assert.equal(f.raw, f.previousRaw);
  });
}

test('startup quarantine: a reused renderer that also fails rollback is disposed once and cannot save', async () => {
  const f = startupFixture({ live: true }), error = new Error('Renderer remains unusable');
  let updates = 0;
  f.renderer.update = () => { updates++; throw error; };
  await f.run();
  assert.equal(updates, 2, 'Candidate render and old-state restoration must both be attempted');
  assert.ok(f.errors.includes(error));
  assert.strictEqual(f.context.state, f.previousState, 'Even quarantine must retain the old voyage');
  assert.strictEqual(f.context.state.cleanup.attempt, f.previousAttempt);
  assert.deepEqual(f.context.state, f.previousSnapshot);
  assert.equal(f.disposalCount, 1);
  assert.strictEqual(f.context.scene, null);
  assert.strictEqual(f.context.scenePromise, null);
  assert.equal(f.context.fatalError, true, 'Failed renderer remains resumable');
  assert.equal(f.saveLater(), false); assert.equal(f.saveLater(), false);
  assert.equal(f.writes.length, 0);
  assert.equal(f.raw, f.previousRaw);
});

test('startup cancellation: external changed bytes cannot become authorized for the restored old voyage', async () => {
  const f = startupFixture({ phase: 'first-render', live: true });
  const other = Game.createGame(); other.inventory.wood = 99;
  const externalRaw = Game.serializeGame(other);
  f.replaceStoredSave(externalRaw);
  await f.run();
  assert.ok(f.errors.includes(f.fault.error));
  assert.strictEqual(f.context.state, f.previousState);
  assert.strictEqual(f.context.state.cleanup.attempt, f.previousAttempt);
  assert.equal(f.saveLater(), false, 'Cancelled preparation reauthorized external bytes for old state');
  assert.equal(f.raw, externalRaw);
  assert.equal(f.writes.length, 0);
  assert.equal(f.disposalCount, 0);
});

// Construction fixture: execute the real createScene body with real Three CPU
// objects/ownership module, fake GLB sources, image/canvas adapters, and a fake
// WebGLRenderer. This proves exception-path ownership events, not GPU release.
function constructionFixture() {
  const roots = [], models = [], textures = [], counts = new Map();
  let rendererDisposals = 0;
  const watch = resource => {
    if (counts.has(resource)) return;
    counts.set(resource, 0);
    resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
  };
  const capture = () => {
    for (const root of [...roots, ...models]) root.traverse(object => {
      if (object.geometry) watch(object.geometry);
      if (object.isInstancedMesh) watch(object);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (!material) continue;
        watch(material);
        for (const value of Object.values(material)) if (value?.isTexture) watch(value);
      }
    });
    textures.forEach(watch);
  };
  class CpuScene extends THREE.Scene { constructor() { super(); roots.push(this); } }
  class CpuTexture extends THREE.CanvasTexture { constructor(canvas) { super(canvas); textures.push(this); } }
  class CpuRenderer {
    constructor() { this.shadowMap = {}; }
    setPixelRatio() {} setSize() {} render() {}
    dispose() { rendererDisposals++; }
  }
  const mesh = name => {
    const object = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    object.name = name; return object;
  };
  class CpuLoader {
    async loadAsync(path) {
      const root = new THREE.Group();
      if (path.endsWith('landmarks.glb')) {
        for (const name of ['Landmark_Arch', 'Landmark_Stacks', 'Landmark_Ridge', 'Unused_Source']) root.add(mesh(name));
      } else root.add(mesh('Model'));
      models.push(root); return { scene: root };
    }
  }
  const draw = { beginPath: noop, roundRect: noop, fill: noop, stroke: noop, drawImage: noop, fillText: noop };
  const canvas = { ...inertNode(), clientWidth: 1440, clientHeight: 900,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }) };
  const context = vm.createContext({
    ...Game, THREE: { ...THREE, Scene: CpuScene, WebGLRenderer: CpuRenderer, CanvasTexture: CpuTexture },
    createCharacterArt, createCleanupScene, createBuildCinematic, releaseScene, GLTFLoader: CpuLoader,
    URL, location: { href: 'https://tidekin.invalid/' }, devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
    performance, Image: class { async decode() {} },
    document: { createElement: () => ({ getContext: () => draw }) },
    fetch: async () => ({ ok: true, json: async () => ({ atlas: { url: 'atlas.png' },
      assets: Object.fromEntries(['resource-wood', 'resource-scrap', 'resource-pearl'].map(key => [key, { rect: [0, 0, 32, 32] }])) }) }),
  });
  // Evaluate the module's actual capability objects against the CPU Three
  // adapters. Do not replace these objects with the entire engine namespace:
  // missing factory capabilities must also fail this construction fixture.
  for (const name of ['characterThree', 'cleanupThree']) {
    const source = sceneSource.match(new RegExp(`^const ${name} = \\{[\\s\\S]*?^\\};`, 'm'))?.[0];
    assert.ok(source, `Scene capability declaration missing: ${name}`);
    vm.runInContext(source, context, { filename: 'scene-capabilities-adapter.js' });
  }
  // Vite supplies only BASE_URL in this body. Replace that build-time expression
  // with a fixed test origin while preserving all construction/cleanup code.
  vm.runInContext(declaration(sceneSource, 'createScene').replaceAll('import.meta.env.BASE_URL', "'/'"), context,
    { filename: 'scene-construction-adapter.js' });
  return { canvas, capture, counts, models, textures,
    createScene: (canvas, options) => context.createScene(canvas, options),
    get rendererDisposals() { return rendererDisposals; },
  };
}

test('construction failure: real createScene releases surface, underwater, detached templates and textures when onReady throws', async () => {
  const f = constructionFixture(), error = new Error('Injected onReady failure');
  let callbacks = 0;
  await assert.rejects(f.createScene(f.canvas, { onReady() { callbacks++; f.capture(); throw error; } }),
    actual => actual === error);
  assert.equal(callbacks, 1, 'Constructor must reach the injected late failure');
  assert.equal(f.textures.length, 6, 'Popup texture fixture did not exercise detached ownership');
  assert.equal(f.models.length, 3);
  assert.ok(f.counts.size > 100, 'Fixture did not allocate surface/underwater resources');
  assert.equal(f.rendererDisposals, 1, 'Constructor failed without releasing renderer');
  const wrong = [...f.counts].filter(([, count]) => count !== 1);
  assert.equal(wrong.length, 0, `Unreleased/double-released resources: ${wrong.map(([r,n]) => `${r.type ?? r.constructor.name}:${n}`).slice(0,12).join(', ')}`);
});

test('construction success: shutdown releases the same ownership scope once, including unused model sources', async () => {
  const f = constructionFixture();
  const scene = await f.createScene(f.canvas, { onReady: f.capture });
  assert.equal(f.rendererDisposals, 0);
  scene.dispose(); scene.dispose();
  assert.equal(f.rendererDisposals, 1);
  assert.equal([...f.counts.values()].filter(count => count !== 1).length, 0,
    'Successful shutdown leaked or double-released an attached/detached resource');
});

test('startup rollback: actual onReady callback failure leaves prior storage intact and no resumable failed scene', async () => {
  const construction = constructionFixture();
  const f = startupFixture({ createScene: async (canvas, options) => construction.createScene(canvas, {
    ...options, onReady() { construction.capture(); options.onReady(); },
  }) });
  const error = new Error('Injected loading label onReady failure');
  f.context.modalDialog.querySelector = selector => { if (selector === '.loading-text') throw error; return null; };
  await f.run();
  f.saveLater(); f.saveLater();
  assert.ok(f.errors.includes(error), 'Actual main onReady callback failure was not reached');
  assert.equal(f.raw, f.previousRaw);
  assert.equal(Game.deserializeGame(f.raw).inventory.wood, 42);
  assert.equal(f.writes.length, 0);
  assert.strictEqual(f.context.state, null);
  assert.strictEqual(f.context.scene, null);
  assert.equal(construction.rendererDisposals, 1);
  assert.equal(f.context.menu.hidden, false);
  assert.equal(f.context.gameView.hidden, true);
});
