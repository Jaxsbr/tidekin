import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersistence, SAVE_KEY, SETTINGS_KEY } from '../src/persistence.js';
import { createGame, serializeGame, deserializeGame, act, steerGame,
  updateGame, CLEANUP_SITES, SAVE_VERSION } from '../src/game.js';

function memoryStorage(entries = {}) {
  const items = new Map(Object.entries(entries));
  const writes = [];
  return {
    items, writes, failRead: false, failWrite: false,
    getItem(key) {
      if (this.failRead) throw new Error('Read blocked');
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      if (this.failWrite) throw new Error('Quota exceeded');
      writes.push({ key, value }); items.set(key, value);
    },
  };
}

function committedVoyage(persistence, options) {
  const prepared = persistence.prepareVoyage(options);
  assert.equal(prepared.ok, true);
  assert.equal(prepared.commit(), true);
  return prepared;
}

test('inspection distinguishes absence, valid data, empty/corrupt bytes, read failure, and unavailability', () => {
  const storage = memoryStorage();
  const persistence = createPersistence({ storage });
  assert.deepEqual(persistence.inspectSave(), {
    ok: true, status: 'absent', raw: null, candidate: null, requiresConfirmation: false,
  });
  const raw = serializeGame(createGame());
  storage.items.set(SAVE_KEY, raw);
  const result = persistence.inspectSave();
  assert.equal(result.status, 'valid'); assert.equal(result.requiresConfirmation, true);
  result.candidate.inventory.wood = 999;
  assert.equal(storage.items.get(SAVE_KEY), raw);
  assert.notEqual(persistence.inspectSave().candidate.inventory.wood, 999);
  for (const corrupt of ['', '{broken', 'null', '{"version":2}', '{"version":999}']) {
    storage.items.set(SAVE_KEY, corrupt);
    const inspection = persistence.inspectSave();
    assert.equal(inspection.status, 'corrupt'); assert.equal(inspection.raw, corrupt);
    assert.equal(inspection.candidate, null); assert.equal(inspection.requiresConfirmation, true);
    assert.equal(storage.items.get(SAVE_KEY), corrupt);
  }
  storage.failRead = true;
  assert.equal(persistence.inspectSave().status, 'read-failed');
  assert.equal(persistence.inspectSave().raw, undefined);
  assert.equal(persistence.inspectSave().requiresConfirmation, true);
  for (const adapter of [undefined, null, {}, () => { throw new Error('SecurityError'); }]) {
    const inspection = createPersistence({ storage: adapter }).inspectSave();
    assert.equal(inspection.status, 'unavailable'); assert.equal(inspection.requiresConfirmation, true);
  }
  assert.equal(createPersistence({ storage: { getItem: () => undefined } }).inspectSave().status, 'read-failed');
  assert.deepEqual(storage.writes, []);
});

test('new voyages require confirmation for existing or unknown saves and live voyages; cancellation writes nothing', () => {
  for (const raw of ['', '{broken', serializeGame(createGame())]) {
    const storage = memoryStorage({ [SAVE_KEY]: raw });
    const persistence = createPersistence({ storage });
    assert.equal(persistence.prepareVoyage().status, 'confirmation-required');
    assert.equal(persistence.saveGame(createGame()).status, 'confirmation-required');
    assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
    const prepared = persistence.prepareVoyage({ confirmed: true });
    assert.equal(prepared.status, 'ready');
    assert.equal(storage.items.get(SAVE_KEY), raw, 'preparation does not replace the save');
    assert.equal(prepared.commit(), true);
    assert.equal(storage.items.get(SAVE_KEY), raw, 'commit does not replace the save');
    assert.equal(persistence.saveGame(prepared.state).ok, true);
    assert.equal(persistence.inspectSave().status, 'valid');
  }
  const storage = memoryStorage();
  const persistence = createPersistence({ storage });
  assert.equal(persistence.prepareVoyage({ hasLiveVoyage: true }).status, 'confirmation-required');
  assert.equal(persistence.prepareVoyage().status, 'ready');
  storage.failRead = true;
  assert.equal(persistence.prepareVoyage().status, 'confirmation-required');
  assert.equal(persistence.prepareVoyage({ confirmed: true }).status, 'ready');
  assert.equal(persistence.saveGame(createGame()).status, 'read-failed');
  assert.deepEqual(storage.writes, []);
});

