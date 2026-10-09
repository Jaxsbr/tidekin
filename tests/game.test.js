import test from 'node:test';
import assert from 'node:assert/strict';
import { act, createGame as freshGame, updateGame, tideHeight, SALVAGE_NODES, RECIPES, ISLANDS,
  getObjectives, getContext, serializeGame, deserializeGame, steerGame,
  EXPEDITIONS, getExpeditionContext } from '../src/game.js';

// Legacy voyage regression fixtures retain the historical starting supplies.
// Public side-view Dive entries are exercised in third-domain.test.js.
function createGame() { const state=freshGame(); state.inventory={wood:4,scrap:1,pearls:0}; return state; }
function legacyDive(state) {
  if(state.diving)return {ok:false,code:'already_diving'};
  if(state.recovery>0)return {ok:false,code:'recovering'};
  if(state.oxygen<6)return {ok:false,code:'low_oxygen'};
  state.diving=true;state.stats.dives++;return {ok:true,code:'diving'};
}

// Physical first arrival through the documented steering/update seam.
function sailTo(state, target, radius = 0.1) {
  for (let frame = 0; frame < 12000; frame++) {
    const dx = target.x - state.position.x, dz = target.z - state.position.z;
    if (Math.hypot(dx, dz) <= radius) {
      return;
    }
    const angle = Math.atan2(dx, dz);
    const error = Math.atan2(Math.sin(angle-state.heading), Math.cos(angle-state.heading));
    steerGame(state, 0.02, state.diving ? {x:dx,z:dz} : {
      x: Math.max(-1,Math.min(1,-error/(1.6*.02))), z: Math.abs(error) < .1 ? -1 : 0,
    });
    updateGame(state, 0.02);
  }
  assert.fail('physical arrival took too long');
}

function expeditionGame(rig = 'balanced') {
  const state = createGame();
  state.position = { x: 4, z: 1 };
  assert.equal(act(state, 'gather', 'home-driftwood').ok, true);
  assert.equal(act(state, 'claim', 'first-salvage').ok, true);
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  assert.equal(act(state, 'rig', rig).ok, true);
  updateGame(state, 10); // Fill even the diver's larger air tank.
  state.position = { x: 0, z: 0 };
  return state;
}

function swimTrail(state) {
  const route = EXPEDITIONS.find(route => route.id === 'pearl-trail');
  sailTo(state, route.waypoints[0]);
  assert.equal(state.expeditions.active.index, 0, 'the buoy is armed by diving, not sailing');
  assert.equal(legacyDive(state).ok, true);
  updateGame(state, 0.02);
  const started = state.time;
  let meters = 0;
  while (state.diving && !state.expeditions.active.ready && state.time - started < 30) {
    const target = route.waypoints[state.expeditions.active.index];
    const dx = target.x - state.position.x, dz = target.z - state.position.z;
    const length = Math.hypot(dx, dz);
    const before = { ...state.position };
    steerGame(state, 0.02, { x: dx / length, z: dz / length });
    meters += Math.hypot(state.position.x - before.x, state.position.z - before.z);
    updateGame(state, 0.02);
  }
  return { seconds: state.time - started, meters };
}

test('every rig swims at 3.25m/s even through low-tide shoals', () => {
  for (const rig of ['balanced', 'skimmer', 'diver']) {
    const state = expeditionGame(rig);
    state.position = { x: 18, z: -4 };
    legacyDive(state);
    steerGame(state, 0.05, { x: 1, z: 0 });
    assert.ok(Math.abs(state.position.x - 18 - 0.1625) < 1e-12, rig);
  }
});

test('the pearl trail is a 55–65m continuous-breath survey with a meaningful diver air advantage', () => {
  for (const rig of ['diver', 'balanced', 'skimmer']) {
    const state = expeditionGame(rig);
    assert.equal(act(state, 'start-expedition', 'pearl-trail').ok, true);
    const swim = swimTrail(state);
    if (rig === 'diver') {
      assert.equal(state.expeditions.active.ready, true);
      assert.ok(swim.meters >= 55 && swim.meters <= 65, `${swim.meters}m`);
      assert.ok(swim.seconds > 18 && swim.seconds < 28, `${swim.seconds}s`);
      assert.equal(act(state, 'claim-expedition').code, 'surface_required');
      assert.equal(act(state, 'surface').ok, true);
      assert.equal(state.expeditions.active.ready, true);
      assert.equal(act(state, 'claim-expedition').code, 'workshop_required');
      assert.equal(act(state, 'travel', 'home').ok, true);
      const pearls = state.inventory.pearls;
      assert.equal(getExpeditionContext(state).canClaim, true);
      assert.equal(act(state, 'claim-expedition').code, 'expedition_claimed');
      assert.equal(state.inventory.pearls, pearls + 3);
    } else {
      assert.equal(state.stats.rescues, 1, rig);
      assert.equal(state.expeditions.active.index, 0);
      assert.equal(state.expeditions.active.ready, false);
      assert.match(state.lastEvent.message, /reset/i);
    }
  }
});

test('optional sailing expeditions require the wheel, ordered surface markers, and a home claim', () => {
  const state = createGame();
  assert.equal(act(state, 'start-expedition', { id: 'current-run' }).code, 'expedition_locked');
  const game = expeditionGame();
  assert.equal(getExpeditionContext(game).routes[0].available, true);
  assert.equal(act(game, 'start-expedition', { id: 'current-run' }).ok, true);
  assert.equal(act(game, 'start-expedition', { id: 'pearl-trail' }).code, 'expedition_active');
  assert.equal(act(game, 'claim-expedition').code, 'expedition_incomplete');
  const route = EXPEDITIONS.find(route => route.id === 'current-run');
  game.position = { ...route.waypoints[1] };
  updateGame(game, 0.1);
  assert.equal(game.expeditions.active.index, 0, 'later markers cannot be skipped to');
  game.position = { ...route.waypoints[0] };
  legacyDive(game); updateGame(game, 0.1);
  assert.equal(game.expeditions.active.index, 0, 'sailing markers need surface travel');
  act(game, 'surface');
  for (const point of route.waypoints) {
    game.position = { ...point };
    updateGame(game, 0.1);
  }
  assert.equal(game.expeditions.active.ready, true);
  const supplies = { ...game.inventory };
  assert.equal(act(game, 'claim-expedition').ok, true);
  assert.deepEqual(game.inventory, { wood: supplies.wood + 8, scrap: supplies.scrap + 5, pearls: supplies.pearls });
  assert.equal(game.expeditions.active, null);
  assert.equal(game.expeditions.completed['current-run'], 1);
  assert.equal(getExpeditionContext(game).total, 1);
  assert.equal(act(game, 'claim-expedition').code, 'no_expedition');
  assert.equal(act(game, 'start-expedition', 'current-run').code, 'expedition_daily_limit');
});

