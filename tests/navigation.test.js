import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, inShallows, RIGS, SHOALS } from '../src/game.js';
import { planRoutes } from '../src/navigation.js';

function worldPoint(shoal, x, z) {
  return {
    x: shoal.x + x * Math.cos(shoal.angle) + z * Math.sin(shoal.angle),
    z: shoal.z - x * Math.sin(shoal.angle) + z * Math.cos(shoal.angle),
  };
}

function crossing(shoal = SHOALS[0]) {
  const state = createGame();
  state.position = worldPoint(shoal, 0, -30);
  return { state, target: worldPoint(shoal, 0, 30) };
}

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} should be close to ${expected}`);
}

test('direct crossing at (18,-4) samples the domain ellipse and charges actual rig speed', () => {
  const shoal = SHOALS[0];
  for (const [rig, { speed }] of Object.entries(RIGS)) {
    const state = createGame();
    state.rig = rig;
    state.speed = speed;
    state.position = worldPoint(shoal, -12, 0);
    const target = worldPoint(shoal, 12, 0);
    const { direct } = planRoutes(state, target);
    assert.deepEqual(direct.points, [target]);
    close(direct.meters, 24);
    close(direct.shallowMeters, 7, 0.25);
    close(direct.seconds, (direct.meters - direct.shallowMeters) / speed
      + direct.shallowMeters / (speed * 0.32));
  }
});

test('high water opens the direct route and offers no bypass', () => {
  const { state, target } = crossing();
  state.time = 90;
  const { direct, bypass } = planRoutes(state, target);
  close(direct.meters, 60);
  close(direct.seconds, 12);
  assert.equal(direct.shallowMeters, 0);
  assert.equal(bypass, null);
});

test('a low-water bypass reduces shallow travel, costs less, and bounds its detour', () => {
  const { state, target } = crossing();
  const { direct, bypass } = planRoutes(state, target);
  assert.ok(bypass);
  assert.equal(bypass.points.length, 2);
  assert.deepEqual(bypass.points[1], target);
  assert.equal(inShallows({ ...state, position: bypass.points[0] }), false);
  assert.ok(direct.shallowMeters - bypass.shallowMeters >= Math.max(1, direct.shallowMeters * 0.1));
  assert.ok(bypass.seconds < direct.seconds);
  assert.ok(bypass.meters <= direct.meters * 2.5 + 10);
});

test('a meaningfully less shallow bypass remains a choice even when it takes longer', () => {
  const { direct, bypass } = planRoutes(createGame(), { x: 34, z: -12 });
  assert.ok(bypass);
  assert.ok(bypass.seconds > direct.seconds);
  assert.ok(direct.shallowMeters - bypass.shallowMeters >= 1);
  assert.ok(bypass.meters <= direct.meters * 2.5 + 10);
});

test('a target inside a shoal retains its unavoidable final approach', () => {
  const { state } = crossing();
  const target = { x: 18, z: -4 };
  const { direct, bypass } = planRoutes(state, target);
  assert.ok(direct.shallowMeters > 19);
  assert.ok(bypass);
  assert.deepEqual(bypass.points[1], target);
  assert.ok(bypass.shallowMeters > 0);
  assert.ok(bypass.shallowMeters < direct.shallowMeters);
  assert.ok(bypass.meters <= direct.meters * 2.5 + 10);
});

test('the second shoal uses the same rotated domain geometry', () => {
  const shoal = SHOALS[1];
  const state = createGame();
  state.position = worldPoint(shoal, 0, -10);
  const { direct } = planRoutes(state, worldPoint(shoal, 0, 10));
  close(direct.meters, 20);
  close(direct.shallowMeters, 5.6, 0.25);
});

test('identical calls are deterministic and inputs and returned points are independent', () => {
  const { state, target } = crossing();
  const before = structuredClone({ state, target });
  Object.freeze(state.position);
  Object.freeze(state);
  Object.freeze(target);
  const first = planRoutes(state, target);
  assert.deepEqual(planRoutes(state, target), first);
  assert.deepEqual({ state, target }, before);
  first.direct.points[0].x = 999;
  first.bypass.points[1].z = 999;
  assert.deepEqual({ state, target }, before);
  assert.deepEqual(planRoutes(state, target), planRoutes(state, target));
});

test('diving is direct-only at fixed swim speed without a shallow penalty for every rig', () => {
  for (const [rig, { speed }] of Object.entries(RIGS)) {
    const { state, target } = crossing();
    Object.assign(state, { rig, speed, diving: true });
    const { direct, bypass } = planRoutes(state, target);
    close(direct.seconds, direct.meters / 3.25);
    assert.ok(direct.shallowMeters > 39);
    assert.equal(bypass, null);
  }
});

test('zero-distance and clear-water routes have finite values and no bypass', () => {
  const state = createGame();
  for (const position of [{ x: 0, z: 0 }, { x: 18, z: -4 }]) {
    state.position = position;
    assert.deepEqual(planRoutes(state, position), {
      direct: { points: [{ ...position }], seconds: 0, shallowMeters: 0, meters: 0 },
      bypass: null,
    });
  }
  state.position = { x: 0, z: 0 };
  const { direct, bypass } = planRoutes(state, { x: -5, z: 5 });
  close(direct.seconds, Math.sqrt(50) / state.speed);
  assert.equal(direct.shallowMeters, 0);
  assert.equal(bypass, null);
});

test('estimates hold current tide static even when the route outlasts its low-water window', () => {
  const { state, target } = crossing();
  state.time = 35;
  state.speed = 0.5;
  const { direct } = planRoutes(state, target);
  assert.ok(direct.seconds > 180);
  assert.ok(direct.shallowMeters > 39);
  close(direct.seconds, (direct.meters - direct.shallowMeters) / 0.5
    + direct.shallowMeters / (0.5 * 0.32));
});

test('an omitted speed uses the selected rig and malformed inputs fail without mutation', () => {
  const state = createGame();
  state.rig = 'skimmer';
  delete state.speed;
  close(planRoutes(state, { x: 0, z: 7 }).direct.seconds, 1);
  for (const invalid of [
    { ...state, time: NaN },
    { ...state, speed: 0 },
    { ...state, speed: Infinity },
    { ...state, position: { x: NaN, z: 0 } },
  ]) {
    const before = structuredClone(invalid);
    assert.throws(() => planRoutes(invalid, { x: 0, z: 7 }), RangeError);
    assert.deepEqual(invalid, before);
  }
  assert.throws(() => planRoutes(state, { x: 0, z: Infinity }), RangeError);
});