test('a throwing storage read stays distinct from corruption and recovers without overwriting existing bytes', () => {
  const valid = serializeGame(createGame());
  const invalidState = JSON.parse(valid); invalidState.inventory.wood = -1;
  for (const [raw, recoveredStatus] of [[valid, 'valid'], ['{broken', 'corrupt'], [JSON.stringify(invalidState), 'corrupt']]) {
    const storage = memoryStorage({ [SAVE_KEY]: raw });
    const originalRead = storage.getItem;
    let blocked = false;
    // "saved" in a storage error must not misclassify it as domain corruption.
    const failure = new Error('This browser cannot read the saved voyage');
    failure.name = 'SecurityError';
    storage.getItem = function (key) {
      if (blocked) throw failure;
      return originalRead.call(this, key);
    };
    const persistence = createPersistence({ storage });
    assert.equal(persistence.inspectSave().status, recoveredStatus);
    blocked = true;
    const unreadable = persistence.inspectSave();
    assert.equal(unreadable.status, 'read-failed'); assert.equal(unreadable.error, failure);
    assert.equal(unreadable.raw, undefined); assert.equal(unreadable.candidate, null);
    assert.equal(unreadable.requiresConfirmation, true);
    const continued = persistence.prepareVoyage({ continueSave: true });
    assert.equal(continued.status, 'read-failed'); assert.equal('state' in continued, false);
    assert.equal(persistence.prepareVoyage().status, 'confirmation-required');
    assert.equal(persistence.saveGame(createGame()).status, 'read-failed');
    blocked = false;
    const recovered = persistence.inspectSave();
    assert.equal(recovered.status, recoveredStatus); assert.equal(recovered.raw, raw);
    assert.equal(persistence.prepareVoyage().status, 'confirmation-required');
    assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
  }
});

test('preparation is read-only and commit/cancel controls settle once without reapplying authorization', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const aborted = persistence.prepareVoyage();
  assert.equal(persistence.saveGame(aborted.state).status, 'confirmation-required');
  assert.equal(aborted.cancel(), true); assert.equal(aborted.cancel(), true);
  assert.equal(aborted.commit(), false);
  assert.equal(persistence.saveGame(aborted.state).status, 'confirmation-required');
  assert.equal(storage.items.has(SAVE_KEY), false); assert.deepEqual(storage.writes, []);

  const prepared = persistence.prepareVoyage();
  assert.equal(prepared.commit(), true); assert.equal(prepared.commit(), true);
  assert.equal(prepared.cancel(), false);
  const first = persistence.saveGame(prepared.state);
  assert.equal(first.ok, true); assert.equal(first.recovered, true);
  prepared.state.inventory.wood = 1;
  assert.equal(prepared.commit(), true);
  assert.equal(persistence.saveGame(prepared.state).ok, true, 'repeat commit cannot rewind the expected save bytes');
  const next = committedVoyage(persistence, { confirmed: true, hasLiveVoyage: true });
  assert.equal(prepared.commit(), true);
  assert.equal(prepared.cancel(), false);
  assert.equal(persistence.saveGame(prepared.state).status, 'confirmation-required', 'an old control cannot reclaim the active session');
  assert.equal(persistence.saveGame(next.state).ok, true);
});