test('chart destinations require physical discovery and expeditions block shortcuts but permit home reset', () => {
  const state = expeditionGame();
  const before = JSON.stringify(state);
  assert.equal(act(state, 'travel', 'mangrove').code, 'undiscovered_region');
  assert.equal(JSON.stringify(state), before);
  assert.equal(getContext(state).destinations.find(d => d.id === 'mangrove').reason, 'undiscovered_region');
  sailTo(state, ISLANDS[0].position);
  assert.equal(state.discoveries.includes('mangrove'), true);
  assert.equal(act(state, 'travel', 'home').ok, true);
  assert.equal(act(state, 'travel', 'mangrove').ok, true);
  act(state, 'travel', 'home');
  act(state, 'start-expedition', 'current-run');
  sailTo(state, EXPEDITIONS[0].waypoints[0]);
  assert.equal(state.expeditions.active.index, 1);
  assert.equal(act(state, 'travel', 'mangrove').code, 'expedition_active');
  assert.equal(act(state, 'travel', 'home').code, 'expedition_reset');
  assert.equal(state.expeditions.active.index, 0);
  assert.equal(state.expeditions.active.ready, false);
  assert.equal(act(state, 'abandon-expedition').code, 'expedition_abandoned');
  assert.equal(state.expeditions.active, null);
  assert.equal(act(state, 'travel', 'mangrove').ok, true);
});

test('expeditions persist mid-route and count repeat claims by claim day with bounded lifetime tallies', () => {
  let state = expeditionGame();
  act(state, 'start-expedition', 'current-run');
  sailTo(state, EXPEDITIONS[0].waypoints[0]);
  const startedAt = state.expeditions.active.startedAt;
  state = deserializeGame(serializeGame(state));
  assert.equal(state.expeditions.active.index, 1);
  assert.equal(state.expeditions.active.startedAt, startedAt);
  for (const point of EXPEDITIONS[0].waypoints.slice(1)) sailTo(state, point);
  assert.equal(state.expeditions.active.ready, true);
  updateGame(state, 180); // Cross a day before claiming; completed surveys persist.
  const claimDay = state.day;
  state = deserializeGame(serializeGame(state));
  assert.equal(act(state, 'claim-expedition').ok, true);
  assert.equal(state.expeditions.lastCompletedDay['current-run'], claimDay);
  state = deserializeGame(serializeGame(state));
  assert.equal(act(state, 'start-expedition', 'current-run').code, 'expedition_daily_limit');
  assert.equal(act(state, 'start-expedition', 'pearl-trail').ok, true, 'daily limits are per route');
  act(state, 'abandon-expedition');
  updateGame(state, 180);
  assert.equal(act(state, 'start-expedition', 'current-run').ok, true);
  for (const point of EXPEDITIONS[0].waypoints) sailTo(state, point);
  assert.equal(act(state, 'claim-expedition').ok, true);
  assert.equal(state.expeditions.completed['current-run'], 2);
  assert.equal(getExpeditionContext(state).total, 2);
  assert.deepEqual(Object.keys(state.expeditions).sort(), ['active', 'completed', 'lastCompletedDay']);
});

test('a saved legacy underwater survey migrates aboard without banking partial progress', () => {
  const state=expeditionGame('diver');
  act(state,'start-expedition','pearl-trail');
  state.position={...EXPEDITIONS[1].waypoints[0]}; legacyDive(state);updateGame(state,.1);
  sailTo(state,EXPEDITIONS[1].waypoints[1]);
  assert.equal(state.expeditions.active.index,2);
  const before=structuredClone(state),loaded=deserializeGame(JSON.stringify(state));
  assert.deepEqual(state,before);
  assert.equal(loaded.diving,false);assert.equal(loaded.expeditions.active.index,0);
  assert.equal(loaded.expeditions.active.ready,false);
  for(const key of ['inventory','upgrades','collected','stats','oxygen','position'])assert.deepEqual(loaded[key],state[key]);
  state.expeditions.active.index=4;state.expeditions.active.ready=true;
  const complete=deserializeGame(JSON.stringify(state));assert.equal(complete.expeditions.active.ready,true);
});

test('old v2 saves retain earned chart discoveries and default only the missing expedition field', () => {
  const state = expeditionGame();
  sailTo(state, ISLANDS[0].position);
  act(state, 'travel', 'home');
  delete state.expeditions;
  const loaded = deserializeGame(JSON.stringify(state));
  assert.equal(loaded.expeditions.active, null);
  assert.equal(getExpeditionContext(loaded).total, 0);
  assert.equal(act(loaded, 'travel', 'mangrove').ok, true);
  assert.equal(loaded.discoveries.includes('mangrove'), true);
});

