import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/game.js';
import { enter } from '../scripts/qa/input.mjs';

// These control-routing checks use the real domain. Browser acceptance owns
// actual steering, visibility and raycast coverage; this fixture does not.
for (const id of ['salvage:home-pearls', 'home-reef', 'sheltered-cove']) {
  test(`QA entry routes ${id} through its ordinary control`, async () => {
    const state = Game.createGame();
    const site = Game.getCleanupSite(state, id);
    const buoy = Game.CLEANUP_SITES.some(candidate => candidate.id === id);
    state.position = buoy
      ? { x: site.position.x + (id === 'home-reef' ? 6 : -6), z: site.position.z }
      : { ...site.position };
    const inputs = [];
    const point = { x: 111, y: 222, visible: true };
    const previousWindow = globalThis.window;
    globalThis.window = {
      __tidekin: {
        getState: () => state,
        getMetrics: () => ({
          interactions: buoy ? { [`cleanup:${id}`]: point } : {},
        }),
      },
    };
    const h = {
      r: { inputs: [] },
      state: async () => state,
      key: async key => {
        inputs.push(key);
        assert.equal(key, 'Space');
        assert.equal(Game.act(state, 'dive').ok, true);
      },
      p: {
        locator: () => ({ focus: async () => {} }),
        evaluate: async fn => fn(),
        mouse: {
          click: async (x, y) => {
            assert(buoy);
            assert.equal(x, point.x);
            assert.equal(y, point.y);
            inputs.push('pointer');
            assert.equal(Game.act(state, 'enter-cleanup', { siteId: id }).ok, true);
          },
        },
        waitForFunction: async (fn, arg) => assert(fn(arg)),
      },
    };
    try {
      await enter(h, id, Game);
      assert.deepEqual(inputs, [buoy ? 'pointer' : 'Space']);
      assert.equal(state.cleanup.attempt.siteId, id);
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
}