test('failed world initialization preserves the 42-wood save and healthy selected partial dive', () => {
  const initial = createGame(); initial.inventory.wood = 42;
  const raw = serializeGame(initial), storage = memoryStorage({ [SAVE_KEY]: raw });
  const persistence = createPersistence({ storage });
  const healthy = committedVoyage(persistence, { continueSave: true }).state;
  const site = CLEANUP_SITES[0], trash = site.trash[0];
  assert.equal(act(healthy, 'enter-cleanup', { siteId: site.id }).ok, true);
  Object.assign(healthy.cleanup.attempt, { x: trash.x, y: trash.y });
  steerGame(healthy, .05, { interact: true, targetId: trash.id });
  assert.equal(healthy.cleanup.attempt.selectedId, trash.id);
  assert.ok(healthy.cleanup.attempt.actionProgress > 0);
  const before = structuredClone(healthy);

  const replacement = persistence.prepareVoyage({ confirmed: true, hasLiveVoyage: true });
  assert.equal(replacement.ok, true); assert.equal(replacement.state.inventory.wood, 0);
  // Simulate pagehide seeing a state that startup published before first render.
  assert.equal(persistence.saveGame(replacement.state).status, 'confirmation-required');
  assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
  // Rendering failed: cancelling does not revoke the earlier healthy session.
  assert.equal(replacement.cancel(), true); assert.equal(replacement.commit(), false);
  assert.equal(persistence.saveGame(replacement.state).status, 'confirmation-required');
  assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(healthy, before);
  healthy.inventory.wood = 43;
  const saved = persistence.saveGame(healthy);
  assert.equal(saved.ok, true); assert.equal(saved.recovered, true);
  assert.equal(JSON.parse(storage.items.get(SAVE_KEY)).inventory.wood, 43);
  assert.deepEqual(healthy.cleanup.attempt, before.cleanup.attempt, 'saving the restored session leaves the live dive untouched');
});

test('cancelling replacement preserves warning recovery and healthy saves made while preparation is pending', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const { state } = committedVoyage(persistence);
  assert.equal(persistence.saveGame(state).ok, true);
  storage.failWrite = true;
  assert.equal(persistence.saveGame(state).notify, true);
  const pending = persistence.prepareVoyage({ confirmed: true, hasLiveVoyage: true });
  assert.equal(pending.ok, true);
  assert.equal(persistence.saveGame(state).notify, false, 'preparation does not reset the failure run');
  storage.failWrite = false; state.inventory.wood = 43;
  const recovered = persistence.saveGame(state);
  assert.equal(recovered.ok, true); assert.equal(recovered.recovered, true); assert.equal(recovered.announce, true);
  assert.equal(pending.cancel(), true);
  state.inventory.wood = 44;
  const next = persistence.saveGame(state);
  assert.equal(next.ok, true); assert.equal(next.recovered, false);
  assert.equal(next.announce, false, 'cancel does not restore an obsolete warning or expected bytes');
});