test('expedition saves reject malformed counters, extra fields, future claims, and impossible active stages', () => {
  const source = expeditionGame();
  act(source, 'start-expedition', 'current-run');
  const corruptions = [
    s => { s.expeditions = null; },
    s => { s.expeditions = {}; },
    s => { s.expeditions.history = []; },
    s => { s.expeditions.completed.extra = 0; },
    s => { delete s.expeditions.completed['pearl-trail']; },
    s => { s.expeditions.completed['current-run'] = -1; },
    s => { s.expeditions.completed['current-run'] = 0.5; },
    s => { s.expeditions.completed['current-run'] = '1'; },
    s => { s.expeditions.completed['current-run'] = 1; },
    s => { s.expeditions.lastCompletedDay['current-run'] = 1; },
    s => { s.expeditions.lastCompletedDay['current-run'] = 999; },
    s => { s.expeditions.active.id = '__proto__'; },
    s => { s.expeditions.active.index = -1; },
    s => { s.expeditions.active.index = 0.5; },
    s => { s.expeditions.active.index = 5; },
    s => { s.expeditions.active.index = 4; },
    s => { s.expeditions.active.ready = true; },
    s => { s.expeditions.active.ready = 'false'; },
    s => { s.expeditions.active.startedAt = s.time + 1; },
    s => { s.expeditions.active.startedAt = -1; },
    s => { s.expeditions.active.startedAt = null; },
    s => { s.expeditions.active.index = 1; }, // No time has elapsed since start.
    s => { s.expeditions.active.extra = true; },
    s => { s.upgrades.waterwheel = false; },
    s => {
      s.expeditions.active = { id: 'pearl-trail', index: 2, ready: false, startedAt: 0 };
      s.stats.dives = 1; // Partial dive routes cannot be surfaced in a save.
    },
    s => {
      s.expeditions.completed['current-run'] = 1;
      s.expeditions.lastCompletedDay['current-run'] = 1; // Active route started on an already claimed day.
    },
    s => {
      s.expeditions.active = null;
      s.expeditions.completed['pearl-trail'] = 1;
      s.expeditions.lastCompletedDay['pearl-trail'] = 1; // No logged dive to support this completion.
    },
  ];
  for (const corrupt of corruptions) {
    const state = structuredClone(source);
    corrupt(state);
    assert.throws(() => deserializeGame(JSON.stringify(state)), { code: 'INVALID_SAVE' }, corrupt.toString());
    assert.throws(() => serializeGame(state), { code: 'INVALID_SAVE' }, corrupt.toString());
  }
  assert.deepEqual(deserializeGame(serializeGame(source)), source, 'validation leaves the source untouched');
});

test('expedition actions reject remote starts, duplicate claims, and mismatched reward ids atomically', () => {
  const state = expeditionGame();
  const reject = (action, payload, code) => {
    const snapshot = JSON.stringify(state);
    assert.equal(act(state, action, payload).code, code);
    assert.equal(JSON.stringify(state), snapshot);
  };
  reject('start-expedition', 'missing', 'unknown_expedition');
  state.position = { x: 7.01, z: 0 };
  reject('start-expedition', 'current-run', 'workshop_required');
  state.position = { x: 7, z: 0 };
  legacyDive(state);
  reject('start-expedition', 'current-run', 'surface_required');
  act(state, 'surface');
  assert.equal(act(state, 'start-expedition', 'current-run').ok, true);
  for (const point of EXPEDITIONS[0].waypoints) { state.position = { ...point }; updateGame(state, 0.1); }
  reject('claim-expedition', { id: 'pearl-trail' }, 'unknown_expedition');
  assert.equal(act(state, 'claim-expedition', { id: 'current-run' }).ok, true);
  reject('claim-expedition', {}, 'no_expedition');
  reject('abandon-expedition', {}, 'no_expedition');
});

test('waypoints advance only in positive updates and a rescue at the last survey marker cannot award completion', () => {
  const state = expeditionGame('diver');
  act(state, 'start-expedition', 'pearl-trail');
  state.position = { ...EXPEDITIONS[1].waypoints[0] };
  legacyDive(state);
  getExpeditionContext(state);
  updateGame(state, 0);
  assert.equal(state.expeditions.active.index, 0);
  updateGame(state, 0.1);
  assert.equal(state.expeditions.active.index, 1);
  for (const point of EXPEDITIONS[1].waypoints.slice(1, -1)) {
    state.position = { ...point }; updateGame(state, 0.1);
  }
  state.position = { ...EXPEDITIONS[1].waypoints.at(-1) };
  const collected = [...state.collected], supplies = { ...state.inventory };
  updateGame(state, state.oxygen);
  assert.equal(state.expeditions.active.index, 0);
  assert.equal(state.expeditions.active.ready, false);
  assert.equal(state.lastEvent.code, 'expedition_reset');
  assert.deepEqual(state.collected, collected);
  assert.deepEqual(state.inventory, supplies);
  updateGame(state, 10);
  assert.equal(act(state, 'abandon-expedition').ok, true);
  assert.equal(act(state, 'start-expedition', 'pearl-trail').ok, true, 'failure does not spend the daily completion');
});

test('the continuous tide returns every 180 seconds and days survive large deltas', () => {
  const state = createGame();
  assert.equal(tideHeight(state), 0);
  assert.strictEqual(updateGame(state, 45), state);
  assert.ok(Math.abs(tideHeight(state) - 0.5) < 1e-12);
  updateGame(state, 45);
  assert.equal(tideHeight(state), 1);
  updateGame(state, 90);
  assert.equal(tideHeight(state), 0);
  assert.equal(state.day, 2);
  updateGame(state, 540.25);
  assert.equal(state.time, 720.25);
  assert.equal(state.day, 5);
});

test('starter salvage has a real location and can only be picked up once', () => {
  const state = createGame();
  const node = SALVAGE_NODES.find(node => node.id === 'home-driftwood');
  state.position = { ...node.position };
  const before = state.inventory.wood;
  assert.equal(act(state, 'gather', { nodeId: node.id }).ok, true);
  assert.equal(state.inventory.wood, before + 4);
  assert.equal(state.stats.gathered.wood, 4);
  const snapshot = JSON.stringify(state);
  assert.equal(act(state, 'gather', { nodeId: node.id }).code, 'already_collected');
  assert.equal(JSON.stringify(state), snapshot);
});

