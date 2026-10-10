import { createGame, serializeGame, deserializeGame } from './game.js';

export const SAVE_KEY = 'tidekin.save.v2';
export const SETTINGS_KEY = 'tidekin.settings.v1';

/** Local persistence with no DOM, timers, or implicit browser globals.
 * storage is a Storage adapter or a getter (use () => window.localStorage to
 * catch browsers that throw on property access). Codecs remain domain-owned.
 *
 * inspectSave is read-only, including corrupt bytes. prepareVoyage rechecks
 * storage and returns a detached state plus commit()/cancel() controls, without
 * changing the current session's authorization or writing any bytes. Commit
 * after successful world initialization; cancel on failure. Save only the state
 * returned by a committed preparation. An uncommitted replacement cannot borrow
 * the old session's authorization. Loading/UI guards and the autosave schedule
 * stay with the caller. The caller permits one loading transaction at a time.
 *
 * Controls return booleans: repeating the chosen action returns true without
 * reapplying it; the opposite action returns false. Cancel cannot undo a commit,
 * and commit cannot revive a cancellation. Commit captures the bytes observed
 * at preparation, so changes during loading remain guarded at the first save.
 *
 * Saves compare the current bytes with the authorized bytes before writing:
 * another tab's changes, corrupt saves, and unreadable storage are never
 * silently overwritten. A confirmed session with unreadable storage can play,
 * but if recovery reveals an existing save, replacement needs confirmation
 * again. There is no atomic cross-tab compare-and-set in Web Storage.
 *
 * Failure results include notify:true only on the first failed save in a run;
 * a successful save resets that run and announces recovery once. Settings and
 * inspection outcomes do not clear a save warning. Results contain no UI text.
 */
export function createPersistence({ storage, reducedMotion = false,
  serialize = serializeGame, deserialize = deserializeGame } = {}) {
  const defaults = { quality: 'high', sound: true,
    reducedMotion: Boolean(reducedMotion), largeText: false };
  let authorizedState;
  let expectedRaw;
  let saveWarning = false;

  function normalizeSettings(value) {
    const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    return {
      quality: ['low', 'medium', 'high'].includes(saved.quality) ? saved.quality : defaults.quality,
      sound: typeof saved.sound === 'boolean' ? saved.sound : defaults.sound,
      reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : defaults.reducedMotion,
      largeText: typeof saved.largeText === 'boolean' ? saved.largeText : defaults.largeText,
    };
  }

  function resolveStorage() {
    try {
      const adapter = typeof storage === 'function' ? storage() : storage;
      if (!adapter || typeof adapter.getItem !== 'function') {
        return { ok: false, status: 'unavailable' };
      }
      return { ok: true, adapter };
    } catch (error) { return { ok: false, status: 'unavailable', error }; }
  }

  function read(key) {
    const access = resolveStorage();
    if (!access.ok) return access;
    try {
      const raw = access.adapter.getItem(key);
      // Only null establishes absence; even an empty string is stored data.
      if (raw !== null && typeof raw !== 'string') throw new TypeError('Storage must return a string or null');
      return { ok: true, raw, adapter: access.adapter };
    } catch (error) { return { ok: false, status: 'read-failed', error }; }
  }

  function inspectSave() {
    const result = read(SAVE_KEY);
    if (!result.ok) return { ...result, raw: undefined, candidate: null, requiresConfirmation: true };
    const { raw } = result;
    if (raw === null) return { ok: true, status: 'absent', raw, candidate: null, requiresConfirmation: false };
    try {
      const candidate = deserialize(raw);
      return { ok: true, status: 'valid', raw, candidate, requiresConfirmation: true };
    } catch (error) {
      return { ok: false, status: 'corrupt', raw, candidate: null, requiresConfirmation: true, error };
    }
  }

  function prepareVoyage({ continueSave = false, confirmed = false, hasLiveVoyage = false } = {}) {
    const inspection = inspectSave();
    if (continueSave && inspection.status !== 'valid') return { ok: false, status: inspection.status, inspection };
    if (!continueSave && (hasLiveVoyage || inspection.requiresConfirmation) && !confirmed) {
      return { ok: false, status: 'confirmation-required', inspection };
    }
    const state = continueSave ? inspection.candidate : createGame();
    const preparedRaw = inspection.raw;
    let outcome = 'pending';
    function commit() {
      if (outcome !== 'pending') return outcome === 'committed';
      authorizedState = state;
      expectedRaw = preparedRaw;
      outcome = 'committed';
      return true;
    }
    function cancel() {
      if (outcome !== 'pending') return outcome === 'cancelled';
      outcome = 'cancelled';
      return true;
    }
    return { ok: true, status: 'ready', state, inspection, commit, cancel };
  }

  function failedSave(status, detail = {}) {
    const notify = !saveWarning;
    saveWarning = true;
    return { ok: false, status, ...detail, notify };
  }

  function saveGame(state, { announce = false } = {}) {
    const current = read(SAVE_KEY);
    if (!current.ok) return failedSave(current.status, { error: current.error });
    if (!authorizedState || state !== authorizedState || (expectedRaw === undefined && current.raw !== null)) {
      return failedSave('confirmation-required');
    }
    if (expectedRaw !== undefined && current.raw !== expectedRaw) return failedSave('save-changed');

    let text;
    let candidate;
    try {
      // Protect live state even when an injected codec normalizes its input.
      text = serialize(structuredClone(state));
    } catch (error) { return failedSave('invalid-state', { error }); }
    try {
      if (typeof text !== 'string') throw new TypeError('Serializer must return a string');
      candidate = deserialize(text);
    } catch (error) { return failedSave('invalid-output', { error }); }
    try {
      current.adapter.setItem(SAVE_KEY, text);
    } catch (error) { return failedSave('write-failed', { error }); }

    expectedRaw = text;
    const recovered = saveWarning;
    saveWarning = false;
    return { ok: true, status: 'saved', candidate, recovered, announce: Boolean(announce || recovered) };
  }

  function readSettings() {
    const result = read(SETTINGS_KEY);
    if (!result.ok) return { ...result, settings: normalizeSettings(null) };
    if (result.raw === null) return { ok: true, status: 'absent', settings: normalizeSettings(null) };
    try {
      const saved = JSON.parse(result.raw);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new TypeError('Settings must be an object');
      return { ok: true, status: 'valid', settings: normalizeSettings(saved) };
    } catch (error) { return { ok: false, status: 'corrupt', settings: normalizeSettings(null), error }; }
  }

  function storeSettings(value) {
    const settings = normalizeSettings(value);
    const access = resolveStorage();
    if (!access.ok) return { ...access, settings };
    try {
      access.adapter.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return { ok: true, status: 'saved', settings };
    } catch (error) { return { ok: false, status: 'write-failed', settings, error }; }
  }

  return { inspectSave, prepareVoyage, saveGame, readSettings, storeSettings };
}