test('aborted initial loads preserve absent, corrupt, valid, and initially unreadable save fixtures', () => {
  for (const raw of [null, '', '{broken', serializeGame(createGame())]) {
    for (const blocked of [false, true]) {
      const storage = memoryStorage(raw === null ? {} : { [SAVE_KEY]: raw });
      storage.failRead = blocked;
      const persistence = createPersistence({ storage });
      const pending = persistence.prepareVoyage({ confirmed: true });
      assert.equal(pending.ok, true);
      assert.equal(pending.cancel(), true); assert.equal(pending.commit(), false);
      storage.failRead = false;
      assert.equal(persistence.saveGame(pending.state).status, 'confirmation-required');
      assert.equal(storage.getItem(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
    }
  }
});

test('changes before commit or between commit and first save cannot borrow replacement confirmation', () => {
  const initial = createGame(); initial.inventory.wood = 42;
  for (const raw of [null, serializeGame(initial)]) {
    for (const changeBeforeCommit of [true, false]) {
      for (const changed of [null, '{external-corruption', serializeGame(createGame())]) {
        if (raw === changed) continue;
        const storage = memoryStorage(raw === null ? {} : { [SAVE_KEY]: raw });
        const persistence = createPersistence({ storage });
        const prepared = persistence.prepareVoyage({ confirmed: true });
        function changeSave() {
          if (changed === null) storage.items.delete(SAVE_KEY);
          else storage.items.set(SAVE_KEY, changed);
        }
        if (changeBeforeCommit) changeSave();
        // Inspection is caller-owned data, not a handle to the staged authorization.
        prepared.inspection.raw = changed;
        assert.equal(prepared.commit(), true);
        if (!changeBeforeCommit) changeSave();
        assert.equal(persistence.saveGame(prepared.state).status, 'save-changed');
        assert.equal(storage.getItem(SAVE_KEY), changed); assert.deepEqual(storage.writes, []);
      }
    }
  }
});

test('continuation rereads storage, never substitutes a fresh voyage for corrupt or missing data', () => {
  const state = createGame(); act(state, 'gather', 'home-driftwood');
  const raw = serializeGame(state), storage = memoryStorage({ [SAVE_KEY]: raw });
  const persistence = createPersistence({ storage });
  const prepared = persistence.prepareVoyage({ continueSave: true });
  assert.equal(prepared.ok, true); assert.deepEqual(prepared.state, deserializeGame(raw));
  prepared.state.inventory.wood += 1;
  assert.equal(storage.items.get(SAVE_KEY), raw);
  assert.equal(prepared.commit(), true);
  assert.equal(persistence.saveGame(prepared.state).ok, true);
  for (const replacement of [null, '{broken']) {
    if (replacement === null) storage.items.delete(SAVE_KEY);
    else storage.items.set(SAVE_KEY, replacement);
    const continued = persistence.prepareVoyage({ continueSave: true, confirmed: true });
    assert.equal(continued.ok, false); assert.equal('state' in continued, false);
    assert.equal(continued.status, replacement === null ? 'absent' : 'corrupt');
  }
  storage.failRead = true;
  assert.equal(persistence.prepareVoyage({ continueSave: true }).status, 'read-failed');
});

test('save changes during world loading or between autosaves are preserved until replacement is reconfirmed', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const { state } = committedVoyage(persistence);
  const other = createGame(); other.inventory.wood = 37;
  const otherRaw = serializeGame(other);
  storage.items.set(SAVE_KEY, otherRaw);
  assert.equal(persistence.saveGame(state).status, 'save-changed');
  assert.equal(storage.items.get(SAVE_KEY), otherRaw); assert.deepEqual(storage.writes, []);
  const replacement = committedVoyage(persistence, { confirmed: true });
  assert.equal(persistence.saveGame(replacement.state).ok, true);
  storage.items.set(SAVE_KEY, '{new-corruption');
  assert.equal(persistence.saveGame(replacement.state).status, 'save-changed');
  assert.equal(storage.items.get(SAVE_KEY), '{new-corruption');
});

test('unreadable storage recovery never authorizes overwriting an undiscovered voyage', () => {
  for (const raw of [null, '{broken', serializeGame(createGame())]) {
    const storage = memoryStorage(raw === null ? {} : { [SAVE_KEY]: raw }); storage.failRead = true;
    const persistence = createPersistence({ storage });
    const { state } = committedVoyage(persistence, { confirmed: true });
    assert.equal(persistence.saveGame(state).status, 'read-failed');
    storage.failRead = false;
    const result = persistence.saveGame(state);
    if (raw === null) {
      assert.equal(result.ok, true); assert.equal(result.recovered, true);
    } else {
      assert.equal(result.status, 'confirmation-required'); assert.equal(storage.items.get(SAVE_KEY), raw);
      assert.deepEqual(storage.writes, []);
      const replacement = committedVoyage(persistence, { confirmed: true, hasLiveVoyage: true });
      assert.equal(persistence.saveGame(replacement.state).ok, true);
    }
  }
});

test('failed writes warn once per failure run; only a successful game save announces recovery', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const { state } = committedVoyage(persistence);
  const live = structuredClone(state);
  storage.failWrite = true;
  assert.equal(persistence.saveGame(state).notify, true);
  assert.equal(persistence.saveGame(state).notify, false);
  assert.equal(persistence.saveGame(state).status, 'write-failed');
  assert.equal(storage.items.has(SAVE_KEY), false); assert.deepEqual(state, live);
  storage.failWrite = false;
  assert.equal(persistence.storeSettings({ sound: false }).ok, true);
  persistence.inspectSave(); persistence.readSettings();
  const recovered = persistence.saveGame(state);
  assert.equal(recovered.recovered, true); assert.equal(recovered.announce, true);
  const quiet = persistence.saveGame(state);
  assert.equal(quiet.recovered, false); assert.equal(quiet.announce, false);
  assert.equal(persistence.saveGame(state, { announce: true }).announce, true);
  storage.failRead = true;
  assert.equal(persistence.saveGame(state).notify, true);
  assert.equal(persistence.saveGame(state).notify, false);
  storage.failRead = false;
  assert.equal(persistence.saveGame(state).recovered, true);
});