test('diving lasts 18 seconds, rescues safely, and allows another dive after recovery', () => {
  const state = createGame();
  state.position = { x: 6, z: -9 };
  assert.equal(act(state, 'gather', 'home-pearls').code, 'dive_required');
  assert.equal(legacyDive(state).ok, true);
  assert.equal(act(state, 'gather', 'home-pearls').ok, true);
  updateGame(state, 17.5);
  assert.equal(state.oxygen, 0.5);
  assert.equal(state.diving, true);
  updateGame(state, 0.5);
  assert.equal(state.diving, false);
  assert.deepEqual(state.position, { x: 0, z: 0 });
  assert.equal(state.oxygen, 0);
  assert.equal(state.recovery, 6);
  assert.equal(state.inventory.pearls, 2);
  assert.equal(state.stats.rescues, 1);
  assert.equal(legacyDive(state).code, 'recovering');
  updateGame(state, 6);
  assert.equal(state.oxygen, 18);
  assert.equal(state.recovery, 0);
  assert.equal(legacyDive(state).ok, true);
});

test('the workshop charges exact costs, enforces its chain, and gates three destinations', () => {
  const state = createGame();
  state.inventory = { wood: 100, scrap: 100, pearls: 100 };
  assert.equal(act(state, 'build', 'crane').code, 'prerequisite');
  assert.equal(act(state, 'travel', 'mangrove').code, 'locked_region');
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  assert.deepEqual(state.inventory, { wood: 94, scrap: 98, pearls: 100 });
  assert.equal(act(state, 'build', 'waterwheel').code, 'already_built');
  sailTo(state, ISLANDS[0].position);
  assert.equal(act(state, 'travel', 'mangrove').ok, true);
  assert.equal(state.region, 'mangrove');
  assert.deepEqual(state.position, ISLANDS[0].position);
  assert.equal(act(state, 'build', 'crane').code, 'built');
  assert.equal(act(state, 'travel', 'home').ok, true);
  for (const upgrade of ['greenhouse', 'sail', 'beacon']) {
    assert.equal(act(state, 'build', upgrade).ok, true, upgrade);
  }
  for (const island of ISLANDS) {
    sailTo(state, island.position);
    assert.equal(act(state, 'travel', island.id).ok, true, island.id);
  }
  assert.deepEqual(state.discoveries, ['home', 'mangrove', 'reef', 'horizon']);
  assert.equal(Object.keys(RECIPES).length, 5);
});

test('tide energy powers crane and greenhouse on their exact cadences, independent of frame size', () => {
  const makeWorkshop = () => {
    const state = createGame();
    state.inventory = { wood: 100, scrap: 100, pearls: 100 };
    for (const id of ['waterwheel', 'crane', 'greenhouse']) assert.equal(act(state, 'build', id).ok, true);
    return state;
  };
  const state = makeWorkshop();
  updateGame(state, 11.999);
  assert.deepEqual(state.stats.automated, { wood: 0, scrap: 0, pearls: 0 });
  updateGame(state, 0.001);
  assert.deepEqual(state.stats.automated, { wood: 2, scrap: 1, pearls: 0 });
  updateGame(state, 12);
  assert.deepEqual(state.inventory, { wood: 85, scrap: 91, pearls: 98 });
  assert.deepEqual(state.stats.automated, { wood: 7, scrap: 2, pearls: 0 });
  const frames = makeWorkshop();
  for (let i = 0; i < 480; i++) updateGame(frames, 0.05);
  assert.deepEqual(state.inventory, frames.inventory);
  assert.ok(Math.abs(state.energy - frames.energy) < 1e-8);
  assert.ok(state.energy >= 0 && state.energy <= 100);
});

test('sailing into an unlocked island discovers it without chart travel, and returning home enables building', () => {
  const state = createGame();
  state.position = { ...ISLANDS[0].position };
  updateGame(state, 1);
  assert.equal(state.region, 'home');
  assert.equal(act(state, 'gather', 'mangrove-timber').code, 'locked_region');
  state.position = { x: 0, z: 0 };
  state.inventory = { wood: 6, scrap: 2, pearls: 0 };
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  state.position = { ...ISLANDS[0].position };
  updateGame(state, 0.1);
  assert.equal(state.region, 'mangrove');
  assert.deepEqual(state.discoveries, ['home', 'mangrove']);
  state.position = { x: 38, z: 3 };
  assert.equal(act(state, 'gather', 'mangrove-timber').ok, true);
  state.position = { x: 0, z: 0 };
  updateGame(state, 0.1);
  assert.equal(state.region, 'home');
});

test('objectives track lifetime progress and grant each reward only once even after spending resources', () => {
  const state = createGame();
  assert.equal(act(state, 'claim', 'first-salvage').code, 'objective_incomplete');
  state.position = { x: 4, z: 1 };
  act(state, 'gather', 'home-driftwood');
  const goal = getObjectives(state).find(goal => goal.id === 'first-salvage');
  assert.equal(goal.complete, true);
  assert.equal(goal.progress, 4);
  assert.deepEqual(goal.reward, { wood: 2, scrap: 1 });
  assert.equal(act(state, 'claim', { id: goal.id }).ok, true);
  assert.deepEqual(state.inventory, { wood: 10, scrap: 2, pearls: 0 });
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  assert.equal(getObjectives(state).find(goal => goal.id === 'first-salvage').complete, true);
  const snapshot = JSON.stringify(state);
  assert.equal(act(state, 'claim', goal.id).code, 'already_claimed');
  assert.equal(JSON.stringify(state), snapshot);
  const context = getContext(state);
  assert.equal(context.atWorkshop, true);
  assert.equal(context.destinations.find(region => region.id === 'mangrove').unlocked, true);
});

test('save round trips preserve pickups, rewards, upgrades, partial automation, and safely surface an old active dive', () => {
  const state = createGame();
  state.position = { x: 4, z: 1 };
  act(state, 'gather', 'home-driftwood');
  act(state, 'claim', 'first-salvage');
  act(state, 'build', 'waterwheel');
  act(state, 'claim', 'tide-power');
  state.position = { x: -4, z: 1 };
  act(state, 'gather', 'home-crate');
  act(state, 'build', 'crane');
  updateGame(state, 7.25);
  legacyDive(state);
  updateGame(state, 2.5);
  const loaded = deserializeGame(serializeGame(state));
  assert.deepEqual(loaded, {...state,diving:false});
  assert.notStrictEqual(loaded.inventory, state.inventory);
  assert.equal(act(loaded, 'claim', 'first-salvage').code, 'already_claimed');
  loaded.position = { x: 4, z: 1 };
  assert.equal(act(loaded, 'gather', 'home-driftwood').code, 'already_collected');
  updateGame(loaded, 30);
  state.position={...loaded.position};state.diving=false;updateGame(state, 30);
  assert.deepEqual(loaded, state);
});

