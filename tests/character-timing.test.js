import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import {
  focusedWindow,
  waitForClipEnd,
  verifyEncodedDuration,
} from "../scripts/qa/character-timing.mjs";
import { options, characterCases } from "../scripts/qa/runtime.mjs";
import { heldReversal } from "../scripts/qa/character-input.mjs";
import * as Game from "../src/game.js";
import {
  marker,
  markerCode,
  markerColors,
  decodeMarker,
  anchoredWindow,
  anchorDiagnostics,
  verifyRetainedMarkers,
  installAnchor,
  beginAnchor,
  releaseAnchor,
  endAnchor,
} from "../scripts/qa/video-anchor.mjs";

test("browser observer paints genuine work and requires acknowledged key release before rest", async () => {
  const nodes = new Map();
  function node() {
    return { children: [], style: { setProperty(k,v) { this[k] = v; } },
      setAttribute() {}, append(child) { this.children.push(child); }, remove() { nodes.delete(this.id); } };
  }
  let attempt = Object.freeze({ status: 'active', selectedId: null, actionProgress: 0 });
  let nextId = 0;
  const callbacks = new Map();
  const context = {
    window: { __tidekin: { getState: () => ({ cleanup: { attempt } }) } },
    document: { getElementById: id => nodes.get(id), createElement: node, body: { append(n) { nodes.set(n.id,n); } } },
    requestAnimationFrame: fn => { callbacks.set(++nextId,fn); return nextId; },
    cancelAnimationFrame: id => callbacks.delete(id),
    performance: { now: () => 0 }, Date,
  };
  const page = { evaluate: async (fn,arg) => runInNewContext(`(${fn.toString()})(input)`, {...context,input:arg}) };
  function frame() { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(fn => fn()); }
  function decoded() {
    const cells = nodes.get('tidekin-qa-video-anchor').children;
    const colors = cells.map(cell => cell.style.background === 'white' ? [255,255,255] : cell.style.background === 'black' ? [0,0,0] : cell.style.background.match(/\d+/g).map(Number));
    const bytes = Buffer.alloc(marker.width * marker.height * 3);
    for (let y = 0; y < marker.height; y++) for (let x = 0; x < marker.width; x++)
      colors[Math.floor(x / marker.cell)].forEach((v,c) => { bytes[(y * marker.width + x) * 3 + c] = v; });
    return decodeMarker(bytes);
  }
  await installAnchor(page);
  assert.deepEqual(decoded(),{index:0,phase:0});
  for (let i=0;i<20;i++) frame();
  assert.deepEqual(decoded(),{index:0,phase:0});
  assert.equal(context.window.__tidekinVideoAnchor.warmup().ticks,20);
  await beginAnchor(page,8,true);
  assert.deepEqual(decoded(),{index:8,phase:1});
  attempt = Object.freeze({status:'active',selectedId:'bottle',actionProgress:.2}); frame();
  assert.deepEqual(decoded(),{index:8,phase:2});
  attempt = Object.freeze({status:'active',selectedId:null,actionProgress:0}); frame();
  assert.deepEqual(decoded(),{index:8,phase:2}); // Zero progress alone is not key release.
  await releaseAnchor(page); frame();
  assert.deepEqual(decoded(),{index:8,phase:3});
  const events = await endAnchor(page);
  assert.deepEqual(Array.from(events,e=>e.phase),[1,2,3,4]);
  assert.equal(events[2].keyReleaseConfirmed,true);
  assert.deepEqual(decoded(),{index:8,phase:4});
  frame();
  assert.deepEqual(decoded(),{index:8,phase:4});
  await page.evaluate(() => window.__tidekinVideoAnchor.dispose());
  assert.equal(callbacks.size,0);
  assert.equal(nodes.size,0);
});

function pixels(index, phase, noise = 0) {
  const colors = markerColors(markerCode(index, phase));
  const bytes = Buffer.alloc(marker.width * marker.height * 3);
  for (let y = 0; y < marker.height; y++)
    for (let x = 0; x < marker.width; x++) {
      const color = colors[Math.floor(x / marker.cell)];
      for (let c = 0; c < 3; c++)
        bytes[(y * marker.width + x) * 3 + c] = color[c] ? 255 - noise : noise;
    }
  return bytes;
}

function frames(index = 0, origin = 10000) {
  return Array.from({ length: 82 }, (_, i) => ({
    index,
    phase: i < 10 ? 1 : i < 23 ? 2 : i < 75 ? 3 : 4,
    ptsMs: origin + i * 40,
  }));
}

test("2999 ms wall boundary permits a full monotonic capture, trimmed to exactly three seconds", () => {
  const window = focusedWindow(
    { startedAt: 1000, finishedAt: 3999, monotonicDurationMs: 3000 },
    1000,
    5000,
  );
  assert.equal(window.durationMs, 3000);
  assert.equal(window.wallDurationMs, 2999);
  assert.throws(() =>
    focusedWindow(
      { startedAt: 1000, finishedAt: 3999, monotonicDurationMs: 2999 },
      1000,
      5000,
    ),
  );
});