test('storage property access failures are retryable and keep the authorized save safe', () => {
  const storage = memoryStorage(); let blocked = false;
  const persistence = createPersistence({ storage: () => {
    if (blocked) throw new Error('SecurityError');
    return storage;
  } });
  const { state } = committedVoyage(persistence);
  assert.equal(persistence.saveGame(state).ok, true);
  const raw = storage.items.get(SAVE_KEY); blocked = true;
  assert.equal(persistence.saveGame(state).status, 'unavailable');
  assert.equal(storage.items.get(SAVE_KEY), raw);
  blocked = false;
  assert.equal(persistence.saveGame(state).recovered, true);
});

test('domain validation and output validation happen before writing; injected codecs cannot mutate live state', () => {
  const raw = serializeGame(createGame()), storage = memoryStorage({ [SAVE_KEY]: raw });
  const persistence = createPersistence({ storage });
  const { state } = committedVoyage(persistence, { continueSave: true });
  state.inventory.wood = -1; const before = structuredClone(state);
  assert.equal(persistence.saveGame(state).status, 'invalid-state');
  assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
  assert.deepEqual(state, before);
  for (const invalid of ['{broken', undefined]) {
    const badCodec = createPersistence({ storage, serialize: () => invalid });
    const ready = committedVoyage(badCodec, { continueSave: true });
    assert.equal(badCodec.saveGame(ready.state).status, 'invalid-output');
    assert.equal(storage.items.get(SAVE_KEY), raw); assert.deepEqual(storage.writes, []);
  }
  const mutatingCodec = createPersistence({ storage, serialize: input => {
    input.inventory.wood += 1; return serializeGame(input);
  } });
  const ready = committedVoyage(mutatingCodec, { continueSave: true });
  const original = structuredClone(ready.state);
  assert.equal(mutatingCodec.saveGame(ready.state).ok, true); assert.deepEqual(ready.state, original);
});

test('schema roundtrip keeps durable progress, omits live cleanup/helm, and preserves the live voyage', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const { state } = committedVoyage(persistence);
  state.inventory = { wood: 4, scrap: 1, pearls: 0 };
  state.position = { x: 4, z: 1 };
  assert.equal(act(state, 'gather', 'home-driftwood').ok, true);
  assert.equal(act(state, 'claim', 'first-salvage').ok, true);
  assert.equal(act(state, 'build', 'waterwheel').ok, true);
  assert.equal(act(state, 'start-expedition', 'current-run').ok, true);
  assert.equal(act(state, 'enter-cleanup', { siteId: CLEANUP_SITES[0].id }).ok, true);
  steerGame(state, .05, { x: 1, z: 1 }); updateGame(state, .05);
  state.helm = true;
  const before = structuredClone(state);
  const result = persistence.saveGame(state);
  assert.equal(result.ok, true); assert.deepEqual(state, before);
  const raw = JSON.parse(storage.items.get(SAVE_KEY));
  assert.equal(raw.version, SAVE_VERSION); assert.equal(raw.version, 2);
  assert.equal('helm' in raw, false); assert.equal('attempt' in raw.cleanup, false);
  assert.deepEqual(raw.cleanup, { completed: [], revision: 3 });
  for (const field of ['inventory', 'upgrades', 'quest', 'stats', 'expeditions', 'collected', 'position', 'time', 'guidance']) {
    assert.deepEqual(result.candidate[field], state[field], field);
  }
  const continued = committedVoyage(persistence, { continueSave: true });
  assert.deepEqual(continued.state, result.candidate); assert.equal(continued.state.cleanup.attempt, null);
  assert.equal(state.cleanup.attempt.status, 'active');
  assert.equal(persistence.saveGame(continued.state).ok, true);
});