test('corrupt saves are rejected atomically, including impossible progress and non-finite values', () => {
  const corruptions = [
    state => { state.version = 99; },
    state => { state.inventory.wood = -1; },
    state => { state.inventory.scrap = 1.5; },
    state => { state.inventory.pearls = 1e100; },
    state => { state.oxygen = 19; },
    state => { state.diving = 'true'; },
    state => { state.diving = true; state.oxygen = 0; },
    state => { state.recovery = 7; },
    state => { state.energy = 101; },
    state => { state.time = -1; },
    state => { state.day = 5; },
    state => { state.position.x = null; },
    state => { state.position.z = 1e100; },
    state => { state.speed = 0; },
    state => { state.upgrades.beacon = true; },
    state => { state.upgrades.crane = 1; },
    state => { state.region = 'reef'; },
    state => { state.discoveries.push('horizon'); },
    state => { state.discoveries.push('home'); },
    state => { state.collected = ['fake-node']; },
    state => { state.collected = ['home-driftwood', 'home-driftwood']; },
    state => { state.collected = ['home-driftwood']; },
    state => { state.stats.gathered.wood = 4; },
    state => { state.stats.rescues = 2; },
    state => { state.quest.claimed = ['first-salvage']; },
    state => { state.quest.claimed = ['made-up']; },
    state => { state.automation.crane = 12; },
    state => { state.automation.greenhouse = 3; },
    state => { state.lastEvent = { code: 'gathered', message: 'old', at: 20 }; },
    state => { delete state.inventory; },
  ];
  for (const corrupt of corruptions) {
    const state = createGame();
    corrupt(state);
    assert.throws(() => deserializeGame(JSON.stringify(state)), { code: 'INVALID_SAVE' }, corrupt.toString());
  }
  for (const text of ['{', 'null', '[]', '{}', '42', '"hi"', '', null, 7]) {
    assert.throws(() => deserializeGame(text), { code: 'INVALID_SAVE' });
  }
  const state = createGame();
  state.inventory.wood = NaN;
  assert.throws(() => serializeGame(state), { code: 'INVALID_SAVE' });
});

test('v1 and unversioned saves migrate missing fields while retaining earned progress', () => {
  const legacy = {
    version: 1, time: 181.5, day: 1, position: { x: 0, z: 0 },
    inventory: { wood: 2, scrap: 3 }, upgrades: ['waterwheel'],
    discoveries: ['home', 'mangrove'], collected: ['home-driftwood'],
    quest: { claimed: ['first-salvage'] },
  };
  const migrated = deserializeGame(JSON.stringify(legacy));
  assert.equal(migrated.version, 2);
  assert.equal(migrated.day, 2);
  assert.deepEqual(migrated.inventory, { wood: 2, scrap: 3, pearls: 0 });
  assert.equal(migrated.upgrades.waterwheel, true);
  assert.equal(migrated.stats.gathered.wood, 4);
  assert.equal(migrated.oxygen, 18);
  assert.deepEqual(migrated.automation, { crane: 0, greenhouse: 0 });
  assert.equal(getObjectives(migrated).find(goal => goal.id === 'first-salvage').claimed, true);
  assert.deepEqual(deserializeGame(serializeGame(migrated)), migrated);
  delete legacy.version;
  assert.deepEqual(deserializeGame(JSON.stringify(legacy)), migrated);
  legacy.inventory.wood = -3;
  assert.throws(() => deserializeGame(JSON.stringify(legacy)), { code: 'INVALID_SAVE' });
});

test('a new player can build the full chain and visit all destinations within five minutes using earned supplies', () => {
  const state = createGame();
  const perform = (action, payload) => {
    const response = action === 'dive' ? legacyDive(state) : act(state, action, payload);
    assert.equal(response.ok, true, `${action} ${String(payload)}: ${response.code}`);
  };
  const steerTo = position => {
    sailTo(state, position);
  };
  const pickup = id => {
    steerTo(SALVAGE_NODES.find(node => node.id === id).position);
    perform('gather', id);
  };
  const claimEarned = () => {
    for (const goal of getObjectives(state)) if (goal.claimable) perform('claim', goal.id);
  };
  const construct = id => {
    steerTo({ x: 0, z: 0 });
    perform('build', id);
    claimEarned();
  };
  pickup('home-driftwood');
  claimEarned();
  pickup('home-crate');
  construct('waterwheel');
  assert.ok(state.time < 60, 'starter waterwheel is possible within a minute');
  construct('crane');
  perform('dive');
  pickup('home-pearls');
  perform('surface');
  claimEarned();
  steerTo({ x: 0, z: 0 });
  updateGame(state, 12);
  construct('greenhouse');
  // Sailing physically into the first destination earns its exploration reward.
  steerTo(ISLANDS[0].position);
  claimEarned();
  pickup('mangrove-timber');
  perform('travel', 'home');
  updateGame(state, 24);
  construct('sail');
  for (const region of ['reef', 'horizon']) {
    steerTo(ISLANDS.find(island => island.id === region).position);
    perform('travel', region);
    if (region === 'reef') { perform('dive'); pickup('reef-pearls'); perform('surface'); }
    claimEarned();
  }
  perform('travel', 'home');
  updateGame(state, 24);
  construct('beacon');
  assert.ok(state.time < 300, `completed in ${state.time}s`);
  assert.equal(getObjectives(state).every(goal => goal.claimed), true);
  assert.deepEqual(deserializeGame(serializeGame(state)), state.diving ? {...state,diving:false} : state);
});