test("ceil and monotonic recheck handle fractional waits and early timer wakeups", async () => {
  let now = 2999.2;
  const waits = [];
  await waitForClipEnd(
    0,
    async (ms) => {
      waits.push(ms);
      now += waits.length === 1 ? 0.2 : ms;
    },
    () => now,
  );
  assert.deepEqual(waits, [1, 1]);
  assert(now >= 3000);
});

test("overrun, clock drift, missing timing and source bounds remain failures", () => {
  const clip = { startedAt: 1000, finishedAt: 4000, monotonicDurationMs: 3000 };
  for (const changed of [
    { ...clip, finishedAt: 5000, monotonicDurationMs: 4000 },
    { ...clip, finishedAt: 3959 },
    { ...clip, monotonicDurationMs: undefined },
  ])
    assert.throws(() => focusedWindow(changed, 0, 10000));
  assert.throws(() => focusedWindow(clip, -1, 10000));
  assert.throws(() => focusedWindow(clip, 1000, 3959));
});

test("encoded duration tolerance is exactly one 40 ms frame, not the former 250 ms", () => {
  for (const ms of [2960, 2999, 3000, 3040]) verifyEncodedDuration(ms);
  for (const ms of [2959, 3041, NaN])
    assert.throws(() => verifyEncodedDuration(ms));
});

test("character case filter accepts only the four real cases and defaults to all", () => {
  assert.equal(options("character", []).selectedCase, null);
  assert.equal(characterCases.length, 4);
  for (const name of characterCases)
    assert.equal(options("character", [`--case=${name}`]).selectedCase, name);
  for (const name of ["all", "1440x900", "1440x900-ordinary", "../bad"])
    assert.throws(() => options("character", [`--case=${name}`]));
  assert.throws(() => options("gameplay", ["--case=1440x900-ordinary-motion"]));
  assert.equal(options("character", ["--anchor-only"]).anchorOnly, true);
  assert.throws(() => options("gameplay", ["--anchor-only"]));
  assert.equal(options("character", ["--inert-only"]).inertOnly, true);
  assert.throws(() => options("gameplay", ["--inert-only"]));
  assert.throws(() => options("character", ["--inert-only", "--anchor-only"]));
});

test("fiducial decodes all clip/phase codes under modest codec color changes", () => {
  for (let index = 0; index < 16; index++)
    for (let phase = 0; phase <= 4; phase++) {
      assert.deepEqual(decodeMarker(pixels(index, phase)), { index, phase });
      assert.deepEqual(decodeMarker(pixels(index, phase, 20)), {
        index,
        phase,
      });
    }
  assert.equal(
    decodeMarker(Buffer.alloc(marker.width * marker.height * 3)),
    null,
  );
  assert.equal(decodeMarker(pixels(0, 1, 100)), null);
});

test("parity and guard detection reject malformed or ambiguous marker pixels", () => {
  const bytes = pixels(0, 1);
  for (let y = 0; y < marker.height; y++)
    for (let x = 8; x < 16; x++)
      bytes.fill(0, (y * marker.width + x) * 3, (y * marker.width + x) * 3 + 3);
  assert.equal(decodeMarker(bytes), null);
  assert.throws(() => markerCode(16, 1));
});

test("decoded source PTS anchor ignores unrelated wall-clock origin and contains genuine phases", () => {
  const source = frames();
  const anchor = anchoredWindow(source, 0, true);
  assert.equal(anchor.offsetMs, 10000);
  assert.equal(anchor.endMarkerPtsMs, 13000);
  const clip = {
    startedAt: 500000,
    finishedAt: 502999,
    monotonicDurationMs: 3000,
  };
  assert.equal(focusedWindow(clip, anchor.offsetMs, 14000).offsetMs, 10000);
  const retained = source
    .filter((f) => f.ptsMs < 13000)
    .map((f) => ({ ...f, ptsMs: f.ptsMs - 10000 }));
  assert.equal(verifyRetainedMarkers(retained, 0, true).verified, true);
});

test("absent, duplicated, short, out-of-order or shifted anchor phases cannot certify motion", () => {
  const source = frames();
  assert.throws(() =>
    anchoredWindow(
      source.filter((f) => f.phase !== 2),
      0,
      true,
    ),
  );
  assert.throws(() =>
    anchoredWindow(
      source.map((f) => ({
        ...f,
        phase: f.phase === 2 ? 3 : f.phase === 3 ? 2 : f.phase,
      })),
      0,
      true,
    ),
  );
  assert.throws(() =>
    anchoredWindow(
      source.map((f) => (f.phase === 4 ? { ...f, ptsMs: f.ptsMs + 80 } : f)),
      0,
      true,
    ),
  );
  assert.throws(() =>
    anchoredWindow(
      source.filter((f, i) => f.phase !== 2 || i < 12),
      0,
      true,
    ),
  );
  assert.throws(() =>
    anchoredWindow(
      source.filter((f, i) => i !== 5),
      0,
      true,
    ),
  );
  assert.throws(() =>
    verifyRetainedMarkers(
      source
        .filter((f) => f.phase >= 3)
        .map((f) => ({ ...f, ptsMs: f.ptsMs - 10920 })),
      0,
      true,
    ),
  );
});