test('legacy save inspection migrates only the candidate; continuing persists the current schema', () => {
  const legacy = JSON.stringify({ position: { x: 0, z: 0 }, inventory: { wood: 4 } });
  const storage = memoryStorage({ [SAVE_KEY]: legacy }), persistence = createPersistence({ storage });
  assert.equal(persistence.inspectSave().candidate.version, SAVE_VERSION);
  assert.equal(storage.items.get(SAVE_KEY), legacy); assert.deepEqual(storage.writes, []);
  const { state } = committedVoyage(persistence, { continueSave: true });
  assert.equal(persistence.saveGame(state).ok, true);
  assert.equal(JSON.parse(storage.items.get(SAVE_KEY)).version, 2);
});

test('settings use caller motion preference, tolerate invalid fields, strip extras, and return detached defaults', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage, reducedMotion: true });
  const defaults = { quality: 'high', sound: true, reducedMotion: true, largeText: false };
  const empty = persistence.readSettings(); assert.equal(empty.status, 'absent');
  assert.deepEqual(empty.settings, defaults); empty.settings.sound = false;
  assert.deepEqual(persistence.readSettings().settings, defaults);
  storage.items.set(SETTINGS_KEY, JSON.stringify({ quality: 'ultra', sound: 0, reducedMotion: false, largeText: true, extra: 7 }));
  assert.deepEqual(persistence.readSettings().settings, { ...defaults, reducedMotion: false, largeText: true });
  const input = { quality: 'low', sound: false, reducedMotion: false, largeText: true, extra: 7 };
  const before = structuredClone(input), stored = persistence.storeSettings(input);
  assert.equal(stored.ok, true); assert.deepEqual(input, before);
  assert.deepEqual(JSON.parse(storage.items.get(SETTINGS_KEY)), stored.settings);
  assert.equal('extra' in stored.settings, false);
  assert.deepEqual(persistence.readSettings().settings, stored.settings);
  assert.equal(storage.items.has(SAVE_KEY), false);
});

test('corrupt or inaccessible settings fall back without modifying bytes; write failure still returns applied values', () => {
  const storage = memoryStorage(), persistence = createPersistence({ storage });
  const defaults = persistence.readSettings().settings;
  for (const raw of ['', '{broken', 'null', '[]', 'true']) {
    storage.items.set(SETTINGS_KEY, raw);
    assert.equal(persistence.readSettings().status, 'corrupt');
    assert.deepEqual(persistence.readSettings().settings, defaults);
    assert.equal(storage.items.get(SETTINGS_KEY), raw);
  }
  storage.failRead = true;
  assert.equal(persistence.readSettings().status, 'read-failed');
  assert.deepEqual(persistence.readSettings().settings, defaults);
  const unavailable = createPersistence({ storage: () => { throw new Error('SecurityError'); } });
  assert.equal(unavailable.readSettings().status, 'unavailable');
  assert.equal(unavailable.storeSettings({ sound: false }).status, 'unavailable');
  storage.failRead = false; storage.failWrite = true;
  const result = persistence.storeSettings({ quality: 'medium', sound: false });
  assert.equal(result.status, 'write-failed'); assert.equal(result.settings.sound, false);
  assert.equal(storage.items.get(SETTINGS_KEY), 'true'); assert.deepEqual(storage.writes, []);
});