test('invalid and zero time deltas never mutate state; a week of catch-up retains the full elapsed time', () => {
  const state = createGame();
  legacyDive(state);
  const snapshot = JSON.stringify(state);
  for (const dt of [-1, NaN, Infinity, -Infinity, '1', null, undefined, 604801]) {
    assert.throws(() => updateGame(state, dt), RangeError);
    assert.equal(JSON.stringify(state), snapshot);
  }
  assert.strictEqual(updateGame(state, 0), state);
  assert.equal(JSON.stringify(state), snapshot);
  updateGame(state, 604800);
  assert.equal(state.time, 604800);
  assert.equal(state.day, 3361);
  assert.equal(state.stats.rescues, 1);
  assert.equal(state.oxygen, 18);
  assert.equal(state.recovery, 0);
  assert.equal(legacyDive(state).ok, true);
});

test('one hour of automation and rescue matches one-second frames even when the energy store fills', () => {
  const prepare = () => {
    const state = createGame();
    state.inventory = { wood: 100, scrap: 100, pearls: 100 };
    for (const id of ['waterwheel', 'crane', 'greenhouse']) act(state, 'build', id);
    legacyDive(state);
    return state;
  };
  const large = prepare();
  const frames = prepare();
  updateGame(large, 3600);
  for (let i = 0; i < 3600; i++) updateGame(frames, 1);
  assert.deepEqual(large.stats.automated, { wood: 1050, scrap: 300, pearls: 0 });
  assert.deepEqual(large.inventory, frames.inventory);
  assert.deepEqual(large.stats, frames.stats);
  assert.deepEqual(large.automation, frames.automation);
  assert.equal(large.oxygen, 18);
  assert.equal(large.recovery, 0);
  assert.equal(large.day, 21);
  assert.ok(Math.abs(large.energy - frames.energy) < 1e-8);
  assert.ok(large.energy >= 0 && large.energy <= 100);
});

test('gather validates actual player proximity, target identity, and the inclusive raft-footprint range', () => {
  const state = createGame();
  const snapshot = JSON.stringify(state);
  for (const payload of [
    { nodeId: 'not-a-node' },
    { nodeId: 'home-driftwood', type: 'pearls' },
    { type: 'wood', position: { x: 0, z: 0 } },
    { type: 'energy' },
    { type: 'wood', position: { x: NaN, z: 1 } },
    null, [], 8,
  ]) {
    assert.equal(act(state, 'gather', payload).ok, false);
    assert.equal(JSON.stringify(state), snapshot);
  }
  state.position = { x: 8.5001, z: 1 };
  assert.equal(act(state, 'gather', 'home-driftwood').code, 'too_far');
  state.position = { x: 8.5, z: 1 };
  assert.equal(act(state, 'gather', { type: 'wood', position: { x: 4, z: 1 } }).ok, true);
  assert.equal(state.inventory.wood, 8);
  assert.equal(state.collected.length, 1);
});

test('low tide exposes tidal salvage, high tide needs a dive, and shore supplies stay accessible', () => {
  const state = createGame();
  updateGame(state, 90);
  state.position = { x: 4, z: 1 };
  assert.equal(act(state, 'gather', 'home-driftwood').ok, true);
  state.position = { x: -7, z: -5 };
  assert.equal(act(state, 'gather', 'home-wreck').code, 'high_tide');
  assert.equal(legacyDive(state).ok, true);
  assert.equal(act(state, 'gather', 'home-wreck').ok, true);
  act(state, 'surface');
  state.position = { x: 6, z: 6 };
  assert.equal(act(state, 'gather', 'home-timber').code, 'high_tide');
  updateGame(state, 90);
  assert.equal(act(state, 'gather', 'home-timber').ok, true);
  assert.equal(state.inventory.wood, 13);
  assert.equal(state.inventory.scrap, 5);
});

test('building checks affordability and works aboard the raft away from home', () => {
  const state = createGame();
  let snapshot = JSON.stringify(state);
  assert.equal(act(state, 'build', 'waterwheel').code, 'unaffordable');
  assert.equal(JSON.stringify(state), snapshot);
  state.inventory = { wood: 6, scrap: 2, pearls: 0 };
  state.position = { x: 7.001, z: 0 };
  snapshot = JSON.stringify(state);
  assert.equal(getContext(state).recipes.find(r=>r.id==='waterwheel').available,true);
  assert.equal(JSON.stringify(state), snapshot);
  state.position = { x: 7, z: 0 };
  legacyDive(state);
  snapshot = JSON.stringify(state);
  assert.equal(act(state, 'build', 'waterwheel').code, 'surface_required');
  assert.equal(act(state, 'travel', 'home').code, 'surface_required');
  assert.equal(JSON.stringify(state), snapshot);
  act(state, 'surface');
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  assert.deepEqual(state.inventory, { wood: 0, scrap: 0, pearls: 0 });
});

test('surfacing voluntarily recovers oxygen and another dive requires at least six seconds of breath', () => {
  const state = createGame();
  legacyDive(state);
  assert.equal(legacyDive(state).code, 'already_diving');
  updateGame(state, 17);
  assert.equal(act(state, 'surface').ok, true);
  assert.equal(state.oxygen, 1);
  assert.equal(state.stats.rescues, 0);
  assert.equal(legacyDive(state).code, 'low_oxygen');
  updateGame(state, 1);
  assert.equal(state.oxygen, 4);
  assert.equal(legacyDive(state).code, 'low_oxygen');
  updateGame(state, 2 / 3);
  assert.equal(state.oxygen, 6);
  assert.equal(legacyDive(state).ok, true);
});

test('save loading drops extra fields and cannot pollute object prototypes', () => {
  const state = createGame();
  const raw = JSON.parse(serializeGame(state));
  raw.ui = { selected: 'beacon' };
  raw.inventory.hacked = 999;
  raw.upgrades.turbo = true;
  raw['__proto__'] = { tidekinPolluted: true };
  const loaded = deserializeGame(JSON.stringify(raw));
  assert.deepEqual(loaded, state);
  assert.equal(Object.prototype.tidekinPolluted, undefined);
  const prior = serializeGame(state);
  assert.throws(() => deserializeGame('{"version":2}'), { code: 'INVALID_SAVE' });
  assert.equal(serializeGame(state), prior);
});