test("failed span keeps exact decoded PTS diagnostics without widening the gate", () => {
  const source = frames().map(f => f.phase === 4 ? {...f, ptsMs:f.ptsMs+80} : f);
  const diagnostic = anchorDiagnostics(source, 0);
  assert.equal(diagnostic.startPtsMs,10000);
  assert.equal(diagnostic.endPtsMs,13080);
  assert.equal(diagnostic.spanMs,3080);
  assert.deepEqual(diagnostic.runs.map(r=>r.phase),[1,2,3,4]);
  assert.throws(()=>anchoredWindow(source,0,true), /3080 ms.*start=10000, end=13080/);
});

function reversalRig({ failObservation, rejectSecondDown = false } = {}) {
  const state = Game.createGame();
  state.position = { ...Game.getCleanupSite(state, 'home-reef').position };
  assert.equal(Game.act(state, 'enter-cleanup', { siteId: 'home-reef' }).ok, true);
  // Ordinary descent establishes an underwater fixture through public steering.
  for (let i = 0; i < 60; i++) {
    Game.steerGame(state, 0.05, { z: 1 });
    Game.updateGame(state, 0.05);
  }
  let time = 200;
  let earlyWake = true;
  const held = new Set();
  const timeline = [];
  function advance(ms) {
    for (let remaining = ms; remaining > 0;) {
      const step = Math.min(20, remaining);
      Game.steerGame(state, step / 1000, {
        x: Number(held.has('d')) - Number(held.has('a')),
      });
      Game.updateGame(state, step / 1000);
      remaining -= step;
    }
    time += ms;
  }
  return {
    state, held, timeline,
    controls: {
      now: () => time,
      wallNow: () => 100000 + time,
      keyboard: {
        down: async key => {
          timeline.push({ action: 'down', key, at: time });
          held.add(key);
          advance(8); // Real command latency still advances the ordinary domain.
          if (key === 'd' && rejectSecondDown) throw Error('keyboard command rejected after send');
        },
        up: async key => {
          timeline.push({ action: 'up', key, at: time });
          held.delete(key);
          advance(8);
        },
      },
      wait: async ms => {
        timeline.push({ action: 'wait', at: time });
        // A timer can wake early; the adapter must recheck monotonic time.
        advance(earlyWake ? 0.25 : ms);
        earlyWake = false;
      },
      observe: async direction => {
        assert.equal(held.has(direction === 'left' ? 'a' : 'd'), true);
        const snapshot = structuredClone(state.cleanup.attempt);
        timeline.push({ action: 'observe', direction, at: time });
        advance(100); // Screenshot/tool overhead must not release the held input.
        if (direction === failObservation) throw Error('capture observation failed');
        return snapshot;
      },
      complete: async () => {
        assert.deepEqual([...held], ['d']);
        advance(Math.max(0, 3000 - time));
        timeline.push({ action: 'end', at: time });
      },
    },
  };
}

test('held reversal produces real opposite domain movement despite timer wakeups and observation latency', async () => {
  const rig = reversalRig();
  const record = await heldReversal(rig.controls);
  const { left, right } = record.observations;
  assert(left.facing.x < 0 && right.facing.x > 0);
  assert(left.x < 0 && right.x > left.x);
  assert(left.y < 0 && right.y < 0 && right.air > 0);
  assert.equal(right.status, 'active');
  const releasedA = rig.timeline.findIndex(event => event.action === 'up' && event.key === 'a');
  assert.equal(rig.timeline[releasedA + 1].action, 'down');
  assert.equal(rig.timeline[releasedA + 1].key, 'd');
  assert(record.events[1].elapsedMs >= 1100);
  assert.equal(record.releaseToPressMs, 8);
  assert.equal(rig.timeline.find(event => event.action === 'end').at, 3000);
  assert.equal(rig.held.size, 0);
});

test('a failed reversal observation releases whichever ordinary key is held', async () => {
  for (const failObservation of ['left', 'right']) {
    const rig = reversalRig({ failObservation });
    await assert.rejects(heldReversal(rig.controls), /capture observation failed/);
    assert.equal(rig.held.size, 0);
    assert.equal(rig.timeline.some(event => event.action === 'end'), false);
  }
});

test('a rejected second key command cannot strand a key already sent to the browser', async () => {
  const rig = reversalRig({ rejectSecondDown: true });
  await assert.rejects(heldReversal(rig.controls), /keyboard command rejected after send/);
  assert.equal(rig.held.size, 0);
  assert.equal(rig.timeline.at(-1).action, 'up');
  assert.equal(rig.timeline.at(-1).key, 'd');
});