test('the workshop context and build action agree when the renderer steers home before the next update', () => {
  const state = createGame();
  state.inventory = { wood: 100, scrap: 100, pearls: 100 };
  act(state, 'build', 'waterwheel');
  sailTo(state, ISLANDS[0].position);
  act(state, 'travel', 'mangrove');
  state.position = { x: 0, z: 0 };
  const context = getContext(state);
  assert.equal(context.atWorkshop, true);
  assert.equal(context.recipes.find(recipe => recipe.id === 'crane').available, true);
  assert.equal(act(state, 'build', 'crane').ok, true);
  assert.equal(state.region, 'home');
});

test('world salvage supplies all required pearls and the full upgrade chain even without claiming quests', () => {
  const state = createGame();
  const perform = (action, payload) => {
    const response = action === 'dive' ? legacyDive(state) : act(state, action, payload);
    assert.equal(response.ok, true, `${action} ${String(payload)}: ${response.code}`);
  };
  const harvest = region => {
    if (region !== 'home') sailTo(state, ISLANDS.find(island => island.id === region).position);
    perform('travel', region);
    for (const node of SALVAGE_NODES.filter(node => node.region === region)) {
      if (node.access !== 'shore' && !state.diving) perform('dive');
      state.position = { ...node.position };
      updateGame(state, 1);
      perform('gather', node.id);
    }
    if (state.diving) perform('surface');
    updateGame(state, 6);
    perform('travel', 'home');
  };
  harvest('home');
  perform('build', 'waterwheel');
  harvest('mangrove');
  perform('build', 'crane');
  perform('build', 'greenhouse');
  harvest('reef');
  perform('build', 'sail');
  harvest('horizon');
  updateGame(state, 24);
  perform('build', 'beacon');
  assert.equal(state.stats.gathered.pearls, 19);
  assert.equal(state.inventory.pearls, 10);
  assert.equal(state.collected.length, 17);
  assert.deepEqual(state.quest.claimed, []);
  assert.deepEqual(deserializeGame(serializeGame(state)), state.diving ? {...state,diving:false} : state);
});

test('expedition rigs create reversible speed/air trade-offs, gated by workshop and wheel', () => {
  const state = createGame();
  assert.equal(act(state, 'rig', 'diver').code, 'rig_locked');
  state.position = {x:4,z:1}; act(state,'gather','home-driftwood'); act(state,'claim','first-salvage');
  act(state,'build','waterwheel');
  const supplies = {...state.inventory};
  assert.equal(act(state,'rig','diver').ok,true);
  assert.equal(state.speed,3.5);
  updateGame(state,4);
  assert.equal(state.oxygen,28);
  const loaded=deserializeGame(serializeGame(state));
  assert.equal(loaded.rig,'diver');
  assert.equal(loaded.oxygen,28);
  legacyDive(state);
  assert.equal(act(state,'rig','skimmer').code,'workshop_required');
  updateGame(state,20);assert.equal(state.diving,true);assert.equal(state.oxygen,8);
  act(state,'surface');updateGame(state,10);
  assert.equal(act(state,'rig','skimmer').ok,true);
  assert.equal(state.oxygen,12);assert.equal(state.speed,7);
  assert.deepEqual(state.inventory,supplies);
  sailTo(state, ISLANDS[0].position);act(state,'travel','mangrove');assert.equal(act(state,'rig','balanced').code,'workshop_required');
  act(state,'travel','home');assert.equal(act(state,'rig','balanced').ok,true);
  assert.equal(state.speed,5);
});

test('rig save validation accepts old v2 defaults and rejects mismatched or unearned rigs', () => {
  const state=createGame();delete state.rig;
  assert.equal(deserializeGame(JSON.stringify(state)).rig,'balanced');
  state.rig='diver';state.speed=3.5;
  assert.throws(()=>deserializeGame(JSON.stringify(state)),{code:'INVALID_SAVE'});
  state.rig='balanced';state.speed=7;
  assert.throws(()=>deserializeGame(JSON.stringify(state)),{code:'INVALID_SAVE'});
  state.rig='__proto__';
  assert.throws(()=>deserializeGame(JSON.stringify(state)),{code:'INVALID_SAVE'});
});

test('the tide forecast counts down to the actual salvage threshold', () => {
  const state=createGame();
  const low=getContext(state).tide;
  assert.equal(low.window,'closes');
  updateGame(state,low.windowSeconds+.01);
  assert.equal(getContext(state).lowTide,false);
  const high=getContext(state).tide;
  assert.equal(high.window,'opens');
  updateGame(state,high.windowSeconds+.01);
  assert.equal(getContext(state).lowTide,true);
  assert.ok(getContext(state).tide.windowSeconds>70);
});

test('home pearl supplies and home-earned quest rewards cannot fund the whole upgrade chain', () => {
  const state=createGame();
  const homePearls=SALVAGE_NODES.filter(n=>n.region==='home'&&n.type==='pearls').reduce((sum,n)=>sum+n.amount,0);
  const localRewards=getObjectives(state).filter(q=>!['mangrove-visit','charted-waters','guiding-light'].includes(q.id)).reduce((sum,q)=>sum+(q.reward.pearls||0),0);
  const required=Object.values(RECIPES).reduce((sum,r)=>sum+r.cost.pearls,0);
  assert.equal(required-(homePearls+localRewards),4);
});

test('continuous steering is always available, turns bow +Z, keeps legacy swimming, and bounds motion', () => {
  const state=createGame();
  steerGame(state,.05,{x:0,z:-1});assert.equal(state.position.z,.25);
  steerGame(state,.05,{x:1,z:0});assert.ok(Math.abs(state.heading-(2*Math.PI-.08))<1e-12);
  state.heading=Math.PI/2;state.position={x:0,z:0};
  steerGame(state,.05,{x:0,z:-1});assert.equal(state.position.x,.25);
  steerGame(state,.05,{x:0,z:1});assert.ok(Math.abs(state.position.x)<1e-12);
  state.position={x:0,z:0};legacyDive(state);
  steerGame(state,.05,{x:1,z:0});assert.equal(state.position.x,.1625);
  state.position={x:149.99,z:-149.99};
  steerGame(state,.05,{x:1,z:-1});assert.deepEqual(state.position,{x:150,z:-150});
  const before=JSON.stringify(state);
  steerGame(state,0,{x:1,z:1});steerGame(state,.05,{x:NaN,z:Infinity});
  assert.equal(JSON.stringify(state),before);
  assert.throws(()=>steerGame(state,-1,{x:1,z:0}),RangeError);
  assert.throws(()=>steerGame(state,1,{x:1,z:0}),RangeError);
});

test('D turns screen-right toward negative X from bow +Z; A reverses that turn', () => {
  const state=createGame();
  steerGame(state,.05,{x:0,z:-1});
  assert.deepEqual(state.position,{x:0,z:.25});
  const turnSeconds=(Math.PI/2)/1.6;
  const frames=Math.ceil(turnSeconds/.05);
  for(let i=0;i<frames;i++)steerGame(state,turnSeconds/frames,{x:1,z:0});
  assert.deepEqual(state.position,{x:0,z:.25},'turning alone does not translate');
  steerGame(state,.05,{x:0,z:-1});
  assert.ok(Math.abs(state.position.x+.25)<1e-12,'D quarter-turn makes forward travel negative X');
  assert.ok(Math.abs(state.position.z-.25)<1e-12);
  for(let i=0;i<frames;i++)steerGame(state,turnSeconds/frames,{x:-1,z:0});
  const before={...state.position};
  steerGame(state,.05,{x:0,z:-1});
  assert.ok(Math.abs(state.position.x-before.x)<1e-12);
  assert.ok(Math.abs(state.position.z-before.z-.25)<1e-12,'A restores forward travel along +Z');
});

test('save validation rejects an exhausted starter with no recovery path', () => {
  const raw=createGame();
  const home=SALVAGE_NODES.filter(n=>n.region==='home');
  raw.collected=home.map(n=>n.id);
  for(const n of home)raw.stats.gathered[n.type]+=n.amount;
  raw.stats.dives=1;raw.quest.claimed=['first-salvage','first-pearls'];
  raw.inventory={wood:0,scrap:0,pearls:0};
  assert.throws(()=>deserializeGame(JSON.stringify(raw)),{code:'INVALID_SAVE'});
  raw.inventory={wood:6,scrap:2,pearls:0};
  const loaded=deserializeGame(JSON.stringify(raw));
  assert.equal(act(loaded,'build','waterwheel').ok,true);
});

test('low-tide shoals create a slower route while high tide opens it without trapping the raft', () => {
  const state=createGame();state.heading=Math.PI/2;state.position={x:18,z:-4};
  assert.equal(getContext(state).inShallows,true);
  steerGame(state,.05,{x:0,z:-1});assert.ok(Math.abs(state.position.x-18-.08)<1e-12);
  state.position={x:18,z:-4};updateGame(state,90);
  assert.equal(getContext(state).inShallows,false);
  steerGame(state,.05,{x:0,z:-1});assert.equal(state.position.x,18.25);
  state.time=0;state.day=1;state.position={x:18,z:-4};
  for(let i=0;i<200;i++)steerGame(state,.05,{x:0,z:-1});
  assert.ok(state.position.x>21 && state.position.x<25,'shoal exits into the sheltered departure current');
});

test('save obtainability recognizes repeat expeditions after the wheel without inventing automated pearls', () => {
  const raw=createGame();raw.upgrades.waterwheel=true;raw.discoveries=['home','mangrove'];
  raw.collected=SALVAGE_NODES.filter(n=>raw.discoveries.includes(n.region)).map(n=>n.id);
  for(const n of SALVAGE_NODES.filter(n=>raw.collected.includes(n.id)))raw.stats.gathered[n.type]+=n.amount;
  raw.stats.dives=1;raw.quest.claimed=['first-salvage','first-pearls','tide-power','mangrove-visit'];
  raw.inventory={wood:0,scrap:0,pearls:0};
  assert.equal(deserializeGame(JSON.stringify(raw)).upgrades.waterwheel,true);
  raw.inventory={wood:8,scrap:5,pearls:2};
  const recovered=deserializeGame(JSON.stringify(raw));assert.equal(act(recovered,'build','crane').ok,true);
  raw.upgrades.crane=true;raw.quest.claimed.push('salvage-workshop');raw.inventory={wood:0,scrap:0,pearls:0};
  const repeatable=deserializeGame(JSON.stringify(raw));
  assert.equal(repeatable.stats.automated.pearls,0);
  assert.equal(getExpeditionContext(repeatable).routes.find(r=>r.id==='pearl-trail').available,true);
  raw.inventory.pearls=2;
  assert.equal(deserializeGame(JSON.stringify(raw)).upgrades.crane,true);
});

test('accepted save coordinates survive idle helm and turning without implicit migration',()=>{
  for(const coordinate of [-1e6,-999,-150.001,-150,150,150.001,999,1e6]){
    const original=createGame();original.position={x:coordinate,z:coordinate};
    const state=deserializeGame(serializeGame(original));assert.deepEqual(state.position,original.position);
    const before=structuredClone(state);
    for(const input of [{},{x:0,z:0},{x:NaN,z:Infinity}]){
      steerGame(state,.05,input);assert.deepEqual(state,before,'idle is a strict state no-op');
    }
    steerGame(state,.05,{x:1,z:0});assert.deepEqual(state.position,original.position,'turning cannot snap position');
    state.heading=coordinate>0?Math.PI:0;
    steerGame(state,.05,{x:0,z:-1});
    assert.ok(Math.abs(state.position.z-(coordinate+(coordinate>0?-.25:.25)))<1e-9,'inward travel remains gradual');
    assert.ok(Math.abs(state.position.x-coordinate)<1e-9);
  }
  const state=createGame();state.position={x:999,z:999};
  steerGame(state,.05,{x:0,z:-1});assert.deepEqual(state.position,{x:999,z:999},'outward travel stays blocked');
  legacyDive(state);const before=structuredClone(state);steerGame(state,.05,{});assert.deepEqual(state,before);
  steerGame(state,.05,{x:-1,z:0});assert.equal(state.position.x,999-.1625);
});
